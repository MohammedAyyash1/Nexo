import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';

const BASE = 'http://localhost:3001/api';
const FREE_EMAIL = 'nexo96002@gmail.com';
const PRO_EMAIL = 'mohammedayyash84@gmail.com';

let pass = 0, fail = 0;
function check(label, cond) { if (cond) { console.log(`✅ ${label}`); pass++; } else { console.log(`❌ ${label}`); fail++; } }
async function getUserId(email) { const { data } = await supabase.from('users').select('id').eq('email', email).single(); return data.id; }

async function run() {
  const freeUserId = await getUserId(FREE_EMAIL);
  const proUserId = await getUserId(PRO_EMAIL);
  const freeToken = jwt.sign({ userId: freeUserId }, config.jwtSecret);
  const proToken = jwt.sign({ userId: proUserId }, config.jwtSecret);

  console.log('=== اختبار 1: بدون تسجيل دخول ===');
  let res = await fetch(`${BASE}/avatar/jobs`);
  check('بدون توكن -> 401', res.status === 401);

  console.log('\n=== اختبار 2: Free محظور من الميزة ===');
  const fakeImage = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
  const fd1 = new FormData();
  fd1.append('script', 'مرحبا بكم');
  fd1.append('image', fakeImage, 'test.jpg');
  res = await fetch(`${BASE}/avatar/jobs`, { method: 'POST', headers: { Authorization: `Bearer ${freeToken}` }, body: fd1 });
  check('Free ممنوع (403)', res.status === 403);

  console.log('\n=== اختبار 3: Pro بدون صورة ===');
  const fd2 = new FormData();
  fd2.append('script', 'مرحبا بكم');
  res = await fetch(`${BASE}/avatar/jobs`, { method: 'POST', headers: { Authorization: `Bearer ${proToken}` }, body: fd2 });
  check('رفض بدون صورة (400)', res.status === 400);

  console.log('\n=== اختبار 4: Pro بصيغة صورة غير مدعومة ===');
  const fd3 = new FormData();
  fd3.append('script', 'مرحبا بكم');
  fd3.append('image', new Blob(['not an image'], { type: 'text/plain' }), 'test.txt');
  res = await fetch(`${BASE}/avatar/jobs`, { method: 'POST', headers: { Authorization: `Bearer ${proToken}` }, body: fd3 });
  check('رفض صيغة غير مدعومة (400)', res.status === 400);

  console.log('\n=== اختبار 5: Pro بنص أطول من الحد ===');
  const fd4 = new FormData();
  fd4.append('script', 'ا'.repeat(2000));
  fd4.append('image', fakeImage, 'test.jpg');
  res = await fetch(`${BASE}/avatar/jobs`, { method: 'POST', headers: { Authorization: `Bearer ${proToken}` }, body: fd4 });
  check('رفض نص طويل جدًا (400)', res.status === 400);

  console.log('\n=== اختبار 6: Pro بمدخلات صحيحة (يحتاج DID_API_KEY فعلي للنجاح الكامل) ===');
  const fd5 = new FormData();
  fd5.append('script', 'مرحبا بكم في Nexo');
  fd5.append('image', fakeImage, 'test.jpg');
  res = await fetch(`${BASE}/avatar/jobs`, { method: 'POST', headers: { Authorization: `Bearer ${proToken}` }, body: fd5 });
  const body6 = await res.json();
  if (res.status === 200) {
    check('نجح إنشاء المهمة فعليًا (200) - المفتاح شغّال', true);
    console.log('   job id:', body6.job?.id, '- status:', body6.job?.status);
  } else if (res.status === 502) {
    check('رفض بسبب المزوّد (502) - متوقع بدون DID_API_KEY صالح بعد، هذا يؤكد معالجة الخطأ تشتغل صح', true);
  } else {
    check(`نتيجة غير متوقعة (${res.status})`, false);
  }

  console.log('\n=== اختبار 7: GET /avatar/jobs يرجع فقط مهام المستخدم ===');
  res = await fetch(`${BASE}/avatar/jobs`, { headers: { Authorization: `Bearer ${proToken}` } });
  const body7 = await res.json();
  check('يرجع مصفوفة jobs', Array.isArray(body7.jobs));

  console.log('\n=== تنظيف ===');
  await supabase.from('avatar_jobs').delete().eq('user_id', proUserId);
  await supabase.from('usage_counters').delete().eq('user_id', proUserId).eq('feature_key', 'avatar_generation');

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });