import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { createExtraction, completeExtraction, failExtraction, getUserExtractions, deleteExtraction, deleteAllUserExtractions, attachImageUrl } from '../services/ocrService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

router.post('/ocr/extract', authMiddleware, (req, res) => {
  upload.single('image')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'الصورة كبيرة جدًا. الحد الأقصى 15MB' });
      return res.status(400).json({ error: 'فشل رفع الصورة' });
    }

    try {
      if (!req.file) return res.status(400).json({ error: 'الرجاء رفع صورة' });
      if (!SUPPORTED_IMAGE_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'صيغة الصورة غير مدعومة. استخدم JPG, PNG أو WEBP' });
      }

      const { supabase } = await import('../services/supabaseClient.js');
      const ext = req.file.mimetype.split('/')[1];
      const storagePath = `${req.userId}/ocr-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('user-files').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });
      if (uploadError) {
        console.error('OCR image upload error:', uploadError);
        return res.status(500).json({ error: 'فشل رفع الصورة' });
      }

      const record = await createExtraction({ userId: req.userId, sourceImagePath: storagePath });

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: 'استخرج كل النص الموجود بهذه الصورة بالضبط كما هو مكتوب، بدون أي إضافة أو تعليق أو ترجمة. إذا لم يوجد أي نص بالصورة، أجب فقط بكلمة: لا_يوجد_نص' },
                { inline_data: { mime_type: req.file.mimetype, data: req.file.buffer.toString('base64') } },
              ],
            }],
          }),
        }
      );

      const geminiData = await geminiResponse.json();
      if (geminiData.error) {
        console.error('OCR extraction error:', JSON.stringify(geminiData.error));
        await failExtraction(record.id, 'فشل استخراج النص');
        return res.status(502).json({ error: 'فشل استخراج النص، حاول مرة أخرى' });
      }

      const extractedText = geminiData.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() || '';
      if (!extractedText || extractedText === 'لا_يوجد_نص') {
        await failExtraction(record.id, 'لم يتم العثور على أي نص بهذه الصورة');
        return res.status(400).json({ error: 'لم يتم العثور على أي نص بهذه الصورة' });
      }

      const completed = await completeExtraction(record.id, extractedText);
      res.json({ extraction: attachImageUrl(completed) });
    } catch (err) {
      console.error('OCR extract error:', err);
      res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
  });
});

router.get('/ocr/history', authMiddleware, async (req, res) => {
  const items = await getUserExtractions(req.userId);
  res.json({ items: items.map(attachImageUrl) });
});

router.delete('/ocr/history', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserExtractions(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/ocr/history/:id', authMiddleware, async (req, res) => {
  try {
    await deleteExtraction(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;