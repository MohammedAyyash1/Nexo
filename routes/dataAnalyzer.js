import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { computeStats } from '../services/dataStats.js';
import { createAnalysis, completeAnalysis, failAnalysis, getUserAnalyses, deleteAnalysis, deleteAllUserAnalyses } from '../services/dataAnalyzerService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const MAX_ROWS = 50000;

function parseFile(buffer, mimetype, originalName) {
  if (mimetype === 'text/csv' || originalName.endsWith('.csv')) {
    const text = buffer.toString('utf8');
    const workbook = XLSX.read(text, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

router.post('/data-analyzer/analyze', authMiddleware, (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'الملف كبير جدًا. الحد الأقصى 20MB' });
      return res.status(400).json({ error: 'فشل رفع الملف' });
    }

    try {
      if (!req.file) return res.status(400).json({ error: 'الرجاء رفع ملف CSV أو Excel' });
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

      let rows;
      try {
        rows = parseFile(req.file.buffer, req.file.mimetype, originalName.toLowerCase());
      } catch (parseErr) {
        return res.status(400).json({ error: 'تعذّر قراءة الملف. تأكد أنه CSV أو Excel صالح' });
      }

      if (!rows.length) return res.status(400).json({ error: 'الملف فارغ أو بدون بيانات قابلة للقراءة' });
      if (rows.length > MAX_ROWS) rows = rows.slice(0, MAX_ROWS);

      const record = await createAnalysis({ userId: req.userId, fileName: originalName });
      const stats = computeStats(rows);
      const columnCount = Object.keys(stats).length;

      const { lang } = req.body;
      const statsForPrompt = JSON.stringify(stats).slice(0, 8000);
      const prompt = lang === 'en'
        ? `Here are computed statistics for a dataset with ${rows.length} rows and ${columnCount} columns:\n${statsForPrompt}\n\nWrite a short analysis (4-6 sentences): notable patterns, outliers, or insights a business/data person would care about. Be specific using the actual numbers given.`
        : `هذه إحصائيات محسوبة لبيانات فيها ${rows.length} صف و${columnCount} عمود:\n${statsForPrompt}\n\nاكتب تحليلًا مختصرًا (4-6 جمل): أنماط ملحوظة، قيم شاذة، أو ملاحظات تهم صاحب القرار. كن محددًا باستخدام الأرقام الفعلية المعطاة.`;

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
      });

      const data = await groqResponse.json();
      let insights = '';
      if (data.error) {
        console.error('Data analyzer AI error:', JSON.stringify(data.error));
        insights = lang === 'en' ? 'AI insights unavailable right now, but statistics below are accurate.' : 'الملاحظات الذكية غير متاحة حاليًا، لكن الإحصائيات أدناه دقيقة وفعلية.';
      } else {
        insights = data.choices?.[0]?.message?.content?.trim() || '';
      }

      const completed = await completeAnalysis(record.id, { rowCount: rows.length, columnCount, stats, insights });
      res.json({ analysis: completed });
    } catch (err) {
      console.error('Data analyzer error:', err);
      res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
  });
});

router.get('/data-analyzer/history', authMiddleware, async (req, res) => {
  const items = await getUserAnalyses(req.userId);
  res.json({ items });
});

router.delete('/data-analyzer/history', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserAnalyses(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/data-analyzer/history/:id', authMiddleware, async (req, res) => {
  try {
    await deleteAnalysis(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;