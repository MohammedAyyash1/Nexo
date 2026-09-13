import { supabase } from './supabaseClient.js';

// نقطة القرار المركزية الوحيدة لأي فحص صلاحية بالمشروع.
// لا يوجد أي مكان آخر بالكود يجب أن يقرر "مين مسموحله يعمل شو" غير هذه الدالة.
export async function checkEntitlement(userId, featureKey, modelKey = null) {
  const { data, error } = await supabase.rpc('fn_check_entitlement', {
    p_user_id: userId,
    p_feature_key: featureKey,
    p_model_key: modelKey,
  });
  if (error) {
    console.error('checkEntitlement error:', error);
    return { allowed: false, enabled: false, reason: 'internal_error' };
  }
  return data;
}

// استهلاك ذرّي فعلي للحصة - يُستدعى فقط قبل تنفيذ عملية مكلفة فعليًا (بعد التأكد أنها ستُنفَّذ)
export async function consumeQuota(userId, featureKey, modelKey = null, amount = 1) {
  const { data, error } = await supabase.rpc('fn_consume_quota', {
    p_user_id: userId,
    p_feature_key: featureKey,
    p_model_key: modelKey,
    p_amount: amount,
  });
  if (error) {
    console.error('consumeQuota error:', error);
    return { allowed: false, enabled: false, reason: 'internal_error' };
  }
  return data;
}

// يرجع كل الـentitlements الخاصة بخطة المستخدم الحالية - يُستخدم لعرض الحدود بالـFrontend
export async function getMyEntitlements(userId) {
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('plan_id, status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const isActive = subData && (!subData.current_period_end || new Date(subData.current_period_end) > new Date());
  const planId = isActive ? subData.plan_id : 'free';

  const { data: features, error } = await supabase
    .from('plan_features')
    .select('feature_key, is_enabled, limit_value, limit_period, metadata, features(name, unit, is_active), plan_feature_models(model_key, is_default, is_user_selectable, limit_value)')
    .eq('plan_id', planId);

  if (error) {
    console.error('getMyEntitlements error:', error);
    return { planId, features: [] };
  }

  // نغني كل ميزة مُفعّلة ومحدودة رقميًا باستهلاكها الفعلي - من نفس مصدر الحقيقة (fn_check_entitlement)
  const enriched = await Promise.all(
    features.map(async (f) => {
      if (!f.is_enabled || f.limit_value === null) {
        return { ...f, used: null, remaining: null, periodEnd: null };
      }
      const usage = await checkEntitlement(userId, f.feature_key);
      return { ...f, used: usage.used ?? 0, remaining: usage.remaining ?? f.limit_value, periodEnd: usage.periodEnd ?? null };
    })
  );

  return { planId, features: enriched };
}

// نسخة بدون مستخدم محدد - تستخدم لعرض "ماذا ستحصل عليه عند الترقية" لأي خطة (بدون بيانات استهلاك شخصية)
export async function getPlanFeatures(planId) {
  const { data: features, error } = await supabase
    .from('plan_features')
    .select('feature_key, is_enabled, limit_value, limit_period, metadata, features(name, unit, is_active)')
    .eq('plan_id', planId);

  if (error) {
    console.error('getPlanFeatures error:', error);
    return [];
  }
  return features;
}export async function getUserPlanId(userId) {
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('plan_id, status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const isActive = subData && (!subData.current_period_end || new Date(subData.current_period_end) > new Date());
  return isActive ? subData.plan_id : 'free';
}

// فحص حد "عدد موارد حي" (مو حصة استهلاكية زمنية) - يقارن العدد الفعلي الحالي بحد الخطة
// بدل الاعتماد على usage_counters، لأن حذف مساعد يجب أن يعيد فتح المجال (عكس حصص الرسائل اليومية)
export async function checkResourceLimit(userId, featureKey, currentCount) {
  const planId = await getUserPlanId(userId);
  const { data, error } = await supabase
    .from('plan_features')
    .select('is_enabled, limit_value')
    .eq('plan_id', planId)
    .eq('feature_key', featureKey)
    .maybeSingle();

  if (error || !data || !data.is_enabled) return { allowed: false, planId, limit: 0 };
  if (data.limit_value === null) return { allowed: true, planId, limit: null };
  return { allowed: currentCount < data.limit_value, planId, limit: data.limit_value };
}// فحص حصة استخدام أداة معيّنة - يعتمد على نفس بنية الـEntitlements الموجودة.
// بمجرد ما تحط limit_value فعلي بجدول plan_features لأي tool_<name>، هذا الفحص
// يبدأ يطبّقه فورًا بدون أي تعديل كود إضافي.
export async function checkToolEntitlement(userId, toolName) {
  try {
    return await checkEntitlement(userId, `tool_${toolName}`);
  } catch (err) {
    console.error(`checkToolEntitlement error for ${toolName}, defaulting to allow:`, err.message);
    return { allowed: true };
  }
}