import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createAdRecord({ userId, productIdea }) {
  const { data, error } = await withRetry(() =>
    supabase.from('ad_generations').insert({ user_id: userId, product_idea: productIdea, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create ad record error:', error); throw new Error('فشل إنشاء الإعلان'); }
  return data;
}

export async function completeAd(id, { headline, description, cta, adImagePath }) {
  const { data, error } = await withRetry(() =>
    supabase.from('ad_generations').update({ status: 'completed', headline, description, cta, ad_image_path: adImagePath }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete ad error:', error); throw new Error('فشل حفظ الإعلان'); }
  return data;
}

export async function failAd(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('ad_generations').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail ad update error:', error);
  return data;
}

export async function getUserAds(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('ad_generations').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get ads error:', error); return []; }
  return data.map(attachAdImageUrl);
}

export async function deleteAd(id, userId) {
  const { error } = await withRetry(() => supabase.from('ad_generations').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete ad error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserAds(userId) {
  const { error } = await supabase.from('ad_generations').delete().eq('user_id', userId);
  if (error) { console.error('Delete all ads error:', error); throw new Error('فشل حذف السجل'); }
}

export function attachAdImageUrl(item) {
  const adImageUrl = item.ad_image_path
    ? supabase.storage.from('user-files').getPublicUrl(item.ad_image_path).data.publicUrl
    : null;
  return { ...item, ad_image_url: adImageUrl };
}