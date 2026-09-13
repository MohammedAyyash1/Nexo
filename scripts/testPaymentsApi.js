// اختبار API - يتطلب تشغيل السيرفر (node server.js) بتيرمينال منفصل قبل تشغيل هذا السكريبت
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';

const BASE = 'http://localhost:3001/api/v1/payments';
const ADMIN_EMAIL = 'mohammedayyash84@gmail.com';
const REGULAR_EMAIL = 'nexo96002@gmail.com';

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { console.log(`✅ ${label}`); pass++; }
  else { console.log(`❌ ${label}`); fail++; }
}

async function getUserId(email) {
  const { data, error } = await supabase.from('users').select('id').eq('email', email).single();
  if (error || !data) throw new Error(`لم يتم إيجاد مستخدم بالبريد ${email}`);
  return data.id;
}

function tokenFor(userId) {
  return jwt.sign({ userId }, config.jwtSecret);
}

async function run() {
  const adminId = await getUserId(ADMIN_EMAIL);
  const regularId = await getUserId(REGULAR_EMAIL);
  const adminToken = tokenFor(adminId);
  const regularToken = tokenFor(regularId);

  console.log('=== اختبار 1: بدون تسجيل دخول ===');
  let res = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId: 'pro_monthly', paymentMethod: 'bank_transfer' }),
  });
  check('بدون token -> 401', res.status === 401);

  console.log('\n=== اختبار 2: مستخدم عادي ينشئ طلب، مع محاولة تمرير سعر/عملة مختلفة ===');
  res = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regularToken}` },
    body: JSON.stringify({ planId: 'pro_monthly', paymentMethod: 'bank_transfer', amountMinor: 1, currency: 'USD' }),
  });
  let body = await res.json();
  check('إنشاء الطلب نجح (201)', res.status === 201 && body.success === true);
  check('السعر مأخوذ من plans (1000) رغم محاولة إرسال 1', body.data.amount_minor === 1000);
  check('العملة مأخوذة من plans (ILS) رغم محاولة إرسال USD', body.data.currency === 'ILS');
  const requestId = body.data.id;

  console.log('\n=== اختبار 3: مستخدم آخر (أدمن هنا) يحاول رؤية طلب لا يملكه ===');
  res = await fetch(`${BASE}/requests/${requestId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  check('غير صاحب الطلب -> 404', res.status === 404);

  console.log('\n=== اختبار 4: صاحب الطلب يرى طلبه ===');
  res = await fetch(`${BASE}/requests/${requestId}`, { headers: { Authorization: `Bearer ${regularToken}` } });
  check('صاحب الطلب يرى طلبه (200)', res.status === 200);

  console.log('\n=== اختبار 5: مستخدم عادي يحاول review ===');
  res = await fetch(`${BASE}/requests/${requestId}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regularToken}` },
    body: JSON.stringify({ decision: 'approve' }),
  });
  check('مستخدم عادي ممنوع من review (403)', res.status === 403);

  console.log('\n=== اختبار 6: أدمن يحاول review قبل submit (انتقال غير مسموح) ===');
  res = await fetch(`${BASE}/requests/${requestId}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ decision: 'approve' }),
  });
  check('رفض review قبل submit (409)', res.status === 409);

  console.log('\n=== اختبار 7: submit ثم أدمن يوافق ===');
  res = await fetch(`${BASE}/requests/${requestId}/submit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regularToken}` },
    body: JSON.stringify({ referenceNumber: 'REF-API-TEST' }),
  });
  check('submit نجح (200)', res.status === 200);

  res = await fetch(`${BASE}/requests/${requestId}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ decision: 'approve', adminNote: 'تحقق يدوي' }),
  });
  body = await res.json();
  check('أدمن ينفّذ review بنجاح (200, status=paid)', res.status === 200 && body.data.status === 'paid');

  console.log('\n=== اختبار 8: أدمن ينفّذ refund ===');
  res = await fetch(`${BASE}/requests/${requestId}/refund`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ adminNote: 'اختبار استرجاع' }),
  });
  body = await res.json();
  check('أدمن ينفّذ refund بنجاح (200, status=refunded)', res.status === 200 && body.data.status === 'refunded');

  console.log('\n=== اختبار 9: plan_id غير موجود ===');
  res = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regularToken}` },
    body: JSON.stringify({ planId: 'fake_plan_xyz', paymentMethod: 'bank_transfer' }),
  });
  check('خطة غير موجودة -> 404', res.status === 404);

  console.log('\n=== اختبار 10: خطة غير فعّالة (is_active=false) ===');
  await supabase.from('plans').upsert(
    { id: 'inactive_test_plan', name: 'Inactive TEST', price_amount_minor: 500, currency: 'ILS', billing_interval: 'monthly', is_active: false },
    { onConflict: 'id' }
  );
  res = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regularToken}` },
    body: JSON.stringify({ planId: 'inactive_test_plan', paymentMethod: 'bank_transfer' }),
  });
  check('خطة غير فعّالة -> رُفضت (400)', res.status === 400);
  await supabase.from('plans').delete().eq('id', 'inactive_test_plan'); // تنظيف

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('خطأ غير متوقع:', e);
  process.exit(1);
});