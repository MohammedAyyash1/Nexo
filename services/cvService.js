import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createCv({ userId, title, data }) {
  const { data: row, error } = await withRetry(() =>
    supabase.from('cv_documents').insert({ user_id: userId, title: title || 'سيرتي الذاتية', data }).select().single()
  );
  if (error) { console.error('Create CV error:', error); throw new Error('فشل حفظ السيرة الذاتية'); }
  return row;
}

export async function updateCv(id, userId, { title, data }) {
  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (data !== undefined) updates.data = data;
  const { data: row, error } = await withRetry(() =>
    supabase.from('cv_documents').update(updates).eq('id', id).eq('user_id', userId).select().single()
  );
  if (error) { console.error('Update CV error:', error); throw new Error('فشل تحديث السيرة الذاتية'); }
  return row;
}

export async function getUserCvs(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('cv_documents').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
  );
  if (error) { console.error('Get CVs error:', error); return []; }
  return data;
}

export async function getCvById(id, userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('cv_documents').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
  );
  if (error) { console.error('Get CV error:', error); return null; }
  return data;
}

export async function deleteCv(id, userId) {
  const { error } = await withRetry(() => supabase.from('cv_documents').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete CV error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserCvs(userId) {
  const { error } = await supabase.from('cv_documents').delete().eq('user_id', userId);
  if (error) { console.error('Delete all CVs error:', error); throw new Error('فشل حذف السجل'); }
}