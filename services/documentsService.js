import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createDocumentRecord({ userId, fileName }) {
  const { data, error } = await withRetry(() =>
    supabase.from('ai_documents').insert({ user_id: userId, file_name: fileName, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create document record error:', error); throw new Error('فشل إنشاء السجل'); }
  return data;
}

export async function completeDocument(id, summaryText) {
  const { data, error } = await withRetry(() =>
    supabase.from('ai_documents').update({ status: 'completed', summary_text: summaryText }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete document error:', error); throw new Error('فشل حفظ التحليل'); }
  return data;
}

export async function failDocument(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('ai_documents').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail document update error:', error);
  return data;
}

export async function getUserDocuments(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('ai_documents').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get documents error:', error); return []; }
  return data;
}

export async function deleteDocument(id, userId) {
  const { error } = await withRetry(() => supabase.from('ai_documents').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete document error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserDocuments(userId) {
  const { error } = await supabase.from('ai_documents').delete().eq('user_id', userId);
  if (error) { console.error('Delete all documents error:', error); throw new Error('فشل حذف السجل'); }
}