import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function getUserFiles(userId) {
  const { data, error } = await withRetry(() =>
    supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  );
  if (error) { console.error('Get user files error (after retries):', error); return []; }

  // نضيف رابط عام (public URL) جاهز لكل ملف، حتى نقدر نعرضه مباشرة بالـ Frontend
  return data.map((file) => {
    const { data: urlData } = supabase.storage
      .from('user-files')
      .getPublicUrl(file.storage_path);
    return { ...file, url: urlData.publicUrl };
  });
}

export async function deleteFileRecord(fileId, userId) {
  // نتحقق من user_id بنفس الاستعلام — حماية إضافية تمنع حذف ملف يخص مستخدم تاني
  const { error } = await withRetry(() =>
    supabase.from('files').delete().eq('id', fileId).eq('user_id', userId)
  );
  if (error) {
    console.error('Delete file record error (after retries):', error);
    throw new Error('فشل حذف الملف: ' + error.message);
  }
}export async function saveFileRecord({ userId, chatId, name, type, size, storagePath }) {
  const { data, error } = await withRetry(() =>
    supabase
      .from('files')
      .insert({
        user_id: userId,
        chat_id: chatId,
        name,
        type,
        size,
        storage_path: storagePath,
      })
      .select()
      .single()
  );
  if (error) {
    console.error('Save file record error (after retries):', error);
    throw new Error('فشل حفظ بيانات الملف: ' + error.message);
  }
  return data;
}