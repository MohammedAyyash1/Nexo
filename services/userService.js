import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function loadUsers() {
  const { data, error } = await withRetry(() =>
    supabase.from('users').select('*')
  );
  if (error) { console.error('Load users error (after retries):', error); return []; }
  return data;
}

export async function saveUser(user) {
  const { error } = await withRetry(() =>
    supabase.from('users').upsert(user)
  );
  if (error) {
    console.error('❌ Save user error (after retries):', JSON.stringify(error, null, 2));
    throw new Error('فشل حفظ المستخدم: ' + error.message);
  }
}

export async function findUserByEmail(email) {
  const { data, error } = await withRetry(() =>
    supabase.from('users').select('*').ilike('email', email).maybeSingle()
  );
  if (error) { console.error('Find user by email error (after retries):', error); return null; }
  return data;
}

export async function findUserById(id) {
  const { data, error } = await withRetry(() =>
    supabase.from('users').select('*').eq('id', id).maybeSingle()
  );
  if (error) { console.error('Find user by id error (after retries):', error); return null; }
  return data;
}export async function updateUserPassword(userId, hashedPassword) {
  const { error } = await withRetry(() =>
    supabase.from('users').update({ password: hashedPassword }).eq('id', userId)
  );
  if (error) {
    console.error('❌ Update password error (after retries):', JSON.stringify(error, null, 2));
    throw new Error('فشل تحديث كلمة المرور: ' + error.message);
  }
}export async function deleteUserAccount(userId) {
  // 1. نجيب كل ملفات المستخدم لحذفها من Storage قبل حذف صف المستخدم نفسه
  const { data: files } = await withRetry(() =>
    supabase.from('files').select('storage_path').eq('user_id', userId)
  );

  const storagePaths = (files || [])
    .map((f) => f.storage_path)
    .filter(Boolean); // نتجاهل أي صف بدون مسار تخزين فعلي

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from('user-files').remove(storagePaths);
    if (storageError) {
      console.error('❌ Delete storage files error:', JSON.stringify(storageError, null, 2));
      // لا نوقف العملية — نكمل حذف الحساب حتى لو فشل تنظيف بعض الملفات، ونسجّل الخطأ للمراجعة اليدوية
    }
  }

  // 2. حذف صف المستخدم — بفضل "on delete cascade" بمعظم الجداول،
  // هذا يحذف تلقائيًا: chats, messages, memory_facts, personalization,
  // chat_settings, ai_settings, files (سجلات الجدول)
  const { error } = await withRetry(() =>
    supabase.from('users').delete().eq('id', userId)
  );
  if (error) {
    console.error('❌ Delete user account error (after retries):', JSON.stringify(error, null, 2));
    throw new Error('فشل حذف الحساب: ' + error.message);
  }
}