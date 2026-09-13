import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createSet({ userId, title }) {
  const { data, error } = await withRetry(() =>
    supabase.from('flashcard_sets').insert({ user_id: userId, title, status: 'processing' }).select().single()
  );
  if (error) throw new Error('فشل إنشاء المجموعة');
  return data;
}

export async function completeSet(id, cards) {
  const { data, error } = await withRetry(() =>
    supabase.from('flashcard_sets').update({ status: 'completed', cards }).eq('id', id).select().single()
  );
  if (error) throw new Error('فشل حفظ البطاقات');
  return data;
}

export async function failSet(id) {
  await withRetry(() => supabase.from('flashcard_sets').update({ status: 'failed' }).eq('id', id));
}

export async function getUserSets(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('flashcard_sets').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error(error); return []; }
  return data;
}

export async function deleteSet(id, userId) {
  const { error } = await withRetry(() => supabase.from('flashcard_sets').delete().eq('id', id).eq('user_id', userId));
  if (error) throw new Error('فشل الحذف');
}

export async function deleteAllUserSets(userId) {
  const { error } = await supabase.from('flashcard_sets').delete().eq('user_id', userId);
  if (error) throw new Error('فشل حذف السجل');
}