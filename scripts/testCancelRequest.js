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

  console.log('=== إنشاء طلب جديد (pending) للاختبار ===');
  let res = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ planId: 'pro_monthly', paymentMethod: 'bank_transfer' }),
  });
  let body = await res.json();
  const requestId = body.data.id;
  check('الطلب أُنشئ بحالة pending', body.data.status === 'pending');

  console.log('\n=== اختبار 1: مستخدم آخر يحاول إلغاء طلب لا يملكه ===');
  res = await fetch(`${BASE}/requests/${requestId}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${otherToken}` } });
  check('مستخدم آخر ممنوع (404)', res.status === 404);

  console.log('\n=== اختبار 2: صاحب الطلب يلغيه بنجاح (pending -> canceled) ===');
  res = await fetch(`${BASE}/requests/${requestId}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  body = await res.json();
  check('الإلغاء ينجح (200, canceled)', res.status === 200 && body.data.status === 'canceled');

  console.log('\n=== اختبار 3: محاولة إلغاء نفس الطلب مرة ثانية (لم يعد pending) ===');
  res = await fetch(`${BASE}/requests/${requestId}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  check('رفض الإلغاء المكرر (409)', res.status === 409);

  console.log('\n=== اختبار 4: الطلب لم يُحذف من قاعدة البيانات (لا يزال قابلاً للقراءة) ===');
  res = await fetch(`${BASE}/requests/${requestId}`, { headers: { Authorization: `Bearer ${token}` } });
  body = await res.json();
  check('الطلب لا يزال موجودًا (200)', res.status === 200 && body.data.status === 'canceled');

  console.log('\n=== اختبار 5: محاولة إلغاء طلب submitted (غير مسموح) ===');
  res = await fetch(`${BASE}/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ planId: 'pro_monthly', paymentMethod: 'palpay' }),
  });
  body = await res.json();
  const requestId2 = body.data.id;
  const fd = new FormData();
  fd.append('referenceNumber', 'REF-CANCEL-TEST');
  await fetch(`${BASE}/requests/${requestId2}/proof`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });

  res = await fetch(`${BASE}/requests/${requestId2}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  check('رفض إلغاء طلب submitted (409)', res.status === 409);

  console.log('\n=== اختبار 6: سجل الأحداث يوثّق الإلغاء بشكل صحيح ===');
  const { data: events } = await supabase.from('payment_request_events').select('*').eq('payment_request_id', requestId).eq('event_type', 'canceled');
  check('حدث canceled مسجّل بـfrom_status=pending وnote صحيح', events.length === 1 && events[0].from_status === 'pending' && events[0].note === 'User changed payment method');

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });