import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { createEntry, getUserEntries, deleteEntry, deleteAllUserEntries, searchEntries } from '../services/knowledgeBaseService.js';

const router = express.Router();
const MAX_CONTENT_LENGTH = 8000;

router.post('/knowledge-base/entries', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'العنوان مطلوب' });
    if (!content || !content.trim()) return res.status(400).json({ error: 'المحتوى مطلوب' });
    if (content.length > MAX_CONTENT_LENGTH) return res.status(400).json({ error: 'المحتوى طويل جدًا' });
    const entry = await createEntry({ userId: req.userId, title: title.trim(), content: content.trim() });
    res.json({ entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/knowledge-base/entries', authMiddleware, async (req, res) => {
  res.json({ entries: await getUserEntries(req.userId) });
});

router.delete('/knowledge-base/entries', authMiddleware, async (req, res) => {
  try { await deleteAllUserEntries(req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/knowledge-base/entries/:id', authMiddleware, async (req, res) => {
  try { await deleteEntry(req.params.id, req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/knowledge-base/ask', authMiddleware, async (req, res) => {
  try {
    const { question, lang } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: 'الرجاء إدخال سؤال' });

    const relevant = await searchEntries(req.userId, question.trim());
    if (!relevant.length) {
      return res.json({ answer: lang === 'en' ? "I couldn't find anything relevant in your knowledge base for this question." : 'ما لقيت أي شي بقاعدة معرفتك عنده علاقة بهالسؤال.', sources: [] });
    }

    const context = relevant.map((e) => `## ${e.title}\n${e.content}`).join('\n\n');
    const prompt = lang === 'en'
      ? `Answer this question using ONLY the following notes as context. If the notes don't fully answer it, say so.\n\nNotes:\n${context}\n\nQuestion: ${question.trim()}`
      : `أجب عن هذا السؤال بالاعتماد فقط على الملاحظات التالية. لو الملاحظات ما بتجاوب عليه بالكامل، قول هيك بوضوح.\n\nالملاحظات:\n${context}\n\nالسؤال: ${question.trim()}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await groqResponse.json();
    if (data.error) return res.status(502).json({ error: 'فشل الإجابة على السؤال' });

    const answer = data.choices?.[0]?.message?.content?.trim() || '';
    res.json({ answer, sources: relevant.map((e) => ({ id: e.id, title: e.title })) });
  } catch (err) {
    console.error('Knowledge base ask error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

export default router;