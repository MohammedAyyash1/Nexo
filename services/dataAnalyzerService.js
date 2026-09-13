import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createAnalysis({ userId, fileName }) {
  const { data, error } = await withRetry(() =>
    supabase.from('data_analyses').insert({ user_id: userId, file_name: fileName, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create analysis error:', error); throw new Error('فشل إنشاء التحليل'); }
  return data;
}

export async function completeAnalysis(id, { rowCount, columnCount, stats, insights }) {
  const { data, error } = await withRetry(() =>
    supabase.from('data_analyses').update({ status: 'completed', row_count: rowCount, column_count: columnCount, stats, insights }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete analysis error:', error); throw new Error('فشل حفظ التحليل'); }
  return data;
}

export async function failAnalysis(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('data_analyses').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail analysis update error:', error);
  return data;
}

export async function getUserAnalyses(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('data_analyses').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get analyses error:', error); return []; }
  return data;
}

export async function deleteAnalysis(id, userId) {
  const { error } = await withRetry(() => supabase.from('data_analyses').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete analysis error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserAnalyses(userId) {
  const { error } = await supabase.from('data_analyses').delete().eq('user_id', userId);
  if (error) { console.error('Delete all analyses error:', error); throw new Error('فشل حذف السجل'); }
}