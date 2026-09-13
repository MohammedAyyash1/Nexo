import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { checkEntitlement, consumeQuota } from '../services/entitlementService.js';
import { saveFileRecord } from '../services/fileService.js';
import {
  createTranscriptionRecord, completeTranscription, failTranscription,
  getUserTranscriptions, deleteTranscription,
} from '../services/sttService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const SUPPORTED_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'video/mp4', 'audio/webm', 'video/webm',
];

router.post('/stt/jobs', authMiddleware, (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'الملف كبير جدًا. الحد الأقصى 25MB' });
      }
      return res.status(400).json({ error: 'فشل رفع الملف' });
    }

    try {
      if (!req.file) return res.status(400).json({ error: 'الرجاء رفع ملف صوتي أو فيديو' });
      if (!SUPPORTED_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'صيغة الملف غير مدعومة. الصيغ المدعومة: MP3, WAV, M4A, MP4, WebM' });
      }

      const entitlement = await checkEntitlement(req.userId, 'voice_transcription');
      if (!entitlement.allowed) {
        return res.status(429).json({ error: 'وصلت للحد اليومي من تفريغ الصوت', code: 'QUOTA_EXCEEDED' });
      }

      const { supabase } = await import('../services/supabaseClient.js');
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const fileExt = originalName.split('.').pop() || 'bin';
      const storagePath = `${req.userId}/stt-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });

      if (uploadError) {
        console.error('STT source upload error:', uploadError);
        return res.status(500).json({ error: 'فشل رفع الملف' });
      }

      const record = await createTranscriptionRecord({
        userId: req.userId, sourceFileName: originalName, sourceStoragePath: storagePath,
      });

      const groqForm = new FormData();
      groqForm.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), originalName);
      groqForm.append('model', 'whisper-large-v3');
      groqForm.append('response_format', 'verbose_json');

      const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.groqApiKey}` },
        body: groqForm,
      });

      const groqData = await groqResponse.json();

      if (!groqResponse.ok) {
        console.error('Groq Whisper error:', JSON.stringify(groqData));
        await failTranscription(record.id, groqData?.error?.message || 'فشل التفريغ');
        return res.status(502).json({ error: 'فشل تحويل الصوت لنص، حاول مرة أخرى' });
      }

      const transcriptText = groqData.text || '';
      const detectedLanguage = groqData.language || null;
      const completed = await completeTranscription(record.id, { transcriptText, language: detectedLanguage });
      await consumeQuota(req.userId, 'voice_transcription');

      try {
        const txtBuffer = Buffer.from(transcriptText, 'utf8');
        const txtPath = `${req.userId}/stt-transcript-${record.id}.txt`;
        await supabase.storage.from('user-files').upload(txtPath, txtBuffer, { contentType: 'text/plain' });
        await saveFileRecord({
          userId: req.userId, chatId: null, name: `${originalName} - Transcript.txt`,
          type: 'text/plain', size: txtBuffer.length, storagePath: txtPath,
        });
      } catch (libErr) {
        console.error('Save transcript to library error (non-blocking):', libErr.message);
      }

      res.json({ transcription: completed });
    } catch (err) {
      console.error('STT job error:', err);
      res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
  });
});

router.get('/stt/jobs', authMiddleware, async (req, res) => {
  const jobs = await getUserTranscriptions(req.userId);
  res.json({ jobs });
});

router.delete('/stt/jobs', authMiddleware, async (req, res) => {
  try {
    const { deleteAllUserTranscriptions } = await import('../services/sttService.js');
    await deleteAllUserTranscriptions(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/stt/jobs/:id', authMiddleware, async (req, res) => {
  try {
    await deleteTranscription(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;