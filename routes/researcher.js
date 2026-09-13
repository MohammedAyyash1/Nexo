import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { getSearchTool, extractSources } from '../services/searchProvider.js';
import { createReport, completeReport, failReport, getUserReports, deleteReport, deleteAllUserReports } from '../services/researcherService.js';

const router = express.Router();
const MAX_QUERY_LENGTH = 500;

router.post('/researcher/run', authMiddleware, async (req, res) => {
  try {
    const { query, lang } = req.body;
    if (!query || !query.trim()) return res.status(400).json({ error: 'الرجاء إدخال سؤال البحث' });
    if (query.length > MAX_QUERY_LENGTH) return res.status(400).json({ error: 'السؤال طويل جدًا' });

    const record = await createReport({ userId: req.userId, query: query.trim() });

    const prompt = lang === 'en'
      ? `Research this question thoroughly using web search. Write a well-organized report with headers covering: overview, key facts, different perspectives if relevant, and a conclusion. Be factual and cite what you find.\n\nQuestion: ${query.trim()}`
      : `ابحث بعمق حول هذا السؤال باستخدام البحث بالويب. اكتب تقريرًا منظمًا بعناوين يغطي: نظرة عامة، حقائق أساسية، وجهات نظر مختلفة إن وُجدت، وخلاصة. كن دقيقًا واعتمد على ما تجده فعليًا.\n\nالسؤال: ${query.trim()}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: getSearchTool('google'),
          generationConfig: { maxOutputTokens: 3000 },
        }),
      }
    );

    const data = await geminiResponse.json();
    if (data.error) { await failReport(record.id); return res.status(502).json({ error: 'فشل البحث، حاول مرة أخرى' }); }

    const reportText = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata ? extractSources(groundingMetadata) : [];

    if (!reportText.trim()) { await failReport(record.id); return res.status(502).json({ error: 'لم نتمكن من إعداد تقرير لهذا السؤال' }); }

    const completed = await completeReport(record.id, { reportText, sources });
    res.json({ report: completed });
  } catch (err) {
    console.error('Researcher error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/researcher/reports', authMiddleware, async (req, res) => {
  res.json({ reports: await getUserReports(req.userId) });
});

router.delete('/researcher/reports', authMiddleware, async (req, res) => {
  try { await deleteAllUserReports(req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/researcher/reports/:id', authMiddleware, async (req, res) => {
  try { await deleteReport(req.params.id, req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;