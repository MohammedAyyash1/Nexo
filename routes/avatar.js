import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../authMiddleware.js';
import { checkEntitlement, consumeQuota } from '../services/entitlementService.js';
import { getAvatarProvider } from '../services/avatar/avatarProviderFactory.js';
import {
  createAvatarJob, setAvatarJobProviderInfo, updateAvatarJobStatus,
  getAvatarJobById, getUserAvatarJobs, deleteAvatarJob, attachPublicUrls,
} from '../services/avatar/avatarService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SCRIPT_LENGTH = 1500;

router.post('/avatar/jobs', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { script } = req.body;
    if (!req.file) return res.status(400).json({ error: 'الرجاء رفع صورة' });
    if (!SUPPORTED_IMAGE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'صيغة الصورة غير مدعومة. استخدم JPG, PNG أو WEBP' });
    }
    if (!script || !script.trim()) return res.status(400).json({ error: 'النص مطلوب' });
    if (script.length > MAX_SCRIPT_LENGTH) {
      return res.status(400).json({ error: `النص طويل جدًا (الحد الأقصى ${MAX_SCRIPT_LENGTH} حرف)` });
    }

    const entitlement = await checkEntitlement(req.userId, 'avatar_generation');
    if (!entitlement.allowed) {
      const msg = entitlement.enabled === false
        ? 'ميزة Avatar AI متاحة فقط لمشتركي Pro.'
        : 'وصلت للحد الشهري من توليد فيديوهات Avatar.';
      return res.status(entitlement.enabled === false ? 403 : 429).json({ error: msg, code: 'QUOTA_EXCEEDED', entitlement });
    }

    const { supabase } = await import('../services/supabaseClient.js');
    const fileExt = req.file.mimetype.split('/')[1] || 'jpg';
    const storagePath = `${req.userId}/avatar-source-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) {
      console.error('Avatar source image upload error:', uploadError);
      return res.status(500).json({ error: 'فشل رفع الصورة' });
    }

    const job = await createAvatarJob({
      userId: req.userId, sourceImagePath: storagePath, scriptText: script.trim(), provider: 'did',
    });

    const { data: urlData } = supabase.storage.from('user-files').getPublicUrl(storagePath);
    const provider = getAvatarProvider();

    try {
      const { providerJobId, status } = await provider.createJob(urlData.publicUrl, script.trim());
      // نستهلك الحصة فقط بعد نجاح فعلي بالالتزام مع المزوّد - نفس منطق /generate-image بالضبط
      await consumeQuota(req.userId, 'avatar_generation');
      const updated = await setAvatarJobProviderInfo(job.id, providerJobId, status);
      return res.json({ job: attachPublicUrls(updated) });
    } catch (providerErr) {
      console.error('Avatar provider createJob error:', providerErr.status, JSON.stringify(providerErr.providerBody));
      const failed = await updateAvatarJobStatus(job.id, { status: 'failed', errorMessage: providerErr.message });
      return res.status(502).json({ error: 'فشل بدء توليد الفيديو، حاول مرة أخرى لاحقًا', job: attachPublicUrls(failed) });
    }
  } catch (err) {
    console.error('Create avatar job error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/avatar/jobs', authMiddleware, async (req, res) => {
  const jobs = await getUserAvatarJobs(req.userId);
  res.json({ jobs: jobs.map(attachPublicUrls) });
});

router.get('/avatar/jobs/:id', authMiddleware, async (req, res) => {
  try {
    let job = await getAvatarJobById(req.params.id, req.userId);
    if (!job) return res.status(404).json({ error: 'المهمة غير موجودة' });

    // Lazy polling: لو الحالة معلّقة، نتأكد من آخر حالة عند المزوّد قبل الرد - بدون أي Queue/Cron إضافي
    if ((job.status === 'queued' || job.status === 'processing') && job.provider_job_id) {
      const provider = getAvatarProvider();
      try {
        const result = await provider.checkStatus(job.provider_job_id);

        if (result.status === 'completed' && result.resultUrl) {
          const { supabase } = await import('../services/supabaseClient.js');
          const videoResponse = await fetch(result.resultUrl);
          if (videoResponse.ok) {
            const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
            const resultPath = `${req.userId}/avatar-result-${job.id}.mp4`;
            const { error: uploadErr } = await supabase.storage.from('user-files')
              .upload(resultPath, videoBuffer, { contentType: 'video/mp4', upsert: true });
            job = uploadErr
              ? await updateAvatarJobStatus(job.id, { status: 'failed', errorMessage: 'فشل حفظ الفيديو الناتج' })
              : await updateAvatarJobStatus(job.id, { status: 'completed', resultVideoPath: resultPath });
          } else {
            job = await updateAvatarJobStatus(job.id, { status: 'failed', errorMessage: 'فشل تحميل الفيديو من المزوّد' });
          }
        } else if (result.status === 'failed') {
          job = await updateAvatarJobStatus(job.id, { status: 'failed', errorMessage: result.errorMessage || 'فشل التوليد' });
        } else if (result.status !== job.status) {
          job = await updateAvatarJobStatus(job.id, { status: result.status });
        }
      } catch (pollErr) {
        console.error('Avatar status poll error:', pollErr.message);
      }
    }

    res.json({ job: attachPublicUrls(job) });
  } catch (err) {
    console.error('Get avatar job error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.post('/avatar/jobs/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const job = await getAvatarJobById(req.params.id, req.userId);
    if (!job) return res.status(404).json({ error: 'المهمة غير موجودة' });
    if (job.status !== 'queued' && job.status !== 'processing') {
      return res.status(409).json({ error: 'لا يمكن إلغاء مهمة انتهت بالفعل' });
    }
    const updated = await updateAvatarJobStatus(job.id, { status: 'cancelled' });
    res.json({ job: attachPublicUrls(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/avatar/jobs', authMiddleware, async (req, res) => {
  try {
    const { deleteAllUserAvatarJobs } = await import('../services/avatar/avatarService.js');
    await deleteAllUserAvatarJobs(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/avatar/jobs/:id', authMiddleware, async (req, res) => {
  try {
    await deleteAvatarJob(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;