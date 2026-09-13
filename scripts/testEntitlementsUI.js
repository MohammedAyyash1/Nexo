import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';

const BASE = 'http://localhost:3001/api/v1/entitlements';
const FREE_EMAIL = 'nexo96002@gmail.com';

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { console.log(`✅ ${label}`); pass++; }
  else { console.log(`❌ ${label}`); fail++; }
}

async function run() {
  const { data: user } = await supabase.from('users').select('id').eq('email', FREE_EMAIL).single();
  await supabase.from('subscriptions').delete().eq('user_id', user.id);
  await supabase.from('usage_counters').delete().eq('user_id', user.id);
  const token = jwt.sign({ userId: user.id }, config.jwtSecret);

  console.log('=== اختبار 1: GET /me يرجع بيانات استهلاك فعلية (used/remaining) ===');
  let res = await fetch(`${BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
  let body = await res.json();
  const chatFeature = body.data.features.find((f) => f.feature_key === 'chat');
  check('GET /me نجح', res.status === 200 && body.success === true);
  check('chat فيها used=0 مبدئيًا', chatFeature.used === 0);
  check('chat فيها remaining = limit_value كامل', chatFeature.remaining === chatFeature.limit_value);
  check('features(name, unit, is_active) موجودة بكل صف', !!chatFeature.features && typeof chatFeature.features.is_active === 'boolean');

  console.log('\n=== اختبار 2: بدون توكن ===');
  res = await fetch(`${BASE}/me`);
  check('401 بدون توكن', res.status === 401);

  console.log('\n=== اختبار 3: GET /plans/:planId عام بدون auth ===');
  res = await fetch(`${BASE}/plans/pro_monthly`);
  body = await res.json();
  check('نجح بدون توكن (200)', res.status === 200 && body.success === true);
  check('يحتوي على image_generation مفعّلة لـPro', body.data.find((f) => f.feature_key === 'image_generation')?.is_enabled === true);

  console.log('\n=== اختبار 4: خطة غير موجودة ===');
  res = await fetch(`${BASE}/plans/fake_plan_xyz`);
  body = await res.json();
  check('يرجع مصفوفة فاضية بدون خطأ (200)', res.status === 200 && Array.isArray(body.data) && body.data.length === 0);

  console.log('\n=== اختبار 5: بعد استهلاك فعلي، used/remaining تنعكس صح ===');
  const { checkEntitlement, consumeQuota } = await import('../services/entitlementService.js');
  await consumeQuota(user.id, 'chat', null, 5);
  res = await fetch(`${BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
  body = await res.json();
  const chatAfter = body.data.features.find((f) => f.feature_key === 'chat');
  check('used = 5 بعد الاستهلاك', chatAfter.used === 5);
  check('remaining انخفض بمقدار 5', chatAfter.remaining === chatAfter.limit_value - 5);

  console.log('\n=== تنظيف ===');
  await supabase.from('usage_counters').delete().eq('user_id', user.id);

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });