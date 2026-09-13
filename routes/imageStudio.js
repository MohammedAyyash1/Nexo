import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../authMiddleware.js';
import { checkEntitlement, consumeQuota } from '../services/entitlementService.js';
import { getImageProvider } from '../services/image/imageProviderFactory.js';
import {
  createImageGenRecord, completeImageGen, failImageGen,
  getUserImageGenerations, deleteImageGen, deleteAllUserImageGens, attachImageUrl,
} from '../services/imageStudioService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROMPT_LENGTH = 1000;

router.post(
  '/images/generate',
  authMiddleware,
  upload.fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'الوصف مطلوب' });
      if (prompt.length > MAX_PROMPT_LENGTH) return res.status(400).json({ error: `الوصف طويل جدًا (الحد الأقصى ${MAX_PROMPT_LENGTH} حرف)` });

      const inputFiles = [req.files?.image1?.[0], req.files?.image2?.[0]].filter(Boolean);
      for (const f of inputFiles) {
        if (!SUPPORTED_IMAGE_TYPES.includes(f.mimetype)) {
          return res.status(400).json({ error: 'صيغة صورة غير مدعومة. استخدم JPG, PNG أو WEBP' });
        }
      }

      // دمج/تعديل صور مدخلة يحتاج Gemini (فوترة + حصة Pro) - توليد نص→صورة بسيط مجاني بالكامل عبر Pollinations
      const usingImageMerge = inputFiles.length > 0;

      if (usingImageMerge) {
        const entitlement = await checkEntitlement(req.userId, 'image_generation', 'gemini_image');
        if (!entitlement.allowed) {
          const msg = entitlement.enabled === false
            ? 'دمج/تعديل الصور المرفوعة متاح فقط لمشتركي Pro (يحتاج تفعيل فوترة Gemini من طرفنا). التوليد النصي البسيط مجاني للجميع.'
            : 'وصلت للحد الشهري من توليد الصور المدمجة.';
          return res.status(entitlement.enabled === false ? 403 : 429).json({ error: msg, code: 'QUOTA_EXCEEDED', entitlement });
        }
      }

      const record = await createImageGenRecord({ userId: req.userId, prompt: prompt.trim(), inputImageCount: inputFiles.length });

      try {
        const provider = getImageProvider(usingImageMerge ? 'gemini' : 'pollinations');
        const safePrompt = usingImageMerge ? prompt.trim() : `${prompt.trim()}, family-friendly, fully clothed, no nudity, no suggestive content`;
        const result = await provider.generateImage(safePrompt, {
          inputImages: inputFiles.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype })),
        });

        const { supabase } = await import('../services/supabaseClient.js');
        const ext = (result.mimeType || 'image/jpeg').split('/')[1] || 'jpg';
        const storagePath = `${req.userId}/image-studio-${record.id}.${ext}`;

        const { error: uploadError } = await supabase.storage.from('user-files').upload(storagePath, result.buffer, { contentType: result.mimeType });
        if (uploadError) {
          console.error('Image studio upload error:', uploadError);
          await failImageGen(record.id, 'فشل حفظ الصورة');
          return res.status(500).json({ error: 'فشل حفظ الصورة الناتجة' });
        }

        const completed = await completeImageGen(record.id, storagePath);
        if (usingImageMerge) await consumeQuota(req.userId, 'image_generation', 'gemini_image');

        res.json({ generation: attachImageUrl(completed) });
      } catch (providerErr) {
        console.error('Image provider error:', providerErr.status, providerErr.message);
        await failImageGen(record.id, providerErr.message);
        return res.status(502).json({ error: 'فشل توليد الصورة، حاول مرة أخرى' });
      }
    } catch (err) {
      console.error('Image studio generate error:', err);
      res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
  }
);

router.get('/images', authMiddleware, async (req, res) => {
  const gens = await getUserImageGenerations(req.userId);
  res.json({ generations: gens.map(attachImageUrl) });
});

router.delete('/images', authMiddleware, async (req, res) => {
  try { await deleteAllUserImageGens(req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/images/:id', authMiddleware, async (req, res) => {
  try { await deleteImageGen(req.params.id, req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;