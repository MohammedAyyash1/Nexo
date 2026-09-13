import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createConversion({ userId, inputText, direction, dialect }) {
  const { data, error } = await withRetry(() =>
    supabase.from('dialect_conversions').insert({ user_id: userId, input_text: inputText, direction, dialect, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create conversion error:', error); throw new Error('فشل إنشاء السجل'); }
  return data;
}

export async function completeConversion(id, outputText) {
  const { data, error } = await withRetry(() =>
    supabase.from('dialect_conversions').update({ status: 'completed', output_text: outputText }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete conversion error:', error); throw new Error('فشل حفظ النتيجة'); }
  return data;
}

export async function failConversion(id) {
  const { data, error } = await withRetry(() =>
    supabase.from('dialect_conversions').update({ status: 'failed' }).eq('id', id).select().single()
  );
  if (error) console.error('Fail conversion update error:', error);
  return data;
}

export async function getUserConversions(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('dialect_conversions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get conversions error:', error); return []; }
  return data;
}

export async function deleteConversion(id, userId) {
  const { error } = await withRetry(() => supabase.from('dialect_conversions').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete conversion error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserConversions(userId) {
  const { error } = await supabase.from('dialect_conversions').delete().eq('user_id', userId);
  if (error) { console.error('Delete all conversions error:', error); throw new Error('فشل حذف السجل'); }
}