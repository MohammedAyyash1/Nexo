import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createImageGenRecord({ userId, prompt, inputImageCount }) {
  const { data, error } = await withRetry(() =>
    supabase.from('image_studio_generations').insert({
      user_id: userId, prompt, input_image_count: inputImageCount, status: 'processing',
    }).select().single()
  );
  if (error) { console.error('Create image gen record error:', error); throw new Error('فشل إنشاء السجل'); }
  return data;
}

export async function completeImageGen(id, resultImagePath) {
  const { data, error } = await withRetry(() =>
    supabase.from('image_studio_generations').update({ status: 'completed', result_image_path: resultImagePath }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete image gen error:', error); throw new Error('فشل حفظ الصورة'); }
  return data;
}

export async function failImageGen(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('image_studio_generations').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail image gen update error:', error);
  return data;
}

export async function getUserImageGenerations(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('image_studio_generations').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get image generations error:', error); return []; }
  return data;
}

export async function deleteImageGen(id, userId) {
  const { error } = await withRetry(() => supabase.from('image_studio_generations').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete image gen error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserImageGens(userId) {
  const { error } = await supabase.from('image_studio_generations').delete().eq('user_id', userId);
  if (error) { console.error('Delete all image gens error:', error); throw new Error('فشل حذف السجل'); }
}

export function attachImageUrl(item) {
  const resultImageUrl = item.result_image_path
    ? supabase.storage.from('user-files').getPublicUrl(item.result_image_path).data.publicUrl
    : null;
  return { ...item, result_image_url: resultImageUrl };
}