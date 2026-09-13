import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function createWorkflow({ userId, name, steps }) {
  const { data, error } = await withRetry(() =>
    supabase.from('workflows').insert({ user_id: userId, name, steps }).select().single()
  );
  if (error) throw new Error('فشل إنشاء سير العمل');
  return data;
}

export async function getUserWorkflows(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('workflows').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error(error); return []; }
  return data;
}

export async function getWorkflowById(id, userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('workflows').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
  );
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteWorkflow(id, userId) {
  const { error } = await withRetry(() => supabase.from('workflows').delete().eq('id', id).eq('user_id', userId));
  if (error) throw new Error('فشل الحذف');
}

export async function createRun({ userId, workflowId, workflowName, inputText }) {
  const { data, error } = await withRetry(() =>
    supabase.from('workflow_runs').insert({ user_id: userId, workflow_id: workflowId, workflow_name: workflowName, input_text: inputText, status: 'processing' }).select().single()
  );
  if (error) throw new Error('فشل بدء التشغيل');
  return data;
}

export async function completeRun(id, stepResults) {
  const { data, error } = await withRetry(() =>
    supabase.from('workflow_runs').update({ status: 'completed', step_results: stepResults }).eq('id', id).select().single()
  );
  if (error) throw new Error('فشل حفظ النتائج');
  return data;
}

export async function failRun(id) {
  await withRetry(() => supabase.from('workflow_runs').update({ status: 'failed' }).eq('id', id));
}

export async function getUserRuns(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('workflow_runs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error(error); return []; }
  return data;
}

export async function deleteRun(id, userId) {
  const { error } = await withRetry(() => supabase.from('workflow_runs').delete().eq('id', id).eq('user_id', userId));
  if (error) throw new Error('فشل الحذف');
}

export async function deleteAllUserRuns(userId) {
  const { error } = await supabase.from('workflow_runs').delete().eq('user_id', userId);
  if (error) throw new Error('فشل حذف السجل');
}