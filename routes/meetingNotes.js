import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { createMeeting, completeMeeting, failMeeting, getUserMeetings, deleteMeeting, deleteAllUserMeetings } from '../services/meetingNotesService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const MAX_TRANSCRIPT_CHARS = 40000;

const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'video/mp4', 'audio/webm', 'video/webm',
];

function parseJsonFromText(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { return null; }
}

router.post('/meeting-notes/generate', authMiddleware, (req, res) => {
  upload.single('audio')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'الملف كبير جدًا. الحد الأقصى 25MB' });
      return res.status(400).json({ error: 'فشل رفع الملف' });
    }

    try {
      const { title, pastedTranscript, lang } = req.body;
      let transcript = '';

      if (req.file) {
        if (!SUPPORTED_AUDIO_TYPES.includes(req.file.mimetype)) {
          return res.status(400).json({ error: 'صيغة الملف غير مدعومة' });
        }
        const groqForm = new FormData();
        groqForm.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
        groqForm.append('model', 'whisper-large-v3');
        groqForm.append('response_format', 'verbose_json');

        const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.groqApiKey}` },
          body: groqForm,
        });
        const groqData = await groqResponse.json();
        if (!groqResponse.ok) {
          console.error('Meeting transcription error:', JSON.stringify(groqData));
          return res.status(502).json({ error: 'فشل تفريغ التسجيل الصوتي' });
        }
        transcript = groqData.text || '';
      } else if (pastedTranscript && pastedTranscript.trim()) {
        transcript = pastedTranscript.trim();
      } else {
        return res.status(400).json({ error: 'الرجاء رفع تسجيل صوتي أو لصق نص المحضر' });
      }

      if (!transcript.trim()) return res.status(400).json({ error: 'لم نتمكن من الحصول على أي نص من الاجتماع' });
      if (transcript.length > MAX_TRANSCRIPT_CHARS) transcript = transcript.slice(0, MAX_TRANSCRIPT_CHARS) + ' [تم اقتطاع الباقي]';

      const record = await createMeeting({ userId: req.userId, title: (title || 'اجتماع').slice(0, 100) });

      const prompt = lang === 'en'
        ? `You are a meeting assistant. Based on this meeting transcript, generate a JSON object with EXACTLY this structure and nothing else:
{"summary": "3-5 sentence summary", "keyPoints": ["point 1", ...], "actionItems": [{"task": "...", "owner": "name or Unspecified", "dueDate": "date or Unspecified"}], "decisions": ["decision 1", ...]}

Transcript:\n${transcript}`
        : `أنت مساعد اجتماعات. بناءً على محضر الاجتماع هذا، ولّد كائن JSON بهذا الشكل بالضبط ولا شي غيره:
{"summary": "ملخص بـ3-5 جمل", "keyPoints": ["نقطة 1", ...], "actionItems": [{"task": "...", "owner": "الاسم أو غير محدد", "dueDate": "التاريخ أو غير محدد"}], "decisions": ["قرار 1", ...]}

المحضر:\n${transcript}`;

      const groqResponse2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
      });

      const structData = await groqResponse2.json();
      if (structData.error) {
        console.error('Meeting structuring error:', JSON.stringify(structData.error));
        await failMeeting(record.id, 'فشل تنظيم المحضر');
        return res.status(502).json({ error: 'فشل تحليل الاجتماع، حاول مرة أخرى' });
      }

      const parsed = parseJsonFromText(structData.choices?.[0]?.message?.content || '');
      if (!parsed) {
        await failMeeting(record.id, 'تعذّر تفسير نتيجة الذكاء الاصطناعي');
        return res.status(502).json({ error: 'حدث خطأ أثناء تجهيز المحضر' });
      }

      const completed = await completeMeeting(record.id, {
        transcriptText: transcript,
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
        actionItems: parsed.actionItems || [],
        decisions: parsed.decisions || [],
      });

      res.json({ meeting: completed });
    } catch (err) {
      console.error('Meeting notes error:', err);
      res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
  });
});

router.get('/meeting-notes', authMiddleware, async (req, res) => {
  const items = await getUserMeetings(req.userId);
  res.json({ meetings: items });
});

router.delete('/meeting-notes', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserMeetings(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/meeting-notes/:id', authMiddleware, async (req, res) => {
  try {
    await deleteMeeting(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;