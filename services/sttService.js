import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createTranscriptionRecord({ userId, sourceFileName, sourceStoragePath }) {
  const { data, error } = await withRetry(() =>
    supabase.from('transcriptions').insert({
      user_id: userId, source_file_name: sourceFileName, source_storage_path: sourceStoragePath, status: 'processing',
    }).select().single()
  );
  if (error) { console.error('Create transcription error:', error); throw new Error('فشل إنشاء سجل التفريغ'); }
  return data;
}

export async function completeTranscription(id, { transcriptText, language }) {
  const { data, error } = await withRetry(() =>
    supabase.from('transcriptions').update({ status: 'completed', transcript_text: transcriptText, language }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete transcription error:', error); throw new Error('فشل حفظ النص'); }
  return data;
}

export async function failTranscription(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('transcriptions').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail transcription update error:', error);
  return data;
}

export async function getUserTranscriptions(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('transcriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get transcriptions error:', error); return []; }
  return data;
}

export async function deleteTranscription(id, userId) {
  const { error } = await withRetry(() => supabase.from('transcriptions').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete transcription error:', error); throw new Error('فشل الحذف'); }
}