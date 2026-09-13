import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';
import { executeToolCall } from '../services/tools/toolRunner.js';

const BASE = 'http://localhost:3001';
const FREE_EMAIL = 'nexo96002@gmail.com';

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
  const userId = await getUserId(FREE_EMAIL);
  const token = jwt.sign({ userId }, config.jwtSecret);

  console.log('=== اختبار وحدة مباشر (executeToolCall) ===');

  console.log('\n--- اختبار 1: حساب صحيح ---');
  let outcome = await executeToolCall({ name: 'calculate', args: { expression: '12 * (3 + 2)' } }, userId);
  check('نجح ورجع 60', outcome.success === true && outcome.result.result === 60);

  console.log('\n--- اختبار 2: معطيات غير صالحة (تعبير فاضي) ---');
  outcome = await executeToolCall({ name: 'calculate', args: {} }, userId);
  check('رفض بسبب missing_required_field', outcome.success === false && outcome.error === 'missing_required_field:expression');

  console.log('\n--- اختبار 3: تعبير يحتوي على كود خطير (يجب الرفض) ---');
  outcome = await executeToolCall({ name: 'calculate', args: { expression: 'process.exit(1)' } }, userId);
  check('رفض تعبير غير رقمي', outcome.success === false && outcome.error === 'invalid_expression');

  console.log('\n--- اختبار 4: أداة غير معروفة ---');
  outcome = await executeToolCall({ name: 'delete_everything', args: {} }, userId);
  check('رفض أداة غير مسجّلة', outcome.success === false && outcome.error === 'unknown_tool');

  console.log('\n--- اختبار 5: التاريخ والوقت ---');
  outcome = await executeToolCall({ name: 'get_current_datetime', args: {} }, userId);
  check('نجح ورجع iso صالح', outcome.success === true && !!outcome.result.iso);

  console.log('\n=== اختبار طرف-لطرف عبر /api/chat الفعلي ===');

  console.log('\n--- اختبار 6: سؤال عادي بدون أداة (سلوك غير متأثر) ---');
  let res = await fetch(`${BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'مرحبا، كيف حالك؟' }], lang: 'ar' }),
  });
  let text = await res.text();
  check('رد طبيعي بدون أخطاء (200)', res.status === 200 && text.length > 0);

  console.log('\n--- اختبار 7: سؤال حساب - يجب أن يستخدم الأداة ويرجع رقم صحيح ---');
  res = await fetch(`${BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'كم ناتج 847 ضرب 23؟ أعطني الرقم فقط' }], lang: 'ar' }),
  });
  text = await res.text();
  const correctAnswer = 847 * 23; // = 19481
  check(`الرد يحتوي على الناتج الصحيح (${correctAnswer})`, text.includes(String(correctAnswer)));

  console.log('\n--- اختبار 8: سؤال عن التاريخ الحالي ---');
  res = await fetch(`${BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'شو تاريخ اليوم بالضبط؟' }], lang: 'ar' }),
  });
  text = await res.text();
  const currentYear = new Date().getFullYear().toString();
  check(`الرد يحتوي على السنة الحالية (${currentYear})`, text.includes(currentYear));

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });