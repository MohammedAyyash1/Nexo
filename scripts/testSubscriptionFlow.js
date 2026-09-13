import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';

const BASE = 'http://localhost:3001/api/v1/payments';
const REGULAR_EMAIL = 'nexo96002@gmail.com';

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { console.log(`✅ ${label}`); pass++; }
  else { console.log(`❌ ${label}`); fail++; }
}

async function run() {
  const { data: user } = await supabase.from('users').select('id').eq('email', REGULAR_EMAIL).single();
  const token = jwt.sign({ userId: user.id }, config.jwtSecret);

  console.log('=== سيناريو: عرض الخطة (كما تفعل الصفحة عند التحميل) ===');
  let res = await fetch(`${BASE}/plans/pro_monthly`);
  let body = await res.json();
  check('GET /plans/:id بدون auth ينجح (200)', res.status === 200 && body.success === true);
  check('السعر موجود بالرد (1000)', body.data.price_amount_minor === 1000);
  check('العملة موجودة (ILS)', body.data.currency === 'ILS');

  console.log('\n=== سيناريو: المستخدم يضغط "اشترك الآن" ===');
  res = await fetch(`${BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ planId: 'pro_monthly', paymentMethod: 'bank_transfer' }),
  });
  body = await res.json();
  check('POST /requests ينجح (201)', res.status === 201 && body.success === true);
  check('حالة الطلب الابتدائية pending', body.data.status === 'pending');
  check('السعر بالطلب مطابق لسعر الخطة (1000)', body.data.amount_minor === 1000);
  check('الطلب مرتبط بصاحبه الصحيح', body.data.user_id === user.id);

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });