import express from 'express';
import { config } from '../config/env.js';
import { authMiddleware } from '../authMiddleware.js';
import { buildSystemPrompt } from '../systemPrompt.js';
import { getUserFacts, applyFactActions, extractFacts, updateFact, deleteFact, setPinned } from '../memory.js';
import {
  getUserChats, createChat, updateChatTitle, updateChatFlags, deleteChat, addMessage,
  getChatOwner, updateMessageContent, deleteMessagesAfter, deleteMessagesFromIncluding,
} from '../services/chatService.js';
import { withRetry } from '../services/withRetry.js';
import { checkEntitlement, consumeQuota } from '../services/entitlementService.js';
import { getAllTools, executeToolCall, toGeminiToolsFormat, toGroqToolsFormat } from '../services/tools/toolRunner.js';
const router = express.Router();

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { messages, lang, image, pdfFile, assistantId, projectId } = req.body;

    if (!messages || !messages.length) {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }

    // فحص حصة chat أولاً - قبل أي استدعاء مكلف للموديل
    const chatEntitlement = await checkEntitlement(req.userId, 'chat');
    if (!chatEntitlement.allowed) {
      const msg = lang === 'en'
        ? 'You have reached your daily message limit. Upgrade to Pro for a higher limit.'
        : 'وصلت للحد اليومي من الرسائل. اشترك بـPro للحصول على حد أعلى.';
      return res.status(429).json({ error: msg, code: 'QUOTA_EXCEEDED', entitlement: chatEntitlement });
    }

    // ===== نظام السياق الذكي (v1) =====
    const MAX_CONTEXT_MESSAGES = 24;
    const truncatedCount = Math.max(0, messages.length - MAX_CONTEXT_MESSAGES);
    const contextMessages = truncatedCount > 0
      ? messages.slice(-MAX_CONTEXT_MESSAGES)
      : messages;

    const truncationNote = truncatedCount > 0
      ? (lang === 'en'
          ? `\n\nNote: This conversation has ${truncatedCount} earlier message(s) not shown to you directly. Rely on the "Known facts" section below for anything important from earlier, and ask the user to repeat specific details if truly needed.`
          : `\n\nملاحظة: هذه المحادثة فيها ${truncatedCount} رسالة أقدم غير ظاهرة لك مباشرة. اعتمد على قسم "الحقائق المعروفة" أدناه لأي شي مهم من قبل، واطلب من المستخدم إعادة ذكر أي تفصيل محدد لو احتجته فعليًا.`)
      : '';

    const { buildFallbackChain } = await import('../services/modelRegistry.js');
    const { supabase: supabaseForSettings } = await import('../services/supabaseClient.js');
    const { data: aiSettings } = await withRetry(() =>
      supabaseForSettings
        .from('ai_settings')
        .select('model_tier, web_search_enabled, dialect')
        .eq('user_id', req.userId)
        .maybeSingle()
    );

    const fallbackChain = buildFallbackChain(aiSettings?.model_tier);
    const { getSearchTool, extractSources } = await import('../services/searchProvider.js');

    let webSearchEnabled = false;
    if (aiSettings?.web_search_enabled) {
      const searchEntitlement = await checkEntitlement(req.userId, 'web_search');
      webSearchEnabled = searchEntitlement.allowed;
    }
    const tools = webSearchEnabled ? getSearchTool('google') : [];
    const hasMultimodal = !!(image || pdfFile || webSearchEnabled);
// ===== سياق المساعد المخصص (لو المحادثة مرتبطة بمساعد) =====
    let assistantContext = null;
    if (assistantId) {
      const { getAssistantContext } = await import('../services/assistantService.js');
      assistantContext = await getAssistantContext(assistantId, req.userId);
    }
    // ===== سياق المشروع (لو المحادثة جوا مشروع) =====
    let projectContext = null;
    if (projectId) {
      const { getProjectContext } = await import('../services/projectService.js');
      projectContext = await getProjectContext(projectId, req.userId);
    }
    // ===== ذاكرة أذكى: نحقن فقط أهم 15 حقيقة بالـsystem prompt =====
    const MAX_MEMORY_IN_PROMPT = 15;
    const userFacts = await getUserFacts(req.userId);
    const factsForPrompt = userFacts.slice(0, MAX_MEMORY_IN_PROMPT);
    const memoryNote = factsForPrompt.length
      ? (lang === 'en'
          ? `\n\nKnown facts about this user from previous conversations:\n${factsForPrompt.map((f) => `- ${f.fact}`).join('\n')}`
          : `\n\nحقائق معروفة عن هذا المستخدم من محادثات سابقة:\n${factsForPrompt.map((f) => `- ${f.fact}`).join('\n')}`)
      : '';

    const assistantNote = assistantContext
      ? (lang === 'en'
          ? `\n\nYou are currently acting as a custom assistant named "${assistantContext.name}" with these specific instructions:\n${assistantContext.instructions}${assistantContext.filesText ? `\n\nReference material provided for this assistant:\n${assistantContext.filesText}` : ''}`
          : `\n\nأنت الآن تعمل كمساعد مخصص اسمه "${assistantContext.name}" وله تعليمات خاصة:\n${assistantContext.instructions}${assistantContext.filesText ? `\n\nمواد مرجعية أضافها المستخدم لهذا المساعد:\n${assistantContext.filesText}` : ''}`)
      : '';

    const projectNote = projectContext
      ? (lang === 'en'
          ? `\n\nThis conversation is part of a workspace/project named "${projectContext.name}" with this shared context:\n${projectContext.instructions}${projectContext.filesText ? `\n\nReference material for this project:\n${projectContext.filesText}` : ''}`
          : `\n\nهذه المحادثة جزء من مساحة عمل/مشروع اسمه "${projectContext.name}" وله سياق مشترك:\n${projectContext.instructions}${projectContext.filesText ? `\n\nمواد مرجعية لهذا المشروع:\n${projectContext.filesText}` : ''}`)
      : '';

    const now = new Date();
    const dateNote = lang === 'en'
      ? `\n\nCurrent real date and time (always trust this, never guess): ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Hebron' })}.`
      : `\n\nالتاريخ والوقت الحقيقي الآن (اعتمد عليه دايمًا، لا تخمّن): ${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Hebron' })}.`;

    const systemPrompt = buildSystemPrompt(lang) + memoryNote + truncationNote + assistantNote + projectNote + dateNote;    let safeMessages = [...contextMessages];
    while (safeMessages.length && safeMessages[safeMessages.length - 1].role !== 'user') {
      safeMessages.pop();
    }
    if (safeMessages.length === 0) {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }

    // شكل Gemini (contents) — يدعم صور/PDF
    const geminiContents = safeMessages.map((m, i) => {
      const isLast = i === safeMessages.length - 1;
      const parts = [{ text: m.content || '' }];
      if (isLast && image) {
        const base64Data = image.split(',')[1] || image;
        const mimeMatch = image.match(/^data:(.*?);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }
      if (isLast && pdfFile) {
        const base64Data = pdfFile.split(',')[1] || pdfFile;
        parts.push({ inline_data: { mime_type: 'application/pdf', data: base64Data } });
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    // شكل Groq/OpenAI (messages) — نصوص فقط
    const plainMessages = safeMessages.map((m) => ({ role: m.role, content: m.content || '' }));

    const { streamGemini } = await import('../services/providers/gemini.js');
    const { streamGroq } = await import('../services/providers/groq.js');

    // نستبعد أي مرشّح من مزوّد لا يدعم متطلبات هذا الطلب (صور/PDF/بحث)
    const eligibleChain = fallbackChain.filter((candidate) => {
      if (candidate.provider === 'groq' && hasMultimodal) return false;
      return true;
    });

    // ===== أدوات التنفيذ (Function Calling v1) - Gemini/Groq فقط، وبدون تعارض مع بحث الويب =====
    const MAX_TOOL_CALLS = 3;
    const registeredTools = getAllTools();

    async function* runProviderWithTools(candidate) {
      let localGeminiContents = geminiContents.map((c) => ({ ...c, parts: [...c.parts] }));
      let localPlainMessages = [...plainMessages];
      let toolCallCount = 0;

      while (true) {
        const supportsTools = (candidate.provider === 'gemini' || candidate.provider === 'groq')
          && !webSearchEnabled && toolCallCount < MAX_TOOL_CALLS;

        let gen;
        if (candidate.provider === 'gemini') {
          const geminiTools = webSearchEnabled ? tools : (supportsTools ? toGeminiToolsFormat(registeredTools) : undefined);
          gen = streamGemini({ modelId: candidate.model, contents: localGeminiContents, systemPrompt, tools: geminiTools });
        } else if (candidate.provider === 'groq') {
          const groqTools = supportsTools ? toGroqToolsFormat(registeredTools) : undefined;
          gen = streamGroq({ modelId: candidate.model, messages: localPlainMessages, systemPrompt, tools: groqTools });
        } else if (candidate.provider === 'openai') {
          const { streamOpenAI } = await import('../services/providers/openai.js');
          gen = streamOpenAI({ modelId: candidate.model, messages: localPlainMessages, systemPrompt });
        } else if (candidate.provider === 'claude') {
          const { streamClaude } = await import('../services/providers/claude.js');
          gen = streamClaude({ modelId: candidate.model, messages: localPlainMessages, systemPrompt });
        } else {
          const err = new Error(`Unknown provider: ${candidate.provider}`);
          err.isTransient = false;
          throw err;
        }

        let sawToolCall = null;
        let sawAnyOutput = false;

        for await (const chunk of gen) {
          sawAnyOutput = true;
          if (chunk.type === 'toolCall' && !sawToolCall) {
            sawToolCall = chunk.value;
            break;
          }
          yield chunk;
        }

        if (!sawAnyOutput) {
          const err = new Error('Empty stream from provider');
          err.isTransient = true;
          throw err;
        }

        if (!sawToolCall) return;

        toolCallCount++;
        const outcome = await executeToolCall(sawToolCall, req.userId);

        if (candidate.provider === 'gemini') {
          localGeminiContents.push({
            role: 'model',
            parts: [{
              functionCall: { name: sawToolCall.name, args: sawToolCall.args },
              ...(sawToolCall.thoughtSignature ? { thoughtSignature: sawToolCall.thoughtSignature } : {}),
            }],
          });
          localGeminiContents.push({ role: 'user', parts: [{ functionResponse: { name: sawToolCall.name, response: outcome } }] });
        } else if (candidate.provider === 'groq') {
          const callId = sawToolCall.id || `call_${toolCallCount}`;
          localPlainMessages.push({ role: 'assistant', content: null, tool_calls: [{ id: callId, type: 'function', function: { name: sawToolCall.name, arguments: JSON.stringify(sawToolCall.args || {}) } }] });
          localPlainMessages.push({ role: 'tool', tool_call_id: callId, content: JSON.stringify(outcome) });
        }
      }
    }

    let activeStream = null;
    let lastError = null;

    for (const candidate of eligibleChain) {
      try {
        const gen = runProviderWithTools(candidate);
        const firstChunk = await gen.next(); // نتأكد من نجاح أول استجابة قبل الالتزام بهذا المزوّد
        activeStream = (async function* () {
          if (!firstChunk.done) yield firstChunk.value;
          yield* gen;
        })();
        break;
      } catch (err) {
        console.error(`Provider "${candidate.provider}/${candidate.model}" failed (status ${err.status}):`, JSON.stringify(err.providerBody));
        lastError = err;
        if (!err.isTransient) break;
      }
    }
// استهلاك حصة chat فقط بعد التأكد أن هناك مزوّد فعلي جاهز للرد
    if (activeStream) {
      await consumeQuota(req.userId, 'chat');
      if (webSearchEnabled) await consumeQuota(req.userId, 'web_search');
    }
    if (!activeStream) {
      console.error('All providers in fallback chain failed.', lastError?.status);
      const isQuota = lastError?.status === 429;
      const userMessage = isQuota
        ? (lang === 'en' ? 'AI quota has been temporarily exhausted. Please try again in a few minutes.' : 'تم استنفاد حصة الذكاء الاصطناعي مؤقتًا، يرجى المحاولة بعد قليل.')
        : (lang === 'en' ? 'The AI service is temporarily unavailable. Please try again shortly.' : 'خدمة الذكاء الاصطناعي غير متاحة مؤقتًا، يرجى المحاولة بعد قليل.');
      return res.status(isQuota ? 429 : 503).json({ error: userMessage, code: isQuota ? 'QUOTA_EXCEEDED' : 'AI_UNAVAILABLE' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    let fullReplyText = '';
    let lastGroundingMetadata = null;
    let wasTruncated = false;

    for await (const chunk of activeStream) {
      if (chunk.type === 'text') {
        res.write(chunk.value);
        fullReplyText += chunk.value;
      } else if (chunk.type === 'grounding') {
        lastGroundingMetadata = chunk.value;
      } else if (chunk.type === 'truncated') {
        wasTruncated = true;
      }
    }

    // نرسل دائمًا إشارة واضحة: هل استند هذا الرد لبحث فعلي أم لا —
    // بغض النظر عن المزوّد المستخدم، حتى يبقى التصميم عامًا وقابلاً للتوسع
    const sources = lastGroundingMetadata ? extractSources(lastGroundingMetadata) : [];
    const usedSearch = webSearchEnabled && !!lastGroundingMetadata;
    res.write(`\n\n__META__${JSON.stringify({ usedSearch, sources, truncated: wasTruncated })}`);

    res.end();

    // استخراج وتطبيق أي تغييرات على الذاكرة (إضافة/تحديث/حذف) بالخلفية، بعد إرسال الرد
    const lastUserMessage = safeMessages[safeMessages.length - 1]?.content || '';
    extractFacts(lastUserMessage, fullReplyText, userFacts)
      .then((actions) => {
        if (actions.length) applyFactActions(req.userId, actions);
      })
      .catch((err) => console.error('Memory update error:', err));

  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    } else {
      res.end();
    }
  }
});
router.get('/chats', authMiddleware, async (req, res) => {
  const chats = await getUserChats(req.userId);
  res.json({ chats });
});

router.post('/chats', authMiddleware, async (req, res) => {
  const { id, title, assistantId, projectId } = req.body;
  await createChat(req.userId, id, title, assistantId || null, projectId || null);
  res.json({ success: true });
});

router.patch('/chats/:id', authMiddleware, async (req, res) => {
  const { title, pinned, archived } = req.body;
  if (title !== undefined) await updateChatTitle(req.params.id, title);
  if (pinned !== undefined || archived !== undefined) {
    const flags = {};
    if (pinned !== undefined) flags.pinned = pinned;
    if (archived !== undefined) flags.archived = archived;
    await updateChatFlags(req.params.id, flags);
  }
  res.json({ success: true });
});

router.delete('/chats/:id', authMiddleware, async (req, res) => {
  await deleteChat(req.params.id);
  res.json({ success: true });
});

router.post('/chats/:id/messages', authMiddleware, async (req, res) => {
  const { role, content } = req.body;
  const message = await addMessage(req.params.id, role, content);
  res.json({ success: true, message });
});

router.patch('/chats/:chatId/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const owner = await getChatOwner(req.params.chatId);
    if (owner !== req.userId) return res.status(404).json({ error: 'المحادثة غير موجودة' });
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'النص مطلوب' });
    const updated = await updateMessageContent(req.params.messageId, content.trim());
    res.json({ message: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/chats/:chatId/messages/:messageId/after', authMiddleware, async (req, res) => {
  try {
    const owner = await getChatOwner(req.params.chatId);
    if (owner !== req.userId) return res.status(404).json({ error: 'المحادثة غير موجودة' });
    await deleteMessagesAfter(req.params.chatId, req.params.messageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/chats/:chatId/messages/:messageId/from', authMiddleware, async (req, res) => {
  try {
    const owner = await getChatOwner(req.params.chatId);
    if (owner !== req.userId) return res.status(404).json({ error: 'المحادثة غير موجودة' });
    await deleteMessagesFromIncluding(req.params.chatId, req.params.messageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/memory', authMiddleware, async (req, res) => {
  const facts = await getUserFacts(req.userId);
  res.json({ facts });
});
router.patch('/memory/:id', authMiddleware, async (req, res) => {
  const { fact, category } = req.body;
  if (!fact || !fact.trim()) return res.status(400).json({ error: 'النص مطلوب' });
  try {
    const updated = await updateFact(req.userId, req.params.id, { fact: fact.trim(), category: category || 'general' });
    res.json({ fact: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/memory/:id', authMiddleware, async (req, res) => {
  try {
    await deleteFact(req.userId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/memory/:id/pin', authMiddleware, async (req, res) => {
  const { pinned } = req.body;
  try {
    const updated = await setPinned(req.userId, req.params.id, pinned);
    res.json({ fact: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/memory', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { error } = await withRetry(() =>
    supabase.from('memory_facts').delete().eq('user_id', req.userId)
  );
  if (error) return res.status(500).json({ error: 'فشل حذف الذاكرة' });
  res.json({ success: true });
});
router.get('/personalization', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { data, error } = await withRetry(() =>
    supabase
      .from('personalization')
      .select('*')
      .eq('user_id', req.userId)
      .maybeSingle()
  );

  if (error) {
    console.error('Personalization GET error (after retries):', error);
    return res.status(500).json({ error: error.message || 'فشل تحميل بيانات التخصيص' });
  }

  res.json({
    data: data || {
      preferred_name: '',
      occupation: '',
      about_you: '',
      custom_instructions: '',
      style: 'default',
    },
  });
});
router.put('/personalization', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { preferred_name, occupation, about_you, custom_instructions, style } = req.body;

  const { data, error } = await withRetry(() =>
    supabase
      .from('personalization')
      .upsert({
        user_id: req.userId,
        preferred_name: preferred_name ?? '',
        occupation: occupation ?? '',
        about_you: about_you ?? '',
        custom_instructions: custom_instructions ?? '',
        style: style ?? 'default',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
  );

  if (error) {
    console.error('Personalization PUT error (after retries):', error);
    return res.status(500).json({ error: error.message || 'فشل حفظ بيانات التخصيص' });
  }

  res.json({ data });
});
router.delete('/chats/all', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { error } = await withRetry(() =>
    supabase.from('chats').delete().eq('user_id', req.userId)
  );
  if (error) {
    console.error('Delete all chats error (after retries):', error);
    return res.status(500).json({ error: 'فشل حذف المحادثات' });
  }
  res.json({ success: true });
});
router.get('/chats/export', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');

  const { data: chats, error: chatsError } = await withRetry(() =>
    supabase
      .from('chats')
      .select('id, title, created_at')
      .eq('user_id', req.userId)
  );

  if (chatsError) {
    console.error('Export chats error (after retries):', chatsError);
    return res.status(500).json({ error: 'فشل تصدير المحادثات' });
  }

  const chatIds = (chats || []).map((c) => c.id);
  let messages = [];

  if (chatIds.length > 0) {
    const { data: msgs, error: msgsError } = await withRetry(() =>
      supabase
        .from('messages')
        .select('chat_id, role, content, created_at')
        .in('chat_id', chatIds)
    );

    if (msgsError) {
      console.error('Export messages error (after retries):', msgsError);
      return res.status(500).json({ error: 'فشل تصدير الرسائل' });
    }
    messages = msgs || [];
  }

  const exportData = (chats || []).map((chat) => ({
    title: chat.title,
    created_at: chat.created_at,
    messages: messages
      .filter((m) => m.chat_id === chat.id)
      .map((m) => ({ role: m.role, content: m.content, created_at: m.created_at })),
  }));

  res.json({ exported_at: new Date().toISOString(), chats: exportData });
});
router.get('/settings/chat', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { data, error } = await withRetry(() =>
    supabase
      .from('chat_settings')
      .select('*')
      .eq('user_id', req.userId)
      .maybeSingle()
  );

  if (error) {
    console.error('Get chat settings error (after retries):', error);
    return res.status(500).json({ error: 'فشل تحميل إعدادات المحادثة' });
  }

  res.json({ data: data || { auto_rename: true } });
});

router.put('/settings/chat', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { auto_rename } = req.body;

  const { data, error } = await withRetry(() =>
    supabase
      .from('chat_settings')
      .upsert({
        user_id: req.userId,
        auto_rename: auto_rename ?? true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
  );

  if (error) {
    console.error('Update chat settings error (after retries):', error);
    return res.status(500).json({ error: 'فشل حفظ إعدادات المحادثة' });
  }

  res.json({ data });
});
router.get('/settings/ai', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { data, error } = await withRetry(() =>
    supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', req.userId)
      .maybeSingle()
  );

  if (error) {
    console.error('Get AI settings error (after retries):', error);
    return res.status(500).json({ error: 'فشل تحميل إعدادات الذكاء الاصطناعي' });
  }

  res.json({ data: data || { model_tier: 'fast' } });
});

router.put('/settings/ai', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { model_tier, dialect } = req.body;

  if (dialect && !['msa', 'palestinian', 'egyptian', 'syrian', 'lebanese', 'khaleeji'].includes(dialect)) {
    return res.status(400).json({ error: 'لهجة غير صالحة' });
  }

  const { ACTIVE_TIERS, DEFAULT_TIER } = await import('../services/modelRegistry.js');
  if (!ACTIVE_TIERS.includes(model_tier)) {
    return res.status(400).json({ error: 'نموذج غير صالح' });
  }

  // اختيار موديل يدوي غير الافتراضي يتطلب صلاحية model_selection (عادة Pro)
  if (model_tier !== DEFAULT_TIER) {
    const modelSelectionEntitlement = await checkEntitlement(req.userId, 'model_selection');
    if (!modelSelectionEntitlement.allowed) {
      return res.status(403).json({ error: 'اختيار الموديل يدويًا متاح فقط لمشتركي Pro', code: 'FEATURE_LOCKED' });
    }
    // نتأكد أيضًا أن هذا الموديل بالتحديد مسموح ضمن plan_feature_models لخطة المستخدم
    const modelAllowed = await checkEntitlement(req.userId, 'chat', model_tier);
    if (!modelAllowed.allowed) {
      return res.status(403).json({ error: 'هذا النموذج غير متاح ضمن خطتك الحالية', code: 'MODEL_NOT_ALLOWED' });
    }
  }

  const { data, error } = await withRetry(() =>
    supabase
      .from('ai_settings')
      .upsert({
        user_id: req.userId,
        model_tier,
        ...(dialect ? { dialect } : {}),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
  );

  if (error) {
    console.error('Update AI settings error (after retries):', error);
    return res.status(500).json({ error: 'فشل حفظ إعدادات الذكاء الاصطناعي' });
  }

  res.json({ data });
});
router.get('/settings/websearch', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { data, error } = await withRetry(() =>
    supabase
      .from('ai_settings')
      .select('web_search_enabled')
      .eq('user_id', req.userId)
      .maybeSingle()
  );

  if (error) {
    console.error('Get web search settings error (after retries):', error);
    return res.status(500).json({ error: 'فشل تحميل إعدادات البحث' });
  }

  res.json({ enabled: data?.web_search_enabled ?? false });
});

router.put('/settings/websearch', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { enabled } = req.body;

  const { data, error } = await withRetry(() =>
    supabase
      .from('ai_settings')
      .upsert({
        user_id: req.userId,
        web_search_enabled: !!enabled,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
  );

  if (error) {
    console.error('Update web search settings error (after retries):', error);
    return res.status(500).json({ error: 'فشل حفظ إعدادات البحث' });
  }

  res.json({ enabled: data.web_search_enabled });
});
router.get('/data/export', authMiddleware, async (req, res) => {
  try {
    const { supabase } = await import('../services/supabaseClient.js');

    const [
      userResult,
      personalizationResult,
      chatSettingsResult,
      aiSettingsResult,
      memoryResult,
      chatsResult,
      filesResult,
    ] = await Promise.all([
      withRetry(() => supabase.from('users').select('id, email, name').eq('id', req.userId).maybeSingle()),
      withRetry(() => supabase.from('personalization').select('*').eq('user_id', req.userId).maybeSingle()),
      withRetry(() => supabase.from('chat_settings').select('*').eq('user_id', req.userId).maybeSingle()),
      withRetry(() => supabase.from('ai_settings').select('*').eq('user_id', req.userId).maybeSingle()),
      withRetry(() => supabase.from('memory_facts').select('fact, created_at').eq('user_id', req.userId)),
      withRetry(() => supabase.from('chats').select('id, title, created_at').eq('user_id', req.userId)),
      withRetry(() => supabase.from('files').select('name, type, size, created_at').eq('user_id', req.userId)),
    ]);

    const chatIds = (chatsResult.data || []).map((c) => c.id);
    let messagesData = [];
    if (chatIds.length > 0) {
      const { data } = await withRetry(() =>
        supabase.from('messages').select('chat_id, role, content, created_at').in('chat_id', chatIds)
      );
      messagesData = data || [];
    }

    const chatsWithMessages = (chatsResult.data || []).map((chat) => ({
      title: chat.title,
      created_at: chat.created_at,
      messages: messagesData
        .filter((m) => m.chat_id === chat.id)
        .map((m) => ({ role: m.role, content: m.content, created_at: m.created_at })),
    }));

    const exportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: userResult.data
        ? { email: userResult.data.email, name: userResult.data.name }
        : {},
      personalization: personalizationResult.data || {},
      settings: {
        chat: chatSettingsResult.data || {},
        ai: aiSettingsResult.data || {},
      },
      memory: (memoryResult.data || []).map((f) => f.fact),
      chats: chatsWithMessages,
      files: (filesResult.data || []).map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        created_at: f.created_at,
      })),
    };

    res.json(exportPayload);
  } catch (err) {
    console.error('Export all data error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تجهيز بياناتك' });
  }
});
router.get('/settings/voice', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { data, error } = await withRetry(() =>
    supabase.from('voice_settings').select('*').eq('user_id', req.userId).maybeSingle()
  );
  if (error) {
    console.error('Get voice settings error (after retries):', error);
    return res.status(500).json({ error: 'فشل تحميل إعدادات الصوت' });
  }
  res.json({ data: data || { voice_name: '', rate: 1.0, pitch: 1.0 } });
});

router.put('/settings/voice', authMiddleware, async (req, res) => {
  const { supabase } = await import('../services/supabaseClient.js');
  const { voice_name, rate, pitch } = req.body;
  const { data, error } = await withRetry(() =>
    supabase
      .from('voice_settings')
      .upsert({
        user_id: req.userId,
        voice_name: voice_name ?? '',
        rate: rate ?? 1.0,
        pitch: pitch ?? 1.0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
  );
  if (error) {
    console.error('Update voice settings error (after retries):', error);
    return res.status(500).json({ error: 'فشل حفظ إعدادات الصوت' });
  }
  res.json({ data });
});
router.post('/generate-image', authMiddleware, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'الوصف مطلوب' });
    }

    const entitlement = await checkEntitlement(req.userId, 'image_generation', 'gemini_image');
    if (!entitlement.allowed) {
      const msg = entitlement.enabled === false
        ? 'توليد الصور متاح فقط لمشتركي Pro.'
        : 'وصلت للحد الشهري من توليد الصور.';
      return res.status(entitlement.enabled === false ? 403 : 429).json({ error: msg, code: 'QUOTA_EXCEEDED', entitlement });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${config.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    if (data.error) {
      console.error('Image generation error:', JSON.stringify(data.error));
      return res.status(500).json({ error: 'فشل توليد الصورة' });
    }

    const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inline_data || p.inlineData);
    const imageData = imagePart?.inline_data || imagePart?.inlineData;
    if (!imageData) {
      return res.status(500).json({ error: 'لم يتم إنشاء صورة' });
    }

    await consumeQuota(req.userId, 'image_generation', 'gemini_image');
    res.json({ image: `data:${imageData.mime_type || imageData.mimeType};base64,${imageData.data}` });
  } catch (err) {
    console.error('Generate image error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});
export default router;