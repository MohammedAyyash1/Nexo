import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createSummaryRecord({ userId, videoUrl }) {
  const { data, error } = await withRetry(() =>
    supabase.from('youtube_summaries').insert({ user_id: userId, video_url: videoUrl, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create YT summary error:', error); throw new Error('فشل إنشاء السجل'); }
  return data;
}

export async function completeSummary(id, { videoTitle, summaryText }) {
  const { data, error } = await withRetry(() =>
    supabase.from('youtube_summaries').update({ status: 'completed', video_title: videoTitle, summary_text: summaryText }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete YT summary error:', error); throw new Error('فشل حفظ الملخص'); }
  return data;
}

export async function failSummary(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('youtube_summaries').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail YT summary update error:', error);
  return data;
}

export async function getUserSummaries(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('youtube_summaries').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get YT summaries error:', error); return []; }
  return data;
}

export async function deleteSummary(id, userId) {
  const { error } = await withRetry(() => supabase.from('youtube_summaries').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete YT summary error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserSummaries(userId) {
  const { error } = await supabase.from('youtube_summaries').delete().eq('user_id', userId);
  if (error) { console.error('Delete all YT summaries error:', error); throw new Error('فشل حذف السجل'); }
}