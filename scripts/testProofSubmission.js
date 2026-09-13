import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';

const BASE = 'http://localhost:3001/api/v1/payments';
const REGULAR_EMAIL = 'nexo96002@gmail.com';
const ADMIN_EMAIL = 'mohammedayyash84@gmail.com';

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
  const userId = await getUserId(REGULAR_EMAIL);
  const otherUserId = await getUserId(ADMIN_EMAIL);
  const token = jwt.sign({ userId }, config.jwtSecret);
  const otherToken = jwt.sign({ userId: otherUserId }, config.jwtSecret);

  console.log('=== إنشاء طلب دفع جديد للاختبار ===');
  let res = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ planId: 'pro_monthly', paymentMethod: 'bank_transfer' }),
  });
  let body = await res.json();
  const requestId = body.data.id;
  check('تم إنشاء الطلب (pending)', body.data.status === 'pending');

  console.log('\n=== اختبار 1: مستخدم آخر يحاول إرسال إثبات لطلب لا يملكه ===');
  const fd1 = new FormData();
  fd1.append('referenceNumber', 'HACK-123');
  res = await fetch(`${BASE}/requests/${requestId}/proof`, {
    method: 'POST', headers: { Authorization: `Bearer ${otherToken}` }, body: fd1,
  });
  check('مستخدم آخر ممنوع (404)', res.status === 404);

  console.log('\n=== اختبار 2: مستخدم آخر يحاول رؤية قائمة طلبات المستخدم الأول ===');
  res = await fetch(`${BASE}/requests`, { headers: { Authorization: `Bearer ${otherToken}` } });
  body = await res.json();
  const leaked = body.data.some((r) => r.id === requestId);
  check('لا يظهر طلب المستخدم الأول ضمن نتائج المستخدم الآخر', !leaked);

  console.log('\n=== اختبار 3: بدون رقم مرجعي - رفض ===');
  const fd2 = new FormData();
  res = await fetch(`${BASE}/requests/${requestId}/proof`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd2,
  });
  check('رفض بدون referenceNumber (400)', res.status === 400);

  console.log('\n=== اختبار 4: صاحب الطلب يرسل الإثبات بنجاح (بدون ملف) ===');
  const fd3 = new FormData();
  fd3.append('referenceNumber', 'REF-PROOF-001');
  res = await fetch(`${BASE}/requests/${requestId}/proof`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd3,
  });
  body = await res.json();
  check('نجح إرسال الإثبات (200, submitted)', res.status === 200 && body.data.status === 'submitted');

  console.log('\n=== اختبار 5: محاولة إرسال إثبات ثانية لنفس الطلب (الحالة لم تعد pending) ===');
  const fd4 = new FormData();
  fd4.append('referenceNumber', 'REF-PROOF-002');
  res = await fetch(`${BASE}/requests/${requestId}/proof`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd4,
  });
  check('رفض الإرسال المكرر (409)', res.status === 409);

  console.log('\n=== اختبار 6: رفع ملف بنوع غير مدعوم ===');
  const fd5 = new FormData();
  fd5.append('referenceNumber', 'REF-BAD-TYPE');
  const fakeFile = new Blob(['fake content'], { type: 'text/plain' });
  fd5.append('file', fakeFile, 'test.txt');

  let res2 = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ planId: 'pro_monthly', paymentMethod: 'jawwal_pay' }),
  });
  const body2 = await res2.json();
  const requestId2 = body2.data.id;

  res = await fetch(`${BASE}/requests/${requestId2}/proof`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd5,
  });
  check('رفض نوع ملف غير مدعوم (400)', res.status === 400);

  console.log('\n=== اختبار 7: رفع ملف صورة صالح ينجح ويُخزَّن storage_path (لا رابط عام مباشر) ===');
  const fd6 = new FormData();
  fd6.append('referenceNumber', 'REF-WITH-IMAGE');
  const fakeImage = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
  fd6.append('file', fakeImage, 'proof.jpg');
  res = await fetch(`${BASE}/requests/${requestId2}/proof`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd6,
  });
  body = await res.json();
  check('نجح رفع الصورة (200, submitted)', res.status === 200 && body.data.status === 'submitted');

  console.log('\n=== اختبار 8: صاحب الطلب يقدر يشوف proof_signed_url خاص فيه ===');
  res = await fetch(`${BASE}/requests/${requestId2}`, { headers: { Authorization: `Bearer ${token}` } });
  body = await res.json();
  check('يوجد رابط موقّت لملف الإثبات', !!body.data.proof_signed_url);

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });