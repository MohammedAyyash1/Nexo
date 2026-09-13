import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { createConversion, completeConversion, failConversion, getUserConversions, deleteConversion, deleteAllUserConversions } from '../services/dialectService.js';

const router = express.Router();
const MAX_TEXT_LENGTH = 2000;

const DIALECT_LABELS = {
  palestinian: 'الفلسطينية', levantine: 'الشامية', gulf: 'الخليجية', egyptian: 'المصرية', iraqi: 'العراقية', maghrebi: 'المغاربية',
};

router.post('/dialect/convert', authMiddleware, async (req, res) => {
  try {
    const { text, direction, dialect } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'الرجاء إدخال النص' });
    if (text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: 'النص طويل جدًا' });
    if (!['to_fusha', 'to_dialect'].includes(direction)) return res.status(400).json({ error: 'اتجاه غير صالح' });

    const record = await createConversion({ userId: req.userId, inputText: text.trim(), direction, dialect: dialect || null });

    let prompt;
    if (direction === 'to_fusha') {
      prompt = `حوّل النص العامي التالي إلى اللغة العربية الفصحى السليمة، مع الحفاظ على المعنى والنبرة الأصلية. أرجع فقط النص المحوّل، بدون أي شرح أو مقدمة:\n\n${text.trim()}`;
    } else {
      const dialectLabel = DIALECT_LABELS[dialect] || 'الفلسطينية';
      prompt = `حوّل النص الفصيح التالي إلى اللهجة ${dialectLabel} الدارجة الطبيعية، بأسلوب يتحدث فيه الناس فعليًا بالحياة اليومية. أرجع فقط النص المحوّل، بدون أي شرح أو مقدمة:\n\n${text.trim()}`;
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
    });

    const data = await groqResponse.json();
    if (data.error) {
      console.error('Dialect conversion error:', JSON.stringify(data.error));
      await failConversion(record.id);
      return res.status(502).json({ error: 'فشل التحويل، حاول مرة أخرى' });
    }

    const outputText = data.choices?.[0]?.message?.content?.trim() || '';
    const completed = await completeConversion(record.id, outputText);
    res.json({ conversion: completed });
  } catch (err) {
    console.error('Dialect convert error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/dialect/history', authMiddleware, async (req, res) => {
  const items = await getUserConversions(req.userId);
  res.json({ items });
});

router.delete('/dialect/history', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserConversions(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/dialect/history/:id', authMiddleware, async (req, res) => {
  try {
    await deleteConversion(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;