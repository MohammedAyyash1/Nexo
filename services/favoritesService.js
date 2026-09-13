import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function addFavorite({ userId, chatId, messageId, chatTitle, content }) {
  const { data, error } = await withRetry(() =>
    supabase.from('favorites').insert({
      user_id: userId, chat_id: chatId, message_id: messageId, chat_title: chatTitle, content,
    }).select().single()
  );
  if (error) {
    if (error.code === '23505') throw new Error('already_favorited'); // unique constraint
    console.error('Add favorite error:', error);
    throw new Error('فشل الإضافة للمفضلة');
  }
  return data;
}

export async function removeFavoriteByMessage(userId, messageId) {
  const { error } = await withRetry(() =>
    supabase.from('favorites').delete().eq('user_id', userId).eq('message_id', messageId)
  );
  if (error) { console.error('Remove favorite error:', error); throw new Error('فشل الحذف'); }
}

export async function getUserFavorites(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  if (error) { console.error('Get favorites error:', error); return []; }
  return data;
}

export async function getUserFavoriteMessageIds(userId) {
  const { data, error } = await withRetry(() =>
    supabase.from('favorites').select('message_id').eq('user_id', userId)
  );
  if (error) { console.error('Get favorite ids error:', error); return []; }
  return data.map((f) => f.message_id);
}

export async function deleteAllUserFavorites(userId) {
  const { error } = await supabase.from('favorites').delete().eq('user_id', userId);
  if (error) { console.error('Delete all favorites error:', error); throw new Error('فشل حذف المفضلة'); }
}