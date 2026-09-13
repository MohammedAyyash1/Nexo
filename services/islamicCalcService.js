import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function saveCalculation({ userId, calcType, inputs, result }) {
  const { data, error } = await withRetry(() =>
    supabase.from('islamic_calculations').insert({ user_id: userId, calc_type: calcType, inputs, result }).select().single()
  );
  if (error) { console.error('Save calculation error:', error); throw new Error('فشل حفظ الحساب'); }
  return data;
}

export async function getUserCalculations(userId, calcType) {
  let query = supabase.from('islamic_calculations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (calcType) query = query.eq('calc_type', calcType);
  const { data, error } = await withRetry(() => query);
  if (error) { console.error('Get calculations error:', error); return []; }
  return data;
}

export async function deleteCalculation(id, userId) {
  const { error } = await withRetry(() => supabase.from('islamic_calculations').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete calculation error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserCalculations(userId, calcType) {
  let query = supabase.from('islamic_calculations').delete().eq('user_id', userId);
  if (calcType) query = query.eq('calc_type', calcType);
  const { error } = await query;
  if (error) { console.error('Delete all calculations error:', error); throw new Error('فشل حذف السجل'); }
}