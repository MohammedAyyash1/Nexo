import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { getSearchTool, extractSources } from '../services/searchProvider.js';
import { createCheckRecord, completeCheck, failCheck, getUserChecks, deleteCheck, deleteAllUserChecks } from '../services/newsCheckService.js';

const router = express.Router();
const MAX_TEXT_LENGTH = 1000;

router.post('/news-check', authMiddleware, async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'الرجاء إدخال الخبر أو الرابط' });
    if (text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: 'النص طويل جدًا' });

    const record = await createCheckRecord({ userId: req.userId, inputText: text.trim() });

    const prompt = lang === 'en'
      ? `Fact-check this news claim or article using web search. Search for reliable, recent sources. Then respond in EXACTLY this format:\nVERDICT: [one of: likely_true, likely_false, misleading, unverified]\nEXPLANATION: [2-4 sentences explaining your assessment based on what you found]\n\nClaim: ${text.trim()}`
      : `تحقق من مصداقية هذا الخبر أو الادعاء باستخدام البحث بالويب. ابحث عن مصادر موثوقة وحديثة. ثم أجب بهذا التنسيق بالضبط:\nVERDICT: [واحد من: likely_true, likely_false, misleading, unverified]\nEXPLANATION: [شرح بجملتين إلى أربع جمل بناءً على ما وجدته]\n\nالادعاء: ${text.trim()}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: getSearchTool('google'),
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    if (geminiData.error) {
      console.error('News check AI error:', JSON.stringify(geminiData.error));
      await failCheck(record.id, 'فشل التحقق');
      return res.status(502).json({ error: 'فشل التحقق من الخبر، حاول مرة أخرى' });
    }

    const responseText = geminiData.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const verdictMatch = responseText.match(/VERDICT:\s*(\w+)/i);
    const explanationMatch = responseText.match(/EXPLANATION:\s*([\s\S]*)/i);

    const verdict = verdictMatch ? verdictMatch[1].toLowerCase() : 'unverified';
    const explanation = explanationMatch ? explanationMatch[1].trim() : responseText.trim();
    const groundingMetadata = geminiData.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata ? extractSources(groundingMetadata) : [];

    const completed = await completeCheck(record.id, { verdict, explanation, sources });
    res.json({ check: completed });
  } catch (err) {
    console.error('News check error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/news-check/history', authMiddleware, async (req, res) => {
  const items = await getUserChecks(req.userId);
  res.json({ items });
});

router.delete('/news-check/history', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserChecks(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/news-check/history/:id', authMiddleware, async (req, res) => {
  try {
    await deleteCheck(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;