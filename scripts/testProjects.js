import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';

const BASE = 'http://localhost:3001/api';
const FREE_EMAIL = 'nexo96002@gmail.com';
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

async function cleanupProjects(userId) {
  await supabase.from('projects').delete().eq('user_id', userId);
}

async function run() {
  const freeUserId = await getUserId(FREE_EMAIL);
  const proUserId = await getUserId(ADMIN_EMAIL);
  await cleanupProjects(freeUserId);
  await cleanupProjects(proUserId);

  const freeToken = jwt.sign({ userId: freeUserId }, config.jwtSecret);
  const otherToken = jwt.sign({ userId: proUserId }, config.jwtSecret);

  console.log('=== اختبار 1: بدون تسجيل دخول ===');
  let res = await fetch(`${BASE}/projects`);
  check('بدون توكن -> 401', res.status === 401);

  console.log('\n=== اختبار 2: إنشاء مشروع بدون اسم ===');
  res = await fetch(`${BASE}/projects`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ instructions: 'سياق تجريبي' }),
  });
  check('رفض بدون اسم (400)', res.status === 400);

  console.log('\n=== اختبار 3: مستخدم Free ينشئ أول مشروع (مسموح، الحد=1) ===');
  res = await fetch(`${BASE}/projects`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ name: 'مشروع البحث', instructions: 'كل المحادثات هون عن بحث السوق', description: 'مساحة بحث السوق' }),
  });
  let body = await res.json();
  check('نجح إنشاء أول مشروع (200)', res.status === 200 && !!body.project);
  const project1Id = body.project?.id;

  console.log('\n=== اختبار 4: مستخدم Free يحاول إنشاء مشروع ثانٍ (يجب الرفض) ===');
  res = await fetch(`${BASE}/projects`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ name: 'مشروع ثانٍ', instructions: 'test' }),
  });
  body = await res.json();
  check('رفض المشروع الثاني لـFree (403)', res.status === 403 && body.code === 'QUOTA_EXCEEDED');

  console.log('\n=== اختبار 5: صاحب المشروع يقدر يشوفه ===');
  res = await fetch(`${BASE}/projects/${project1Id}`, { headers: { Authorization: `Bearer ${freeToken}` } });
  body = await res.json();
  check('صاحب المشروع يراه (200)', res.status === 200 && body.project.name === 'مشروع البحث');
  check('يحتوي على files array فاضية', Array.isArray(body.files) && body.files.length === 0);

  console.log('\n=== اختبار 6: مستخدم آخر لا يقدر يشوف مشروع لا يملكه ===');
  res = await fetch(`${BASE}/projects/${project1Id}`, { headers: { Authorization: `Bearer ${otherToken}` } });
  check('مستخدم آخر ممنوع (404)', res.status === 404);

  console.log('\n=== اختبار 7: تحديث المشروع (PATCH) ===');
  res = await fetch(`${BASE}/projects/${project1Id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ instructions: 'سياق محدّث' }),
  });
  body = await res.json();
  check('التحديث نجح ويعكس القيمة الجديدة', res.status === 200 && body.project.instructions === 'سياق محدّث');

  console.log('\n=== اختبار 8: ربط ملف غير موجود بمشروع ===');
  res = await fetch(`${BASE}/projects/${project1Id}/files`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ fileId: '00000000-0000-0000-0000-000000000000' }),
  });
  check('رفض ملف غير موجود (404)', res.status === 404);

  console.log('\n=== اختبار 9: ربط محادثة بمشروع عبر POST /chats ===');
  const testChatId = 'test-chat-project-' + Date.now();
  res = await fetch(`${BASE}/chats`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ id: testChatId, title: 'محادثة داخل مشروع', projectId: project1Id }),
  });
  check('إنشاء محادثة مرتبطة بمشروع نجح', res.status === 200);

  const { data: chatRow } = await supabase.from('chats').select('project_id').eq('id', testChatId).single();
  check('project_id انحفظ صح بجدول chats', chatRow.project_id === project1Id);

  console.log('\n=== اختبار 10: حذف المشروع - المحادثة تبقى موجودة بس project_id يصير null (خيار أ) ===');
  res = await fetch(`${BASE}/projects/${project1Id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${freeToken}` } });
  check('الحذف نجح', res.status === 200);

  const { data: chatAfterDelete } = await supabase.from('chats').select('project_id').eq('id', testChatId).single();
  check('المحادثة لسا موجودة بعد حذف المشروع', !!chatAfterDelete);
  check('project_id صار null (المحادثة انفكت، ما انحذفت)', chatAfterDelete.project_id === null);

  console.log('\n=== اختبار 11: حذف المشروع يحرر المجال لإنشاء مشروع جديد (Free) ===');
  res = await fetch(`${BASE}/projects`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ name: 'مشروع جديد بعد الحذف', instructions: 'test' }),
  });
  check('مسموح ينشئ مشروع جديد بعد حذف القديم (200)', res.status === 200);

  console.log('\n=== اختبار 12: مستخدم Pro يقدر ينشئ أكثر من مشروع (بدون حد) ===');
  for (let i = 0; i < 3; i++) {
    res = await fetch(`${BASE}/projects`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ name: `مشروع Pro ${i + 1}`, instructions: 'test' }),
    });
    check(`Pro ينشئ مشروع رقم ${i + 1} بنجاح`, res.status === 200);
  }

  console.log('\n=== اختبار 13: GET /projects يرجع مشاريع المستخدم فقط ===');
  res = await fetch(`${BASE}/projects`, { headers: { Authorization: `Bearer ${otherToken}` } });
  body = await res.json();
  check('Pro يشوف 3 مشاريع بالضبط', body.projects.length === 3);

  console.log('\n=== تنظيف بيانات الاختبار ===');
  await supabase.from('chats').delete().eq('id', testChatId);
  await cleanupProjects(freeUserId);
  await cleanupProjects(proUserId);

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });