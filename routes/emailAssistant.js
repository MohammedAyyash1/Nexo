import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { createDraft, completeDraft, failDraft, getUserDrafts, deleteDraft, deleteAllUserDrafts } from '../services/emailAssistantService.js';

const router = express.Router();
const MAX_TEXT_LENGTH = 3000;

const TONE_LABELS_AR = { formal: 'رسمي', friendly: 'ودود', direct: 'مباشر ومختصر', persuasive: 'إقناعي' };
const TONE_LABELS_EN = { formal: 'Formal', friendly: 'Friendly', direct: 'Direct and concise', persuasive: 'Persuasive' };

router.post('/email-assistant/generate', authMiddleware, async (req, res) => {
  try {
    const { mode, tone, text, lang } = req.body;
    if (!['compose', 'reply', 'improve'].includes(mode)) return res.status(400).json({ error: 'نوع غير صالح' });
    if (!text || !text.trim()) return res.status(400).json({ error: 'الرجاء إدخال النص' });
    if (text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: 'النص طويل جدًا' });

    const record = await createDraft({ userId: req.userId, mode, tone, inputText: text.trim() });
    const toneLabel = lang === 'en' ? (TONE_LABELS_EN[tone] || 'Neutral') : (TONE_LABELS_AR[tone] || 'محايد');

    let prompt;
    if (mode === 'compose') {
      prompt = lang === 'en'
        ? `Write a professional email based on this goal/context, with a ${toneLabel} tone. Respond with ONLY a JSON object: {"subject": "...", "body": "..."}\n\nGoal: ${text.trim()}`
        : `اكتب إيميلًا احترافيًا بناءً على هذا الهدف/السياق، بنبرة ${toneLabel}. أجب بكائن JSON فقط: {"subject": "...", "body": "..."}\n\nالهدف: ${text.trim()}`;
    } else if (mode === 'reply') {
      prompt = lang === 'en'
        ? `Write a reply to this email, with a ${toneLabel} tone. Respond with ONLY a JSON object: {"subject": "...", "body": "..."}\n\nOriginal email: ${text.trim()}`
        : `اكتب ردًا على هذا الإيميل، بنبرة ${toneLabel}. أجب بكائن JSON فقط: {"subject": "...", "body": "..."}\n\nالإيميل الأصلي: ${text.trim()}`;
    } else {
      prompt = lang === 'en'
        ? `Improve and rewrite this email draft to be more professional and clear, with a ${toneLabel} tone. Keep the core message. Respond with ONLY a JSON object: {"subject": "...", "body": "..."}\n\nDraft: ${text.trim()}`
        : `حسّن وأعد صياغة مسودة الإيميل هذه لتكون أكثر احترافية ووضوحًا، بنبرة ${toneLabel}. حافظ على الرسالة الأساسية. أجب بكائن JSON فقط: {"subject": "...", "body": "..."}\n\nالمسودة: ${text.trim()}`;
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
    });

    const data = await groqResponse.json();
    if (data.error) {
      console.error('Email assistant error:', JSON.stringify(data.error));
      await failDraft(record.id);
      return res.status(502).json({ error: 'فشل توليد الإيميل، حاول مرة أخرى' });
    }

    let parsed;
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    } catch (e) {
      parsed = {};
    }
    if (!parsed.body) {
      await failDraft(record.id);
      return res.status(502).json({ error: 'حدث خطأ أثناء تجهيز الإيميل' });
    }

    const completed = await completeDraft(record.id, { subject: parsed.subject || '', body: parsed.body });
    res.json({ draft: completed });
  } catch (err) {
    console.error('Email assistant error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/email-assistant/history', authMiddleware, async (req, res) => {
  const items = await getUserDrafts(req.userId);
  res.json({ items });
});

router.delete('/email-assistant/history', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserDrafts(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/email-assistant/history/:id', authMiddleware, async (req, res) => {
  try {
    await deleteDraft(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;