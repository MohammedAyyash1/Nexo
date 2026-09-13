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
  const { data } = await supabase.from('users').select('id').eq('email', email).single();
  return data.id;
}

async function run() {
  const adminId = await getUserId(ADMIN_EMAIL);
  const regularId = await getUserId(REGULAR_EMAIL);
  const adminToken = jwt.sign({ userId: adminId }, config.jwtSecret);
  const regularToken = jwt.sign({ userId: regularId }, config.jwtSecret);

  console.log('=== اختبار 1: مستخدم عادي يحاول الوصول لقائمة الأدمن ===');
  let res = await fetch(`${BASE}/admin/requests`, { headers: { Authorization: `Bearer ${regularToken}` } });
  check('مستخدم عادي ممنوع (403)', res.status === 403);

  console.log('\n=== اختبار 2: بدون تسجيل دخول ===');
  res = await fetch(`${BASE}/admin/requests`);
  check('بدون توكن (401)', res.status === 401);

  console.log('\n=== اختبار 3: أدمن يشوف القائمة ===');
  res = await fetch(`${BASE}/admin/requests`, { headers: { Authorization: `Bearer ${adminToken}` } });
  let body = await res.json();
  check('أدمن يشوف القائمة (200)', res.status === 200 && body.success === true);
  check('العناصر فيها user_email و plan_name', body.data.length > 0 && !!body.data[0].plan_name);

  console.log('\n=== سيناريو كامل: إنشاء طلب جديد ومراجعته من لوحة الأدمن ===');
  res = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regularToken}` },
    body: JSON.stringify({ planId: 'pro_monthly', paymentMethod: 'bank_transfer' }),
  });
  body = await res.json();
  const requestId = body.data.id;

  const fd = new FormData();
  fd.append('referenceNumber', 'REF-ADMIN-TEST');
  await fetch(`${BASE}/requests/${requestId}/proof`, { method: 'POST', headers: { Authorization: `Bearer ${regularToken}` }, body: fd });

  console.log('\n=== اختبار 4: مستخدم عادي يحاول start-review ===');
  res = await fetch(`${BASE}/admin/requests/${requestId}/start-review`, { method: 'POST', headers: { Authorization: `Bearer ${regularToken}` } });
  check('مستخدم عادي ممنوع من start-review (403)', res.status === 403);

  console.log('\n=== اختبار 5: أدمن يبدأ المراجعة (submitted -> under_review) ===');
  res = await fetch(`${BASE}/admin/requests/${requestId}/start-review`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } });
  body = await res.json();
  check('نجح بدء المراجعة (200, under_review)', res.status === 200 && body.data.status === 'under_review');

  console.log('\n=== اختبار 6: رفض بدون admin_note - يجب أن يُرفض ===');
  res = await fetch(`${BASE}/requests/${requestId}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ decision: 'reject' }),
  });
  check('رفض بدون سبب -> 400', res.status === 400);

  console.log('\n=== اختبار 7: رفض مع admin_note ===');
  res = await fetch(`${BASE}/requests/${requestId}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ decision: 'reject', adminNote: 'الإثبات غير واضح' }),
  });
  body = await res.json();
  check('رفض مع سبب ينجح (200, rejected)', res.status === 200 && body.data.status === 'rejected');

  console.log('\n=== اختبار 8: refund غير مسموح على طلب rejected ===');
  res = await fetch(`${BASE}/requests/${requestId}/refund`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  check('refund مرفوض على rejected (409)', res.status === 409);

  console.log('\n=== اختبار 9: مسار كامل ثانٍ - موافقة ثم استرجاع ===');
  res = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regularToken}` },
    body: JSON.stringify({ planId: 'pro_monthly', paymentMethod: 'palpay' }),
  });
  body = await res.json();
  const requestId2 = body.data.id;
  const fd2 = new FormData();
  fd2.append('referenceNumber', 'REF-ADMIN-TEST-2');
  await fetch(`${BASE}/requests/${requestId2}/proof`, { method: 'POST', headers: { Authorization: `Bearer ${regularToken}` }, body: fd2 });

  res = await fetch(`${BASE}/requests/${requestId2}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ decision: 'approve' }),
  });
  check('موافقة تنجح', res.status === 200);

  res = await fetch(`${BASE}/requests/${requestId2}/refund`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ adminNote: 'اختبار استرجاع بعد موافقة' }),
  });
  body = await res.json();
  check('استرجاع بعد موافقة ينجح (200, refunded)', res.status === 200 && body.data.status === 'refunded');

  console.log('\n=== اختبار 10: سجل الأحداث يحتوي على review_started بـactor_type=admin ===');
  const { data: events } = await supabase.from('payment_request_events').select('*').eq('payment_request_id', requestId).eq('event_type', 'review_started');
  check('حدث review_started مسجّل بـactor_type=admin', events.length === 1 && events[0].actor_type === 'admin' && events[0].actor_id === adminId);

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });