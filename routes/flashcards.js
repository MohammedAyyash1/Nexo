import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { createSet, completeSet, failSet, getUserSets, deleteSet, deleteAllUserSets } from '../services/flashcardService.js';

const router = express.Router();
const MAX_TEXT_LENGTH = 10000;

function parseJsonArray(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { return null; }
}

router.post('/flashcards/generate', authMiddleware, async (req, res) => {
  try {
    const { topic, lang } = req.body;
    if (!topic || !topic.trim()) return res.status(400).json({ error: 'الرجاء إدخال موضوع أو نص' });
    if (topic.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: 'النص طويل جدًا' });

    const record = await createSet({ userId: req.userId, title: topic.trim().slice(0, 100) });

    const prompt = lang === 'en'
      ? `Generate 8-12 flashcards (front/back) about this topic or based on this text. Respond with ONLY a JSON array: [{"front":"question or term","back":"answer or definition"}]\n\nTopic/Text: ${topic.trim()}`
      : `ولّد 8-12 بطاقة تعليمية (سؤال/جواب) حول هذا الموضوع أو بناءً على هذا النص. أجب بمصفوفة JSON فقط: [{"front":"سؤال أو مصطلح","back":"جواب أو تعريف"}]\n\nالموضوع/النص: ${topic.trim()}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
    });

    const data = await groqResponse.json();
    if (data.error) { await failSet(record.id); return res.status(502).json({ error: 'فشل توليد البطاقات' }); }

    const cards = parseJsonArray(data.choices?.[0]?.message?.content || '');
    if (!cards || !cards.length) { await failSet(record.id); return res.status(502).json({ error: 'تعذّر تجهيز البطاقات' }); }

    const completed = await completeSet(record.id, cards);
    res.json({ set: completed });
  } catch (err) {
    console.error('Flashcards error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/flashcards', authMiddleware, async (req, res) => {
  res.json({ sets: await getUserSets(req.userId) });
});

router.delete('/flashcards', authMiddleware, async (req, res) => {
  try { await deleteAllUserSets(req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/flashcards/:id', authMiddleware, async (req, res) => {
  try { await deleteSet(req.params.id, req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;