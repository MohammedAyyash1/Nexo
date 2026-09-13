import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { createSession, completeSession, failSession, getUserSessions, getSessionById, deleteSession, deleteAllUserSessions } from '../services/studyService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const MAX_SOURCE_CHARS = 30000;

function parseJsonFromText(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
}

router.post('/study/generate', authMiddleware, (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'الملف كبير جدًا. الحد الأقصى 20MB' });
      return res.status(400).json({ error: 'فشل رفع الملف' });
    }

    try {
      const { topic, pastedText, lang } = req.body;
      let sourceText = '';
      let title = topic || t_fallback(lang);

      function t_fallback(l) { return l === 'en' ? 'Study Session' : 'جلسة مذاكرة'; }

      if (req.file) {
        const mimetype = req.file.mimetype;
        if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.extractRawText({ buffer: req.file.buffer });
          sourceText = result.value;
        } else if (mimetype === 'application/pdf') {
          const { PDFParse } = await import('pdf-parse');
          const parser = new PDFParse({ data: req.file.buffer });
          const result = await parser.getText();
          await parser.destroy();
          sourceText = result.text;
        } else {
          return res.status(400).json({ error: 'صيغة الملف غير مدعومة. استخدم PDF أو Word' });
        }
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        title = title === t_fallback(lang) ? originalName : title;
      } else if (pastedText && pastedText.trim()) {
        sourceText = pastedText.trim();
      } else if (topic && topic.trim()) {
        sourceText = `[لا يوجد مادة مصدر - المطلوب توليد محتوى تعليمي حول الموضوع التالي مباشرة]: ${topic.trim()}`;
      } else {
        return res.status(400).json({ error: 'الرجاء رفع ملف أو لصق نص أو كتابة موضوع' });
      }

      sourceText = sourceText.trim();
      if (!sourceText) return res.status(400).json({ error: 'لم نتمكن من استخراج أي محتوى' });
      if (sourceText.length > MAX_SOURCE_CHARS) {
        sourceText = sourceText.slice(0, MAX_SOURCE_CHARS) + '\n[تم اقتطاع الباقي]';
      }

      const record = await createSession({ userId: req.userId, title: title.slice(0, 100) });

      const prompt = lang === 'en'
        ? `You are a study assistant. Based on this material, generate a JSON object with EXACTLY this structure and nothing else (no markdown, no explanation):
{"summary": "a clear 3-5 sentence summary", "keyConcepts": ["concept 1", "concept 2", ...(5-8 items)], "quiz": [{"question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "why this is correct"}] (5-8 questions)}

Material:\n${sourceText}`
        : `أنت مساعد مذاكرة. بناءً على هذه المادة، ولّد كائن JSON بهذا الشكل بالضبط ولا شي غيره (بدون markdown أو شرح):
{"summary": "ملخص واضح بـ3-5 جمل", "keyConcepts": ["مفهوم 1", "مفهوم 2", ...(5-8 عناصر)], "quiz": [{"question": "...", "options": ["أ","ب","ج","د"], "correctIndex": 0, "explanation": "سبب صحة هذه الإجابة"}] (5-8 أسئلة)}

المادة:\n${sourceText}`;

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
      });

      const data = await groqResponse.json();
      if (data.error) {
        console.error('Study generate error:', JSON.stringify(data.error));
        await failSession(record.id, 'فشل التوليد');
        return res.status(502).json({ error: 'فشل توليد المحتوى، حاول مرة أخرى' });
      }

      const rawText = data.choices?.[0]?.message?.content || '';
      const parsed = parseJsonFromText(rawText);
      if (!parsed || !parsed.summary) {
        await failSession(record.id, 'تعذّر تفسير نتيجة الذكاء الاصطناعي');
        return res.status(502).json({ error: 'حدث خطأ أثناء تجهيز المحتوى، حاول مرة أخرى' });
      }

      const completed = await completeSession(record.id, {
        summary: parsed.summary || '',
        keyConcepts: parsed.keyConcepts || [],
        quiz: parsed.quiz || [],
      });

      res.json({ session: completed });
    } catch (err) {
      console.error('Study generate error:', err);
      res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
  });
});

router.get('/study/sessions', authMiddleware, async (req, res) => {
  const items = await getUserSessions(req.userId);
  res.json({ sessions: items });
});

router.get('/study/sessions/:id', authMiddleware, async (req, res) => {
  const item = await getSessionById(req.params.id, req.userId);
  if (!item) return res.status(404).json({ error: 'غير موجودة' });
  res.json({ session: item });
});

router.delete('/study/sessions', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserSessions(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/study/sessions/:id', authMiddleware, async (req, res) => {
  try {
    await deleteSession(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;