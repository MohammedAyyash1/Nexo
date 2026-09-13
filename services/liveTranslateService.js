import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون أحرف/أرقام ملتبسة (O/0, I/1)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createSession(userId) {
  const joinCode = generateJoinCode();
  const { data, error } = await withRetry(() =>
    supabase.from('live_translate_sessions').insert({ created_by: userId, status: 'waiting', join_code: joinCode }).select().single()
  );
  if (error) { console.error('Create live session error:', error); throw new Error('فشل إنشاء الجلسة'); }
  return data;
}

export async function getSessionByCode(code) {
  const { data, error } = await withRetry(() =>
    supabase.from('live_translate_sessions').select('*').eq('join_code', code).maybeSingle()
  );
  if (error) { console.error('Get session by code error:', error); return null; }
  return data;
}

export async function getSession(id) {
  const { data, error } = await withRetry(() =>
    supabase.from('live_translate_sessions').select('*').eq('id', id).maybeSingle()
  );
  if (error) { console.error('Get live session error:', error); return null; }
  return data;
}

export async function updateSessionStatus(id, status, participantCount) {
  const updates = { status };
  if (participantCount !== undefined) updates.participant_count = participantCount;
  if (status === 'ended') updates.ended_at = new Date().toISOString();
  await withRetry(() => supabase.from('live_translate_sessions').update(updates).eq('id', id));
}export async function getSessionByCodePrefix(codePrefix) {
  const { data, error } = await withRetry(() =>
    supabase.from('live_translate_sessions').select('*').neq('status', 'ended')
  );
  if (error) { console.error('Get session by code error:', error); return null; }
  const normalized = codePrefix.replace(/-/g, '').toLowerCase();
  return (data || []).find((s) => s.id.replace(/-/g, '').toLowerCase().startsWith(normalized)) || null;
}