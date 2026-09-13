import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase } from '../services/supabaseClient.js';

const BASE = 'http://localhost:3001/api';
const FREE_EMAIL = 'nexo96002@gmail.com';
const ADMIN_EMAIL = 'mohammedayyash84@gmail.com'; // له اشتراك Pro مفعّل من اختبارات سابقة

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { console.log(`✅ ${label}`); pass++; }
  else { console.log(`❌ ${label}`); fail++; }
}

async function getUserId(email) {
  const { data } = await supabase.from('users').select('id').eq('email', email).single();
  return data.id;
}

async function cleanupAssistants(userId) {
  await supabase.from('assistants').delete().eq('user_id', userId);
}

async function run() {
  const freeUserId = await getUserId(FREE_EMAIL);
  const proUserId = await getUserId(ADMIN_EMAIL);
  await cleanupAssistants(freeUserId);
  await cleanupAssistants(proUserId);

  const freeToken = jwt.sign({ userId: freeUserId }, config.jwtSecret);
  const otherToken = jwt.sign({ userId: proUserId }, config.jwtSecret);

  console.log('=== اختبار 1: بدون تسجيل دخول ===');
  let res = await fetch(`${BASE}/assistants`);
  check('بدون توكن -> 401', res.status === 401);

  console.log('\n=== اختبار 2: إنشاء مساعد بدون اسم ===');
  res = await fetch(`${BASE}/assistants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ instructions: 'كن ودودًا' }),
  });
  check('رفض بدون اسم (400)', res.status === 400);

  console.log('\n=== اختبار 3: مستخدم Free ينشئ أول مساعد (مسموح، الحد=1) ===');
  res = await fetch(`${BASE}/assistants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ name: 'مساعد الكتابة', instructions: 'ساعدني بالكتابة الإبداعية', description: 'مساعد للنصوص' }),
  });
  let body = await res.json();
  check('نجح إنشاء أول مساعد (200)', res.status === 200 && !!body.assistant);
  const assistant1Id = body.assistant?.id;

  console.log('\n=== اختبار 4: مستخدم Free يحاول إنشاء مساعد ثانٍ (يجب الرفض، الحد=1) ===');
  res = await fetch(`${BASE}/assistants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ name: 'مساعد ثانٍ', instructions: 'test' }),
  });
  body = await res.json();
  check('رفض المساعد الثاني لـFree (403)', res.status === 403 && body.code === 'QUOTA_EXCEEDED');

  console.log('\n=== اختبار 5: صاحب المساعد يقدر يشوفه ===');
  res = await fetch(`${BASE}/assistants/${assistant1Id}`, { headers: { Authorization: `Bearer ${freeToken}` } });
  body = await res.json();
  check('صاحب المساعد يراه (200)', res.status === 200 && body.assistant.name === 'مساعد الكتابة');
  check('يحتوي على files array فاضية', Array.isArray(body.files) && body.files.length === 0);

  console.log('\n=== اختبار 6: مستخدم آخر لا يقدر يشوف مساعد لا يملكه ===');
  res = await fetch(`${BASE}/assistants/${assistant1Id}`, { headers: { Authorization: `Bearer ${otherToken}` } });
  check('مستخدم آخر ممنوع (404)', res.status === 404);

  console.log('\n=== اختبار 7: تحديث المساعد (PATCH) ===');
  res = await fetch(`${BASE}/assistants/${assistant1Id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ instructions: 'تعليمات محدّثة' }),
  });
  body = await res.json();
  check('التحديث نجح ويعكس القيمة الجديدة', res.status === 200 && body.assistant.instructions === 'تعليمات محدّثة');

  console.log('\n=== اختبار 8: ربط ملف غير موجود بمساعد ===');
  res = await fetch(`${BASE}/assistants/${assistant1Id}/files`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ fileId: '00000000-0000-0000-0000-000000000000' }),
  });
  check('رفض ملف غير موجود (404)', res.status === 404);

  console.log('\n=== اختبار 9: حذف المساعد يحرر المجال لإنشاء واحد جديد ===');
  res = await fetch(`${BASE}/assistants/${assistant1Id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${freeToken}` } });
  check('الحذف نجح', res.status === 200);

  res = await fetch(`${BASE}/assistants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeToken}` },
    body: JSON.stringify({ name: 'مساعد جديد بعد الحذف', instructions: 'test' }),
  });
  check('مسموح ينشئ مساعد جديد بعد حذف القديم (200)', res.status === 200);

  console.log('\n=== اختبار 10: مستخدم Pro يقدر ينشئ أكثر من مساعد (بدون حد) ===');
  for (let i = 0; i < 3; i++) {
    res = await fetch(`${BASE}/assistants`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ name: `مساعد Pro ${i + 1}`, instructions: 'test' }),
    });
    check(`Pro ينشئ مساعد رقم ${i + 1} بنجاح`, res.status === 200);
  }

  console.log('\n=== اختبار 11: GET /assistants يرجع كل مساعدي المستخدم فقط ===');
  res = await fetch(`${BASE}/assistants`, { headers: { Authorization: `Bearer ${otherToken}` } });
  body = await res.json();
  check('Pro يشوف 3 مساعدين بالضبط', body.assistants.length === 3);

  console.log('\n=== اختبار 12: ربط محادثة بمساعد عبر POST /chats ===');
  const { data: proAssistants } = await supabase.from('assistants').select('id').eq('user_id', proUserId).limit(1).single();
  const testChatId = 'test-chat-' + Date.now();
  res = await fetch(`${BASE}/chats`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherToken}` },
    body: JSON.stringify({ id: testChatId, title: 'محادثة مع مساعد', assistantId: proAssistants.id }),
  });
  check('إنشاء محادثة مرتبطة بمساعد نجح', res.status === 200);

  const { data: chatRow } = await supabase.from('chats').select('assistant_id').eq('id', testChatId).single();
  check('assistant_id انحفظ صح بجدول chats', chatRow.assistant_id === proAssistants.id);

  console.log('\n=== تنظيف بيانات الاختبار ===');
  await supabase.from('chats').delete().eq('id', testChatId);
  await cleanupAssistants(freeUserId);
  await cleanupAssistants(proUserId);

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('خطأ غير متوقع:', e); process.exit(1); });