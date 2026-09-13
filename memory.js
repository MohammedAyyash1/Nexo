import { supabase } from './services/supabaseClient.js';
import { config } from './config/env.js';
import { withRetry } from './services/withRetry.js';
import { consumeQuota } from './services/entitlementService.js';

export async function getUserFacts(userId) {
  const { data, error } = await withRetry(() =>
    supabase
      .from('memory_facts')
      .select('id, fact, category, pinned, created_at')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
  );
  if (error) { console.error('Get facts error (after retries):', error); return []; }
  return data;
}

export async function updateFact(userId, factId, { fact, category }) {
  const { data, error } = await withRetry(() =>
    supabase
      .from('memory_facts')
      .update({ fact, category })
      .eq('id', factId)
      .eq('user_id', userId)
      .select()
      .single()
  );
  if (error) { console.error('Update fact error:', error); throw new Error('فشل تحديث الحقيقة'); }
  return data;
}

export async function deleteFact(userId, factId) {
  const { error } = await withRetry(() =>
    supabase.from('memory_facts').delete().eq('id', factId).eq('user_id', userId)
  );
  if (error) { console.error('Delete fact error:', error); throw new Error('فشل حذف الحقيقة'); }
}

export async function setPinned(userId, factId, pinned) {
  const { data, error } = await withRetry(() =>
    supabase
      .from('memory_facts')
      .update({ pinned: !!pinned })
      .eq('id', factId)
      .eq('user_id', userId)
      .select()
      .single()
  );
  if (error) { console.error('Set pinned error:', error); throw new Error('فشل تحديث التثبيت'); }
  return data;
}

// يطبّق قرارات extractFacts فعليًا - إضافات جديدة تُقاس بحصة "memory" (feature بنظام الـEntitlements)
// تحديث/حذف ذكرى موجودة لا يستهلك حصة (مش إضافة صافية)
export async function applyFactActions(userId, actions) {
  if (!actions || !actions.length) return;

  for (const action of actions) {
    if (action.action === 'add') {
      const quota = await consumeQuota(userId, 'memory');
      if (!quota.allowed) {
        console.log(`Memory quota exceeded for user ${userId}, skipping add.`);
        continue; // تجاوز الحصة - نتجاهل الإضافة بصمت، بدون كسر بقية العملية
      }
      await withRetry(() =>
        supabase.from('memory_facts').insert({
          user_id: userId,
          fact: action.fact,
          category: action.category || 'general',
        })
      );
    } else if (action.action === 'update' && action.replaceId) {
      await withRetry(() =>
        supabase
          .from('memory_facts')
          .update({ fact: action.fact, category: action.category || 'general' })
          .eq('id', action.replaceId)
          .eq('user_id', userId)
      );
    } else if (action.action === 'remove' && action.replaceId) {
      await withRetry(() =>
        supabase.from('memory_facts').delete().eq('id', action.replaceId).eq('user_id', userId)
      );
    }
  }
}

export async function extractFacts(userMessage, assistantReply, existingFacts = []) {
  const existingList = existingFacts.length
    ? existingFacts.map((f) => `- [id:${f.id}] (${f.category}) ${f.fact}`).join('\n')
    : '(none)';

  const prompt = `You maintain a long-term memory about a user across conversations.

Existing facts:
${existingList}

New conversation exchange:
User: ${userMessage}
Assistant: ${assistantReply}

Decide what changes (if any) are needed to the memory. Respond with ONLY a JSON array of action objects, or [] if nothing changes. Each object has:
- "action": "add" | "update" | "remove"
- "fact": short fact string in the same language as the user (required for add/update)
- "category": one of "personal", "work", "preferences", "projects", "general" (required for add/update)
- "replaceId": the id of the existing fact being updated/removed (required for update/remove only)

Rules:
- Use "update" instead of "add" when a new fact contradicts or refines an existing one (e.g. changed job, changed preference).
- Use "remove" only if a fact is now explicitly false or no longer true.
- Before adding a new fact, check if it is a near-duplicate or a more specific version of an existing fact. If so, use "update" on that existing fact's id instead of "add".
- If two existing facts in the list above contradict each other, resolve it: keep the more specific/recent one via "update", and "remove" the outdated one.
- Do not add facts that are temporary, trivial, or already covered by an existing fact.
- NEVER store sensitive information: health conditions/diagnoses, sexual orientation, religion, political views, government ID numbers, exact financial figures, passwords, or any information about third parties (family members, partners) beyond their relationship to the user.
- NEVER store the user's preferred dialect or language style (e.g. "prefers Lebanese dialect", "wants Egyptian Arabic") — this is controlled by a dedicated setting, not memory.
- If nothing is worth remembering, respond with [].`;

  const parseActionsFromText = (text) => {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      return [];
    }
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 512 },
        }),
      }
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Gemini error');
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '[]';
    return parseActionsFromText(text);
  } catch (geminiErr) {
    console.error('Fact extraction (Gemini) failed, falling back to Groq:', geminiErr.message);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Groq error');
      const text = data.choices?.[0]?.message?.content || '[]';
      return parseActionsFromText(text);
    } catch (groqErr) {
      console.error('Fact extraction (Groq fallback) also failed:', groqErr.message);
      return [];
    }
  }
}