import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createDraft({ userId, mode, tone, inputText }) {
  const { data, error } = await withRetry(() =>
    supabase.from('email_drafts').insert({ user_id: userId, mode, tone, input_text: inputText, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create email draft error:', error); throw new Error('فشل إنشاء المسودة'); }
  return data;
}

export async function completeDraft(id, { subject, body }) {
  const { data, error } = await withRetry(() =>
    supabase.from('email_drafts').update({ status: 'completed', subject, body }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete email draft error:', error); throw new Error('فشل حفظ المسودة'); }
  return data;
}

export async function failDraft(id) {
  const { data, error } = await withRetry(() =>
    supabase.from('email_drafts').update({ status: 'failed' }).eq('id', id).select().single()
  );
  if (error) console.error('Fail email draft update error:', error);
  return data;
}

export async function getUserDrafts(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('email_drafts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get email drafts error:', error); return []; }
  return data;
}

export async function deleteDraft(id, userId) {
  const { error } = await withRetry(() => supabase.from('email_drafts').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete email draft error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserDrafts(userId) {
  const { error } = await supabase.from('email_drafts').delete().eq('user_id', userId);
  if (error) { console.error('Delete all email drafts error:', error); throw new Error('فشل حذف السجل'); }
}