import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createSession({ userId, title }) {
  const { data, error } = await withRetry(() =>
    supabase.from('study_sessions').insert({ user_id: userId, title, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create study session error:', error); throw new Error('فشل إنشاء الجلسة'); }
  return data;
}

export async function completeSession(id, { summary, keyConcepts, quiz }) {
  const { data, error } = await withRetry(() =>
    supabase.from('study_sessions').update({ status: 'completed', summary, key_concepts: keyConcepts, quiz }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete study session error:', error); throw new Error('فشل حفظ الجلسة'); }
  return data;
}

export async function failSession(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('study_sessions').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail study session update error:', error);
  return data;
}

export async function getUserSessions(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('study_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get study sessions error:', error); return []; }
  return data;
}

export async function getSessionById(id, userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('study_sessions').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
  );
  if (error) { console.error('Get study session error:', error); return null; }
  return data;
}

export async function deleteSession(id, userId) {
  const { error } = await withRetry(() => supabase.from('study_sessions').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete study session error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserSessions(userId) {
  const { error } = await supabase.from('study_sessions').delete().eq('user_id', userId);
  if (error) { console.error('Delete all study sessions error:', error); throw new Error('فشل حذف السجل'); }
}