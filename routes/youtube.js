import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { getYoutubeTranscript } from '../services/youtubeTranscript.js';
import { createSummaryRecord, completeSummary, failSummary, getUserSummaries, deleteSummary, deleteAllUserSummaries } from '../services/youtubeService.js';

const router = express.Router();
const MAX_TRANSCRIPT_CHARS = 50000;

const ERROR_MESSAGES = {
  invalid_youtube_url: 'الرابط غير صالح. تأكد إنه رابط يوتيوب صحيح',
  no_captions_available: 'هذا الفيديو ما إله ترجمة نصية متاحة، فما نقدر نلخصه',
};

router.post('/youtube/summarize', authMiddleware, async (req, res) => {
  try {
    const { url, lang } = req.body;
    if (!url || !url.trim()) return res.status(400).json({ error: 'رابط الفيديو مطلوب' });

    const record = await createSummaryRecord({ userId: req.userId, videoUrl: url.trim() });

    let videoTitle, transcript;
    try {
      const result = await getYoutubeTranscript(url.trim());
      videoTitle = result.videoTitle;
      transcript = result.transcript;
    } catch (transcriptErr) {
      const msg = ERROR_MESSAGES[transcriptErr.message] || 'تعذّر جلب محتوى الفيديو';
      await failSummary(record.id, msg);
      return res.status(400).json({ error: msg });
    }

    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      transcript = transcript.slice(0, MAX_TRANSCRIPT_CHARS) + ' [تم اقتطاع الباقي]';
    }

    const prompt = lang === 'en'
      ? `Summarize this YouTube video transcript. Provide: 1) A concise summary (3-5 sentences), 2) Key points as bullets. Title: "${videoTitle}"\n\nTranscript:\n${transcript}`
      : `لخّص محتوى فيديو اليوتيوب هذا. قدّم: ١) ملخص موجز (3-5 جمل)، ٢) أهم النقاط كقائمة نقطية. العنوان: "${videoTitle}"\n\nالنص:\n${transcript}`;

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
      console.error('YouTube summarize AI error:', JSON.stringify(geminiData.error));
      await failSummary(record.id, 'فشل تلخيص المحتوى');
      return res.status(502).json({ error: 'فشل تلخيص الفيديو، حاول مرة أخرى' });
    }

    const summaryText = geminiData.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const completed = await completeSummary(record.id, { videoTitle, summaryText });

    res.json({ summary: completed });
  } catch (err) {
    console.error('YouTube summarize error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/youtube/summaries', authMiddleware, async (req, res) => {
  const items = await getUserSummaries(req.userId);
  res.json({ summaries: items });
});

router.delete('/youtube/summaries', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserSummaries(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/youtube/summaries/:id', authMiddleware, async (req, res) => {
  try {
    await deleteSummary(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;