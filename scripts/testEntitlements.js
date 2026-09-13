import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';
import { checkEntitlement, consumeQuota } from '../services/entitlementService.js';

const BASE = 'http://localhost:3001';
const FREE_EMAIL = 'nexo96002@gmail.com';
const ADMIN_EMAIL = 'mohammedayyash84@gmail.com'; // له اشتراك Pro مفعّل من اختبارات سابقة على الأغلب

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { console.log(`✅ ${label}`); pass++; }
  else { console.log(`❌ ${label}`); fail++; }
}

async function getUserId(email) {
  const { data } = await supabase.from('users').select('id').eq('email', email).single();
  return data.id;
}

// ينظّف أي اشتراك/عداد استخدام سابق للمستخدم التجريبي حتى تكون النتائج متوقعة
async function resetUserState(userId) {
  await supabase.from('subscriptions').delete().eq('user_id', userId);
  await supabase.from('usage_counters').delete().eq('user_id', userId);
}

async function run() {
  const freeUserId = await getUserId(FREE_EMAIL);
  await resetUserState(freeUserId);
  const freeToken = jwt.sign({ userId: freeUserId }, config.jwtSecret);

  console.log('=== اختبار 1: checkEntitlement مباشرة - مستخدم بدون اشتراك يُعامل كـFree تلقائيًا ===');
  let ent = await checkEntitlement(freeUserId, 'chat');
  check('الخطة المُستنتجة free', ent.planId === 'free');
  check('chat مفعّلة لـFree', ent.allowed === true);

  console.log('\n=== اختبار 2: model_selection غير متاحة لـFree ===');
  ent = await checkEntitlement(freeUserId, 'model_selection');
  check('model_selection مرفوضة لـFree (not_enabled)', ent.allowed === false && ent.reason === 'not_enabled');

  console.log('\n=== اختبار 3: image_generation غير متاحة لـFree ===');
  ent = await checkEntitlement(freeUserId, 'image_generation', 'gemini_image');
  check('image_generation مرفوضة لـFree', ent.allowed === false);

  console.log('\n=== اختبار 4: API الحقيقي - محاولة اختيار موديل advanced وهو Free ===');
  let res = await fetch(`${BASE}/api/settings/ai`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ model_tier: 'advanced' }),
  });
  check('رفض اختيار موديل Pro لمستخدم Free (403)', res.status === 403);

  console.log('\n=== اختبار 5: API الحقيقي - اختيار الموديل الافتراضي (fast) مسموح حتى لـFree ===');
  res = await fetch(`${BASE}/api/settings/ai`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ model_tier: 'fast' }),
  });
  check('اختيار الموديل الافتراضي مسموح (200)', res.status === 200);

  console.log('\n=== اختبار 6: API الحقيقي - توليد صورة ممنوع لـFree ===');
  res = await fetch(`${BASE}/api/generate-image`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ prompt: 'test image' }),
  });
  check('رفض توليد صورة لمستخدم Free (403)', res.status === 403);

  console.log('\n=== اختبار 7: consumeQuota الذرّي - استهلاك حصة chat لحد النفاد (limit=30 لـFree) ===');
  for (let i = 0; i < 30; i++) {
    await consumeQuota(freeUserId, 'chat');
  }
  const afterLimit = await consumeQuota(freeUserId, 'chat');
  check('رفض تجاوز الحصة اليومية بعد 30 استهلاك (allowed=false)', afterLimit.allowed === false);
  check('remaining = 0', afterLimit.remaining === 0);

  console.log('\n=== اختبار 8: API الحقيقي - /chat يرفض بعد نفاد الحصة (429) ===');
  res = await fetch(`${BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'مرحبا' }], lang: 'ar' }),
  });
  check('رفض /chat بعد نفاد الحصة (429)', res.status === 429);

  console.log('\n=== اختبار 9: طلبات متزامنة (Race Condition) - لا يمكن تجاوز الحصة بطلبات متوازية ===');
  await resetUserState(freeUserId);
  // نستهلك 29 من أصل 30 مقدمًا، ثم نرسل 5 طلبات متزامنة لآخر وحدة متاحة
  for (let i = 0; i < 29; i++) await consumeQuota(freeUserId, 'chat');
  const concurrentResults = await Promise.all(
    Array.from({ length: 5 }, () => consumeQuota(freeUserId, 'chat'))
  );
  const successCount = concurrentResults.filter((r) => r.allowed).length;
  check('طلب واحد فقط نجح من أصل 5 متزامنة (لا تجاوز للحصة)', successCount === 1);

  console.log('\n=== اختبار 10: GET /api/v1/entitlements/me يرجع بيانات صحيحة ===');
  res = await fetch(`${BASE}/api/v1/entitlements/me`, { headers: { Authorization: `Bearer ${freeToken}` } });
  const body = await res.json();
  check('نجح الطلب (200)', res.status === 200 && body.success === true);
  check('الخطة free', body.data.planId === 'free');
  check('يحتوي على قائمة features', Array.isArray(body.data.features) && body.data.features.length > 0);

  console.log('\n=== اختبار 11: مستخدم Pro (اشتراك فعّال يدويًا للاختبار) - يقدر يختار موديل ويولّد صور ===');
  const proUserId = await getUserId(ADMIN_EMAIL);
  await resetUserState(proUserId);
  await supabase.from('subscriptions').insert({
    user_id: proUserId, plan_id: 'pro_monthly', status: 'active',
    price_amount_minor: 1000, currency: 'ILS', billing_interval: 'monthly',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const proToken = jwt.sign({ userId: proUserId }, config.jwtSecret);

  ent = await checkEntitlement(proUserId, 'model_selection');
  check('model_selection مفعّلة لـPro', ent.allowed === true);

  res = await fetch(`${BASE}/api/settings/ai`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${proToken}` },
    body: JSON.stringify({ model_tier: 'advanced' }),
  });
  check('Pro يقدر يختار موديل advanced (200)', res.status === 200);

  ent = await checkEntitlement(proUserId, 'image_generation', 'gemini_image');
  check('image_generation مفعّلة لـPro (limit=15 شهريًا)', ent.allowed === true && ent.limit === 15);

  console.log('\n=== اختبار 12: موديل غير مسموح به إطلاقًا (حتى لو الميزة مفعّلة) ===');
  ent = await checkEntitlement(proUserId, 'chat', 'claude'); // claude غير مربوط بـplan_feature_models لأي خطة
  check('رفض موديل غير مربوط بالخطة (model_not_allowed)', ent.allowed === false && ent.reason === 'model_not_allowed');

  console.log('\n=== تنظيف بيانات الاختبار ===');
  await resetUserState(freeUserId);
  await resetUserState(proUserId);

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });