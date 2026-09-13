import { supabase } from '../supabaseClient.js';
import { withRetry } from '../withRetry.js';

export async function createAvatarJob({ userId, sourceImagePath, scriptText, provider }) {
  const { data, error } = await withRetry(() =>
    supabase.from('avatar_jobs').insert({
      user_id: userId, source_image_path: sourceImagePath, script_text: scriptText,
      provider, status: 'queued',
    }).select().single()
  );
  if (error) { console.error('Create avatar job error:', error); throw new Error('فشل إنشاء مهمة التوليد'); }
  return data;
}

export async function setAvatarJobProviderInfo(jobId, providerJobId, status) {
  const { data, error } = await withRetry(() =>
    supabase.from('avatar_jobs').update({ provider_job_id: providerJobId, status, updated_at: new Date().toISOString() })
      .eq('id', jobId).select().single()
  );
  if (error) { console.error('Update avatar job provider info error:', error); throw new Error('فشل تحديث المهمة'); }
  return data;
}

export async function updateAvatarJobStatus(jobId, { status, resultVideoPath, errorMessage }) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (resultVideoPath !== undefined) updates.result_video_path = resultVideoPath;
  if (errorMessage !== undefined) updates.error_message = errorMessage;
  const { data, error } = await withRetry(() =>
    supabase.from('avatar_jobs').update(updates).eq('id', jobId).select().single()
  );
  if (error) { console.error('Update avatar job status error:', error); throw new Error('فشل تحديث حالة المهمة'); }
  return data;
}

export async function getAvatarJobById(jobId, userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('avatar_jobs').select('*').eq('id', jobId).eq('user_id', userId).maybeSingle()
  );
  if (error) { console.error('Get avatar job error:', error); return null; }
  return data;
}

export async function getUserAvatarJobs(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('avatar_jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get user avatar jobs error:', error); return []; }
  return data;
}

export async function deleteAvatarJob(jobId, userId) {
  const { error } = await withRetry(() =>
    supabase.from('avatar_jobs').delete().eq('id', jobId).eq('user_id', userId)
  );
  if (error) { console.error('Delete avatar job error:', error); throw new Error('فشل حذف المهمة'); }
}

// نفس نمط fileService.getUserFiles - نرفق روابط عامة جاهزة للعرض المباشر
export function attachPublicUrls(job) {
  const sourceImageUrl = job.source_image_path
    ? supabase.storage.from('user-files').getPublicUrl(job.source_image_path).data.publicUrl
    : null;
  const resultVideoUrl = job.result_video_path
    ? supabase.storage.from('user-files').getPublicUrl(job.result_video_path).data.publicUrl
    : null;
  return { ...job, source_image_url: sourceImageUrl, result_video_url: resultVideoUrl };
}export async function deleteAllUserAvatarJobs(userId) {
  const { error } = await supabase.from('avatar_jobs').delete().eq('user_id', userId);
  if (error) { console.error('Delete all avatar jobs error:', error); throw new Error('فشل حذف السجل'); }
}