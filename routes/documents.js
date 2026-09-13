import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { checkEntitlement, consumeQuota } from '../services/entitlementService.js';
import {
  createDocumentRecord, completeDocument, failDocument,
  getUserDocuments, deleteDocument, deleteAllUserDocuments,
} from '../services/documentsService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const MAX_EXTRACTED_CHARS = 100000;

router.post('/documents/analyze', authMiddleware, (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'الملف كبير جدًا. الحد الأقصى 50MB' });
      return res.status(400).json({ error: 'فشل رفع الملف' });
    }

    try {
      if (!req.file) return res.status(400).json({ error: 'الرجاء رفع ملف PDF أو Word' });

      const mimetype = req.file.mimetype;
      let extractedText = '';

      if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value;
      } else if (mimetype === 'application/pdf') {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: req.file.buffer });
        const result = await parser.getText();
        await parser.destroy();
        extractedText = result.text;
      } else {
        return res.status(400).json({ error: 'صيغة الملف غير مدعومة. استخدم PDF أو Word فقط' });
      }

      extractedText = extractedText.trim();
      if (!extractedText) return res.status(400).json({ error: 'لم نتمكن من استخراج أي نص من هذا الملف' });
      if (extractedText.length > MAX_EXTRACTED_CHARS) {
        extractedText = extractedText.slice(0, MAX_EXTRACTED_CHARS) + '\n\n[تم اقتطاع باقي المستند لطوله الزائد]';
      }

      const entitlement = await checkEntitlement(req.userId, 'ai_documents');
      if (!entitlement.allowed) {
        return res.status(429).json({ error: 'وصلت للحد اليومي من تحليل المستندات', code: 'QUOTA_EXCEEDED' });
      }

      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const record = await createDocumentRecord({ userId: req.userId, fileName: originalName });

      const { lang } = req.body;
      const prompt = lang === 'en'
        ? `Analyze this document and provide: 1) A concise summary (3-5 sentences), 2) Key points as a bullet list, 3) Any notable dates, numbers, or action items if present. Document:\n\n${extractedText}`
        : `حلّل هذا المستند وقدّم: ١) ملخص موجز (3-5 جمل)، ٢) أهم النقاط كقائمة نقطية، ٣) أي تواريخ أو أرقام أو إجراءات مهمة إن وُجدت. المستند:\n\n${extractedText}`;

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2048 } }),
        }
      );

      const geminiData = await geminiResponse.json();
      if (geminiData.error) {
        console.error('Document analysis AI error:', JSON.stringify(geminiData.error));
        await failDocument(record.id, geminiData.error.message || 'فشل التحليل');
        return res.status(502).json({ error: 'فشل تحليل المستند، حاول مرة أخرى' });
      }

      const summaryText = geminiData.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      const completed = await completeDocument(record.id, summaryText);
      await consumeQuota(req.userId, 'ai_documents');

      res.json({ document: completed });
    } catch (err) {
      console.error('Document analyze error:', err);
      res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
  });
});

router.get('/documents', authMiddleware, async (req, res) => {
  const docs = await getUserDocuments(req.userId);
  res.json({ documents: docs });
});

router.delete('/documents', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserDocuments(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/documents/:id', authMiddleware, async (req, res) => {
  try {
    await deleteDocument(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;