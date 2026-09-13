import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createExtraction({ userId, sourceImagePath }) {
  const { data, error } = await withRetry(() =>
    supabase.from('ocr_extractions').insert({ user_id: userId, source_image_path: sourceImagePath, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create OCR extraction error:', error); throw new Error('فشل إنشاء السجل'); }
  return data;
}

export async function completeExtraction(id, extractedText) {
  const { data, error } = await withRetry(() =>
    supabase.from('ocr_extractions').update({ status: 'completed', extracted_text: extractedText }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete OCR extraction error:', error); throw new Error('فشل حفظ النص'); }
  return data;
}

export async function failExtraction(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('ocr_extractions').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail OCR extraction update error:', error);
  return data;
}

export async function getUserExtractions(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('ocr_extractions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get OCR extractions error:', error); return []; }
  return data;
}

export async function deleteExtraction(id, userId) {
  const { error } = await withRetry(() => supabase.from('ocr_extractions').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete OCR extraction error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserExtractions(userId) {
  const { error } = await supabase.from('ocr_extractions').delete().eq('user_id', userId);
  if (error) { console.error('Delete all OCR extractions error:', error); throw new Error('فشل حذف السجل'); }
}

export function attachImageUrl(item) {
  const sourceImageUrl = item.source_image_path
    ? supabase.storage.from('user-files').getPublicUrl(item.source_image_path).data.publicUrl
    : null;
  return { ...item, source_image_url: sourceImageUrl };
}