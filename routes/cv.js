import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { createCv, updateCv, getUserCvs, getCvById, deleteCv, deleteAllUserCvs } from '../services/cvService.js';

const router = express.Router();
const MAX_TEXT_LENGTH = 1500;
const photoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/cv/photo', authMiddleware, photoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'الرجاء رفع صورة' });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'صيغة الصورة غير مدعومة. استخدم JPG, PNG أو WEBP' });
    }
    const { supabase } = await import('../services/supabaseClient.js');
    const ext = req.file.mimetype.split('/')[1];
    const storagePath = `${req.userId}/cv-photo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('user-files').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });
    if (error) {
      console.error('CV photo upload error:', error);
      return res.status(500).json({ error: 'فشل رفع الصورة' });
    }
    const { data } = supabase.storage.from('user-files').getPublicUrl(storagePath);
    res.json({ url: data.publicUrl });
  } catch (err) {
    console.error('CV photo error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.post('/cv', authMiddleware, async (req, res) => {
  try {
    const { title, data } = req.body;
    if (!data) return res.status(400).json({ error: 'بيانات السيرة الذاتية مطلوبة' });
    const cv = await createCv({ userId: req.userId, title, data });
    res.json({ cv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/cv/:id', authMiddleware, async (req, res) => {
  try {
    const cv = await updateCv(req.params.id, req.userId, req.body);
    res.json({ cv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cv', authMiddleware, async (req, res) => {
  const cvs = await getUserCvs(req.userId);
  res.json({ cvs });
});

router.get('/cv/:id', authMiddleware, async (req, res) => {
  const cv = await getCvById(req.params.id, req.userId);
  if (!cv) return res.status(404).json({ error: 'غير موجودة' });
  res.json({ cv });
});

router.delete('/cv/:id', authMiddleware, async (req, res) => {
  try {
    await deleteCv(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cv', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserCvs(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تحسين نص بالذكاء الاصطناعي (اختياري) - يستخدم Groq المجاني الموجود أصلًا بالمشروع
router.post('/cv/enhance', authMiddleware, async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'النص مطلوب' });
    if (text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: 'النص طويل جدًا' });

    const prompt = lang === 'en'
      ? `Rewrite this CV text to be more professional, concise, and impactful. Keep it roughly the same length. Return ONLY the improved text, no explanations:\n\n${text}`
      : `أعد صياغة نص السيرة الذاتية هذا ليكون أكثر احترافية وإيجازًا وتأثيرًا، بنفس الطول تقريبًا. أرجع فقط النص المحسّن، بدون أي شرح:\n\n${text}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
    });

    const data = await groqResponse.json();
    if (data.error) {
      console.error('CV enhance error:', JSON.stringify(data.error));
      return res.status(502).json({ error: 'فشل تحسين النص، حاول مرة أخرى' });
    }

    const enhancedText = data.choices?.[0]?.message?.content?.trim() || text;
    res.json({ enhancedText });
  } catch (err) {
    console.error('CV enhance error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

export default router;