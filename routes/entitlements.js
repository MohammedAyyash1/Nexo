import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { getMyEntitlements, getPlanFeatures } from '../services/entitlementService.js';

const router = express.Router();

// يرجع خطة المستخدم الحالية وكل الـfeatures المتاحة له مع الحدود - يُستخدم لعرض الواجهة فقط،
// وليس مصدر الحماية (الحماية الفعلية دائمًا من الـBackend عبر checkEntitlement/consumeQuota)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const data = await getMyEntitlements(req.userId);
    res.json({ success: true, data, error: null });
  } catch (err) {
    console.error('get entitlements error:', err);
    res.status(500).json({ success: false, data: null, error: 'حدث خطأ داخلي' });
  }
});

// GET /plans/:planId - ميزات خطة معينة بدون بيانات استهلاك شخصية (لعرض مقارنة "ماذا لو ترقيت" بدون تسجيل دخول حتى)
router.get('/plans/:planId', async (req, res) => {
  try {
    const data = await getPlanFeatures(req.params.planId);
    res.json({ success: true, data, error: null });
  } catch (err) {
    console.error('get plan features error:', err);
    res.status(500).json({ success: false, data: null, error: 'حدث خطأ داخلي' });
  }
});
export default router;