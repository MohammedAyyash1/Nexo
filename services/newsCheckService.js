import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createCheckRecord({ userId, inputText }) {
  const { data, error } = await withRetry(() =>
    supabase.from('news_checks').insert({ user_id: userId, input_text: inputText, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create news check error:', error); throw new Error('فشل إنشاء السجل'); }
  return data;
}

export async function completeCheck(id, { verdict, explanation, sources }) {
  const { data, error } = await withRetry(() =>
    supabase.from('news_checks').update({ status: 'completed', verdict, explanation, sources }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete news check error:', error); throw new Error('فشل حفظ النتيجة'); }
  return data;
}

export async function failCheck(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('news_checks').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail news check update error:', error);
  return data;
}

export async function getUserChecks(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('news_checks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get news checks error:', error); return []; }
  return data;
}

export async function deleteCheck(id, userId) {
  const { error } = await withRetry(() => supabase.from('news_checks').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete news check error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserChecks(userId) {
  const { error } = await supabase.from('news_checks').delete().eq('user_id', userId);
  if (error) { console.error('Delete all news checks error:', error); throw new Error('فشل حذف السجل'); }
}