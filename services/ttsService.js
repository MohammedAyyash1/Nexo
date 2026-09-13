import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createTtsRecord({ userId, inputText, voice, language }) {
  const { data, error } = await withRetry(() =>
    supabase.from('tts_generations').insert({
      user_id: userId, input_text: inputText, voice, language, status: 'processing',
    }).select().single()
  );
  if (error) { console.error('Create TTS record error:', error); throw new Error('فشل إنشاء طلب التوليد'); }
  return data;
}

export async function completeTts(id, resultAudioPath) {
  const { data, error } = await withRetry(() =>
    supabase.from('tts_generations').update({ status: 'completed', result_audio_path: resultAudioPath }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete TTS error:', error); throw new Error('فشل حفظ الصوت'); }
  return data;
}

export async function failTts(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('tts_generations').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail TTS update error:', error);
  return data;
}

export async function getUserTtsGenerations(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('tts_generations').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get TTS generations error:', error); return []; }
  return data;
}

export async function deleteTtsGeneration(id, userId) {
  const { error } = await withRetry(() => supabase.from('tts_generations').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete TTS generation error:', error); throw new Error('فشل الحذف'); }
}

export function attachTtsAudioUrl(item) {
  const audioUrl = item.result_audio_path
    ? supabase.storage.from('user-files').getPublicUrl(item.result_audio_path).data.publicUrl
    : null;
  return { ...item, audio_url: audioUrl };
}export async function deleteAllUserTtsGenerations(userId) {
  const { error } = await supabase.from('tts_generations').delete().eq('user_id', userId);
  if (error) { console.error('Delete all TTS generations error:', error); throw new Error('فشل حذف السجل'); }
}