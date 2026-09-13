import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createEntry({ userId, title, content }) {
  const { data, error } = await withRetry(() =>
    supabase.from('knowledge_entries').insert({ user_id: userId, title, content }).select().single()
  );
  if (error) throw new Error('فشل حفظ الملاحظة');
  return data;
}

export async function getUserEntries(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('knowledge_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error(error); return []; }
  return data;
}

export async function deleteEntry(id, userId) {
  const { error } = await withRetry(() => supabase.from('knowledge_entries').delete().eq('id', id).eq('user_id', userId));
  if (error) throw new Error('فشل الحذف');
}

export async function deleteAllUserEntries(userId) {
  const { error } = await supabase.from('knowledge_entries').delete().eq('user_id', userId);
  if (error) throw new Error('فشل حذف السجل');
}

// بحث نصي بسيط (بدون Embeddings) - كافٍ لقاعدة معرفة شخصية بحجم معقول
export async function searchEntries(userId, query) {
  const { data, error } = await withRetry(() =>
    supabase.from('knowledge_entries').select('*').eq('user_id', userId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`).limit(8)
  );
  if (error) { console.error(error); return []; }
  return data;
}