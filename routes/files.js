import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { config } from '../config/env.js';
import { authMiddleware } from '../authMiddleware.js';
import { getUserFiles, deleteFileRecord, saveFileRecord } from '../services/fileService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/transcribe', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرسال أي تسجيل صوتي' });
    }

    const { checkEntitlement, consumeQuota } = await import('../services/entitlementService.js');
    const transcriptionEntitlement = await checkEntitlement(req.userId, 'voice_transcription');
    if (!transcriptionEntitlement.allowed) {
      return res.status(429).json({ error: 'وصلت للحد اليومي من التفريغ الصوتي', code: 'QUOTA_EXCEEDED' });
    }

    const base64Audio = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/webm';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'اكتب فقط النص المسموع في هذا التسجيل الصوتي بدون أي تعليق إضافي.' },
                { inline_data: { mime_type: mimeType, data: base64Audio } },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Gemini transcription error:', data.error);
      return res.status(500).json({ error: 'حدث خطأ أثناء تحويل الصوت لنص' });
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    await consumeQuota(req.userId, 'voice_transcription');
    res.json({ text: text.trim() });
  } catch (err) {
    console.error('Transcribe error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.post('/extract-file', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرسال أي ملف' });
    }

    const mimetype = req.file.mimetype;
    let text = '';

    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else if (mimetype === 'application/pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: req.file.buffer });
      const result = await parser.getText();
      await parser.destroy();
      text = result.text;
    } else {
      return res.status(400).json({ error: 'نوع الملف غير مدعوم هنا' });
    }

    const MAX_CHARS = 500000;
    let finalText = text.trim();
    if (finalText.length > MAX_CHARS) {
      finalText = finalText.slice(0, MAX_CHARS) + '\n\n[...تم اقتطاع باقي الملف لطوله الزائد...]';
    }

    res.json({ text: finalText });
  } catch (err) {
    console.error('File extraction error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء قراءة الملف' });
  }
});
router.post('/files/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرسال أي ملف' });
    }

    const { checkEntitlement, consumeQuota } = await import('../services/entitlementService.js');
    const uploadEntitlement = await checkEntitlement(req.userId, 'file_upload');
    if (!uploadEntitlement.allowed) {
      return res.status(429).json({ error: 'وصلت للحد اليومي من رفع الملفات', code: 'QUOTA_EXCEEDED' });
    }

    const { chatId } = req.body;
    const { supabase } = await import('../services/supabaseClient.js');

    // إصلاح ترميز اسم الملف (Multer أحيانًا بيقرأ الأسماء غير الإنجليزية بترميز خاطئ)
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const fileExt = originalName.split('.').pop();
    const storagePath = `${req.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'فشل رفع الملف' });
    }

    const fileRecord = await saveFileRecord({
      userId: req.userId,
      chatId: chatId || null,
      name: originalName,
      type: req.file.mimetype,
      size: req.file.size,
      storagePath,
    });

    await consumeQuota(req.userId, 'file_upload');
    res.json({ file: fileRecord });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});
router.get('/files', authMiddleware, async (req, res) => {
  const files = await getUserFiles(req.userId);
  res.json({ files });
});

router.delete('/files/:id', authMiddleware, async (req, res) => {
  try {
    await deleteFileRecord(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;