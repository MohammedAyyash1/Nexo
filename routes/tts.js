import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { checkEntitlement, consumeQuota } from '../services/entitlementService.js';
import {
  createTtsRecord, completeTts, failTts, getUserTtsGenerations, deleteTtsGeneration, attachTtsAudioUrl,
} from '../services/ttsService.js';

const router = express.Router();
const MAX_TEXT_LENGTH = 200; // حد Groq/Orpheus الفعلي للنص المدخل - كان 1000 بالغلط سابقًا

const VOICES = {
  ar: { model: 'canopylabs/orpheus-arabic-saudi', options: ['fahad', 'noura'] },
  en: { model: 'canopylabs/orpheus-v1-english', options: ['troy'] },
};

// كشف بسيط للغة الفعلية للنص (نسخة الباك إند من نفس فحص الفرونت إند، كحماية إضافية)
function detectTextScript(str) {
  const arabicChars = (str.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (str.match(/[A-Za-z]/g) || []).length;
  if (arabicChars === 0 && latinChars === 0) return null;
  return arabicChars > latinChars ? 'ar' : 'en';
}

router.post('/tts/jobs', authMiddleware, async (req, res) => {
  try {
    const { text, language, voice } = req.body;

    if (!text || !text.trim()) return res.status(400).json({ error: 'النص مطلوب' });
    const trimmedText = text.trim();
    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `النص طويل جدًا (الحد الأقصى ${MAX_TEXT_LENGTH} حرف)` });
    }
    const lang = language === 'en' ? 'en' : 'ar';
    const voiceConfig = VOICES[lang];
    const selectedVoice = voiceConfig.options.includes(voice) ? voice : voiceConfig.options[0];

    const detectedScript = detectTextScript(trimmedText);
    if (detectedScript && detectedScript !== lang) {
      return res.status(400).json({
        error: 'النص المكتوب لا يبدو مطابقًا للغة المختارة، يرجى تغيير اللغة أو النص حتى لا يخرج الصوت مشوّهًا',
        code: 'LANGUAGE_MISMATCH',
      });
    }

    const entitlement = await checkEntitlement(req.userId, 'text_to_speech');
    if (!entitlement.allowed) {
      return res.status(429).json({ error: 'وصلت للحد اليومي من توليد الصوت', code: 'QUOTA_EXCEEDED' });
    }

    const record = await createTtsRecord({ userId: req.userId, inputText: trimmedText, voice: selectedVoice, language: lang });

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: voiceConfig.model, input: trimmedText, voice: selectedVoice, response_format: 'wav' }),
    });

    if (!groqResponse.ok) {
      const errBody = await groqResponse.json().catch(() => null);
      console.error('Groq TTS error:', JSON.stringify(errBody));
      await failTts(record.id, errBody?.error?.message || 'فشل توليد الصوت');
      return res.status(502).json({ error: 'فشل توليد الصوت، حاول مرة أخرى' });
    }

    const audioBuffer = Buffer.from(await groqResponse.arrayBuffer());
    const { supabase } = await import('../services/supabaseClient.js');
    const storagePath = `${req.userId}/tts-${record.id}.wav`;

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storagePath, audioBuffer, { contentType: 'audio/wav' });

    if (uploadError) {
      console.error('TTS audio upload error:', uploadError);
      await failTts(record.id, 'فشل حفظ الصوت');
      return res.status(500).json({ error: 'فشل حفظ الصوت الناتج' });
    }

    const completed = await completeTts(record.id, storagePath);
    await consumeQuota(req.userId, 'text_to_speech');

    res.json({ generation: attachTtsAudioUrl(completed) });
  } catch (err) {
    console.error('TTS job error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/tts/jobs', authMiddleware, async (req, res) => {
  const jobs = await getUserTtsGenerations(req.userId);
  res.json({ jobs: jobs.map(attachTtsAudioUrl) });
});

router.delete('/tts/jobs', authMiddleware, async (req, res) => {
  try {
    const { deleteAllUserTtsGenerations } = await import('../services/ttsService.js');
    await deleteAllUserTtsGenerations(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tts/jobs/:id', authMiddleware, async (req, res) => {
  try {
    await deleteTtsGeneration(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;