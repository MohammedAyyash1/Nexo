import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function getUserProjects(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('projects').select('id, name, description, instructions, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get projects error:', error); return []; }
  return data;
}

export async function getProjectById(projectId, userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('projects').select('*').eq('id', projectId).eq('user_id', userId).maybeSingle()
  );
  if (error) { console.error('Get project error:', error); return null; }
  return data;
}

export async function countUserProjects(userId) {
  const { count, error } = await supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) { console.error('Count projects error:', error); return 0; }
  return count || 0;
}

export async function createProject(userId, { name, instructions, description }) {
  const { data, error } = await withRetry(() =>
    supabase.from('projects').insert({ user_id: userId, name: name.trim(), instructions: instructions || '', description: description || '' }).select().single()
  );
  if (error) { console.error('Create project error:', error); throw new Error('فشل إنشاء المشروع'); }
  return data;
}

export async function updateProject(projectId, userId, { name, instructions, description }) {
  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (instructions !== undefined) updates.instructions = instructions;
  if (description !== undefined) updates.description = description;

  const { data, error } = await withRetry(() =>
    supabase.from('projects').update(updates).eq('id', projectId).eq('user_id', userId).select().single()
  );
  if (error) { console.error('Update project error:', error); throw new Error('فشل تحديث المشروع'); }
  return data;
}

// حذف المشروع - chats.project_id يترجع null تلقائيًا بفضل ON DELETE SET NULL (خيار أ: المحادثات تبقى)
export async function deleteProject(projectId, userId) {
  const { error } = await withRetry(() => supabase.from('projects').delete().eq('id', projectId).eq('user_id', userId));
  if (error) { console.error('Delete project error:', error); throw new Error('فشل حذف المشروع'); }
}

export async function attachFileToProject(projectId, userId, fileId, contentText) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error('project_not_found');
  const { data, error } = await withRetry(() =>
    supabase.from('project_files').insert({ project_id: projectId, file_id: fileId, content_text: contentText || null }).select().single()
  );
  if (error) { console.error('Attach file error:', error); throw new Error('فشل ربط الملف بالمشروع'); }
  return data;
}

export async function detachFileFromProject(projectId, userId, fileId) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error('project_not_found');
  const { error } = await withRetry(() => supabase.from('project_files').delete().eq('project_id', projectId).eq('file_id', fileId));
  if (error) { console.error('Detach file error:', error); throw new Error('فشل فك ربط الملف'); }
}

export async function getProjectFiles(projectId, userId) {
  const project = await getProjectById(projectId, userId);
  if (!project) return [];
  const { data, error } = await withRetry(() =>
    supabase.from('project_files').select('id, file_id, content_text, created_at, files(name, type)').eq('project_id', projectId)
  );
  if (error) { console.error('Get project files error:', error); return []; }
  return data;
}

export async function getProjectContext(projectId, userId) {
  const project = await getProjectById(projectId, userId);
  if (!project) return null;
  const { data: files } = await withRetry(() =>
    supabase.from('project_files').select('content_text, files(name)').eq('project_id', projectId)
  );
  const filesText = (files || []).filter((f) => f.content_text)
    .map((f) => `--- ${f.files?.name || 'ملف'} ---\n${f.content_text}`).join('\n\n');
  return { name: project.name, instructions: project.instructions, filesText };
}