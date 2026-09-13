import { supabase } from './supabaseClient.js';
import { withRetry } from './withRetry.js';

export async function getUserChats(userId) {
  const { data: chats, error } = await withRetry(() =>
    supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  );
  if (error) { console.error('Get chats error (after retries):', error); return []; }

  const chatsWithMessages = await Promise.all(
    chats.map(async (chat) => {
      const { data: messages } = await supabase
        .from('messages')
        .select('id, role, content')
        .eq('chat_id', chat.id)
        .order('id', { ascending: true });
      return { ...chat, messages: messages || [] };
    })
  );
  return chatsWithMessages;
}

export async function createChat(userId, chatId, title, assistantId = null, projectId = null) {
  const { error } = await withRetry(() =>
    supabase.from('chats').insert({ id: chatId, user_id: userId, title, assistant_id: assistantId, project_id: projectId })
  );
  if (error) console.error('Create chat error (after retries):', error);
}

export async function updateChatTitle(chatId, title) {
  const { error } = await withRetry(() =>
    supabase.from('chats').update({ title }).eq('id', chatId)
  );
  if (error) console.error('Update chat title error (after retries):', error);
}

export async function updateChatFlags(chatId, flags) {
  const { error } = await withRetry(() =>
    supabase.from('chats').update(flags).eq('id', chatId)
  );
  if (error) console.error('Update chat flags error (after retries):', error);
}

export async function deleteChat(chatId) {
  const { error } = await withRetry(() =>
    supabase.from('chats').delete().eq('id', chatId)
  );
  if (error) console.error('Delete chat error (after retries):', error);
}

export async function addMessage(chatId, role, content) {
  const { data, error } = await withRetry(() =>
    supabase.from('messages').insert({ chat_id: chatId, role, content }).select().single()
  );
  if (error) { console.error('Add message error (after retries):', error); return null; }
  return data;
}

export async function getChatOwner(chatId) {
  const { data, error } = await withRetry(() => supabase.from('chats').select('user_id').eq('id', chatId).maybeSingle());
  if (error) { console.error('Get chat owner error:', error); return null; }
  return data?.user_id || null;
}

export async function updateMessageContent(messageId, content) {
  const { data, error } = await withRetry(() =>
    supabase.from('messages').update({ content }).eq('id', messageId).select().single()
  );
  if (error) { console.error('Update message error:', error); throw new Error('فشل تحديث الرسالة'); }
  return data;
}

export async function deleteMessagesAfter(chatId, messageId) {
  const { error } = await withRetry(() =>
    supabase.from('messages').delete().eq('chat_id', chatId).gt('id', messageId)
  );
  if (error) { console.error('Delete messages after error:', error); throw new Error('فشل حذف الرسائل'); }
}

export async function deleteMessagesFromIncluding(chatId, messageId) {
  const { error } = await withRetry(() =>
    supabase.from('messages').delete().eq('chat_id', chatId).gte('id', messageId)
  );
  if (error) { console.error('Delete messages from error:', error); throw new Error('فشل حذف الرسائل'); }
}