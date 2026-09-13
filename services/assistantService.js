import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function getUserAssistants(userId) {
  const { data, error } = await withRetry(() =>
    supabase
      .from('assistants')
      .select('id, name, description, instructions, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  );
  if (error) { console.error('Get assistants error:', error); return []; }
  return data;
}

export async function getAssistantById(assistantId, userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('assistants').select('*').eq('id', assistantId).eq('user_id', userId).maybeSingle()
  );
  if (error) { console.error('Get assistant error:', error); return null; }
  return data;
}

export async function countUserAssistants(userId) {
  const { count, error } = await supabase
    .from('assistants')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) { console.error('Count assistants error:', error); return 0; }
  return count || 0;
}

export async function createAssistant(userId, { name, instructions, description }) {
  const { data, error } = await withRetry(() =>
    supabase
      .from('assistants')
      .insert({ user_id: userId, name: name.trim(), instructions: instructions || '', description: description || '' })
      .select()
      .single()
  );
  if (error) { console.error('Create assistant error:', error); throw new Error('فشل إنشاء المساعد'); }
  return data;
}

export async function updateAssistant(assistantId, userId, { name, instructions, description }) {
  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (instructions !== undefined) updates.instructions = instructions;
  if (description !== undefined) updates.description = description;

  const { data, error } = await withRetry(() =>
    supabase.from('assistants').update(updates).eq('id', assistantId).eq('user_id', userId).select().single()
  );
  if (error) { console.error('Update assistant error:', error); throw new Error('فشل تحديث المساعد'); }
  return data;
}

export async function deleteAssistant(assistantId, userId) {
  const { error } = await withRetry(() =>
    supabase.from('assistants').delete().eq('id', assistantId).eq('user_id', userId)
  );
  if (error) { console.error('Delete assistant error:', error); throw new Error('فشل حذف المساعد'); }
}

// يخزّن النص المستخرج من الملف وقت الربط - ما منعيد استخراجه كل رسالة شات (توفير تكلفة)
export async function attachFileToAssistant(assistantId, userId, fileId, contentText) {
  const assistant = await getAssistantById(assistantId, userId);
  if (!assistant) throw new Error('assistant_not_found');

  const { data, error } = await withRetry(() =>
    supabase.from('assistant_files').insert({ assistant_id: assistantId, file_id: fileId, content_text: contentText || null }).select().single()
  );
  if (error) { console.error('Attach file error:', error); throw new Error('فشل ربط الملف بالمساعد'); }
  return data;
}

export async function detachFileFromAssistant(assistantId, userId, fileId) {
  const assistant = await getAssistantById(assistantId, userId);
  if (!assistant) throw new Error('assistant_not_found');

  const { error } = await withRetry(() =>
    supabase.from('assistant_files').delete().eq('assistant_id', assistantId).eq('file_id', fileId)
  );
  if (error) { console.error('Detach file error:', error); throw new Error('فشل فك ربط الملف'); }
}

export async function getAssistantFiles(assistantId, userId) {
  const assistant = await getAssistantById(assistantId, userId);
  if (!assistant) return [];
  const { data, error } = await withRetry(() =>
    supabase.from('assistant_files').select('id, file_id, content_text, created_at, files(name, type)').eq('assistant_id', assistantId)
  );
  if (error) { console.error('Get assistant files error:', error); return []; }
  return data;
}

// يبني نص السياق الكامل للمساعد - يُستخدم مباشرة من chat.js لبناء systemPrompt
export async function getAssistantContext(assistantId, userId) {
  const assistant = await getAssistantById(assistantId, userId);
  if (!assistant) return null;

  const { data: files } = await withRetry(() =>
    supabase.from('assistant_files').select('content_text, files(name)').eq('assistant_id', assistantId)
  );

  const filesText = (files || [])
    .filter((f) => f.content_text)
    .map((f) => `--- ${f.files?.name || 'ملف'} ---\n${f.content_text}`)
    .join('\n\n');

  return { name: assistant.name, instructions: assistant.instructions, filesText };
}