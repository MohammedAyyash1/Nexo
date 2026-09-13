import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createMeeting({ userId, title }) {
  const { data, error } = await withRetry(() =>
    supabase.from('meeting_notes').insert({ user_id: userId, title, status: 'processing' }).select().single()
  );
  if (error) { console.error('Create meeting error:', error); throw new Error('فشل إنشاء الاجتماع'); }
  return data;
}

export async function completeMeeting(id, { transcriptText, summary, keyPoints, actionItems, decisions }) {
  const { data, error } = await withRetry(() =>
    supabase.from('meeting_notes').update({
      status: 'completed', transcript_text: transcriptText, summary, key_points: keyPoints, action_items: actionItems, decisions,
    }).eq('id', id).select().single()
  );
  if (error) { console.error('Complete meeting error:', error); throw new Error('فشل حفظ محضر الاجتماع'); }
  return data;
}

export async function failMeeting(id, errorMessage) {
  const { data, error } = await withRetry(() =>
    supabase.from('meeting_notes').update({ status: 'failed', error_message: errorMessage }).eq('id', id).select().single()
  );
  if (error) console.error('Fail meeting update error:', error);
  return data;
}

export async function getUserMeetings(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('meeting_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get meetings error:', error); return []; }
  return data;
}

export async function deleteMeeting(id, userId) {
  const { error } = await withRetry(() => supabase.from('meeting_notes').delete().eq('id', id).eq('user_id', userId));
  if (error) { console.error('Delete meeting error:', error); throw new Error('فشل الحذف'); }
}

export async function deleteAllUserMeetings(userId) {
  const { error } = await supabase.from('meeting_notes').delete().eq('user_id', userId);
  if (error) { console.error('Delete all meetings error:', error); throw new Error('فشل حذف السجل'); }
}