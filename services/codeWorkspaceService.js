import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createSnippet({ userId, title, language, inputCode, action }) {
  const { data, error } = await withRetry(() =>
    supabase.from('code_snippets').insert({ user_id: userId, title, language, input_code: inputCode, action, status: 'processing' }).select().single()
  );
  if (error) throw new Error('فشل إنشاء السجل');
  return data;
}

export async function completeSnippet(id, resultText) {
  const { data, error } = await withRetry(() =>
    supabase.from('code_snippets').update({ status: 'completed', result_text: resultText }).eq('id', id).select().single()
  );
  if (error) throw new Error('فشل حفظ النتيجة');
  return data;
}

export async function failSnippet(id) {
  await withRetry(() => supabase.from('code_snippets').update({ status: 'failed' }).eq('id', id));
}

export async function getUserSnippets(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('code_snippets').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error(error); return []; }
  return data;
}

export async function deleteSnippet(id, userId) {
  const { error } = await withRetry(() => supabase.from('code_snippets').delete().eq('id', id).eq('user_id', userId));
  if (error) throw new Error('فشل الحذف');
}

export async function deleteAllUserSnippets(userId) {
  const { error } = await supabase.from('code_snippets').delete().eq('user_id', userId);
  if (error) throw new Error('فشل حذف السجل');
}