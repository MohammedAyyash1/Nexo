import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { getImageProvider } from '../services/image/imageProviderFactory.js';
import { createAdRecord, completeAd, failAd, getUserAds, deleteAd, deleteAllUserAds, attachAdImageUrl } from '../services/adGeneratorService.js';

const router = express.Router();
const MAX_IDEA_LENGTH = 500;

function parseJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { return null; }
}

router.post('/ads/generate', authMiddleware, async (req, res) => {
  try {
    const { productIdea, lang } = req.body;
    if (!productIdea || !productIdea.trim()) return res.status(400).json({ error: 'الرجاء وصف فكرة الإعلان' });
    if (productIdea.length > MAX_IDEA_LENGTH) return res.status(400).json({ error: 'الوصف طويل جدًا' });

    const record = await createAdRecord({ userId: req.userId, productIdea: productIdea.trim() });

    const prompt = lang === 'en'
      ? `Write ad copy for this product/idea. If the idea is vague or lacks visual detail, invent plausible, concrete, specific visual details yourself (product type, setting, colors, mood) rather than defaulting to generic/unrelated imagery. Respond with ONLY a JSON object: {"headline":"short punchy headline","description":"2-3 sentence ad description","cta":"short call to action phrase","imagePrompt":"a detailed, specific English visual description (at least 20 words) directly relevant to the product/idea, for generating an ad image"}\n\nProduct/idea: ${productIdea.trim()}`
      : `اكتب نص إعلان لهذا المنتج/الفكرة. لو الفكرة غامضة أو ناقصة تفاصيل بصرية، اخترع أنت تفاصيل بصرية واقعية ومحددة (نوع المنتج، المكان، الألوان، الأجواء) بدل ما ترجع لصورة عامة أو غير مرتبطة. أجب بكائن JSON فقط: {"headline":"عنوان قصير جذّاب","description":"وصف الإعلان بجملتين إلى ثلاث","cta":"عبارة دعوة لاتخاذ إجراء قصيرة","imagePrompt":"وصف بصري مفصّل ومحدد بالإنجليزية (20 كلمة على الأقل) مرتبط مباشرة بالمنتج/الفكرة، لتوليد صورة الإعلان"}\n\nالمنتج/الفكرة: ${productIdea.trim()}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
    });

    const data = await groqResponse.json();
    if (data.error) {
      console.error('Ad copy generation error:', JSON.stringify(data.error));
      await failAd(record.id, 'فشل توليد نص الإعلان');
      return res.status(502).json({ error: 'فشل توليد الإعلان، حاول مرة أخرى' });
    }

    const parsed = parseJsonObject(data.choices?.[0]?.message?.content || '');
    if (!parsed || !parsed.headline) {
      await failAd(record.id, 'تعذّر تفسير نتيجة الذكاء الاصطناعي');
      return res.status(502).json({ error: 'حدث خطأ أثناء تجهيز الإعلان' });
    }

    let adImagePath = null;
    try {
      const provider = getImageProvider('pollinations');
      const safeImagePrompt = `${parsed.imagePrompt || productIdea.trim()}, professional advertising photography, family-friendly, fully clothed, no nudity, no suggestive content`;
      const imageResult = await provider.generateImage(safeImagePrompt, { width: 1024, height: 1024 });
      const { supabase } = await import('../services/supabaseClient.js');
      const ext = (imageResult.mimeType || 'image/jpeg').split('/')[1] || 'jpg';
      const storagePath = `${req.userId}/ad-${record.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('user-files').upload(storagePath, imageResult.buffer, { contentType: imageResult.mimeType });
      if (!uploadError) adImagePath = storagePath;
    } catch (imgErr) {
      console.error('Ad image generation failed (non-blocking):', imgErr.message);
    }

    const completed = await completeAd(record.id, { headline: parsed.headline, description: parsed.description || '', cta: parsed.cta || '', adImagePath });
    res.json({ ad: attachAdImageUrl(completed) });
  } catch (err) {
    console.error('Ad generator error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/ads', authMiddleware, async (req, res) => {
  res.json({ ads: await getUserAds(req.userId) });
});

router.delete('/ads', authMiddleware, async (req, res) => {
  try { await deleteAllUserAds(req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/ads/:id', authMiddleware, async (req, res) => {
  try { await deleteAd(req.params.id, req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;