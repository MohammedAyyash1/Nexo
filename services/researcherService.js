import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createReport({ userId, query }) {
  const { data, error } = await withRetry(() =>
    supabase.from('research_reports').insert({ user_id: userId, query, status: 'processing' }).select().single()
  );
  if (error) throw new Error('فشل إنشاء البحث');
  return data;
}

export async function completeReport(id, { reportText, sources }) {
  const { data, error } = await withRetry(() =>
    supabase.from('research_reports').update({ status: 'completed', report_text: reportText, sources }).eq('id', id).select().single()
  );
  if (error) throw new Error('فشل حفظ التقرير');
  return data;
}

export async function failReport(id) {
  await withRetry(() => supabase.from('research_reports').update({ status: 'failed' }).eq('id', id));
}

export async function getUserReports(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('research_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error(error); return []; }
  return data;
}

export async function deleteReport(id, userId) {
  const { error } = await withRetry(() => supabase.from('research_reports').delete().eq('id', id).eq('user_id', userId));
  if (error) throw new Error('فشل الحذف');
}

export async function deleteAllUserReports(userId) {
  const { error } = await supabase.from('research_reports').delete().eq('user_id', userId);
  if (error) throw new Error('فشل حذف السجل');
}