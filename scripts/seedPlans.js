// سكريبت Seed لجدول plans - يضيف خطة pro_monthly بسعر تجريبي (TEST) فقط
// آمن للتشغيل أكتر من مرة (idempotent) - ما بيكرر الخطة لو كانت موجودة أصلاً
import { supabase } from '../services/supabaseClient.js';

const TEST_PLAN = {
  id: 'pro_monthly',
  name: 'Pro (شهري) — TEST',
  price_amount_minor: 1000, // = 10.00 ILS — سعر تجريبي مؤقت للاختبار فقط، ليس السعر التجاري النهائي
  currency: 'ILS',
  billing_interval: 'monthly',
  is_active: true,
};

async function seedPlans() {
  console.log('🌱 بدء Seed لجدول plans...');
  console.log('⚠️  ملاحظة: السعر (10 ILS) هو سعر TEST مؤقت للاختبار، وليس السعر التجاري النهائي.');

  // upsert: لو الـid موجود أصلاً، يحدّث بدل ما ينشئ نسخة مكررة (idempotent)
  const { data, error } = await supabase
    .from('plans')
    .upsert(TEST_PLAN, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('❌ فشل Seed:', error);
    process.exit(1);
  }

  console.log('✅ تم بنجاح. بيانات الخطة الموجودة الآن بقاعدة البيانات:');
  console.log(data);
  process.exit(0);
}

seedPlans();