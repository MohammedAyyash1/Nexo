import express from 'express';
import multer from 'multer';
import { authMiddleware, requireAdmin } from '../authMiddleware.js';
import { ManualPaymentProvider } from '../services/manualPaymentProvider.js';
import { supabase } from '../services/supabaseClient.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('invalid_file_type'));
  },
});

const router = express.Router();
const provider = new ManualPaymentProvider();

// يولّد رابط موقّت وآمن لملف إثبات الدفع (الـbucket خاص، مو عام)
// صالح 10 دقائق فقط، ويُنشأ فقط عند الطلب الفعلي - لا نخزّن روابط دائمة
async function signProofUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(storagePath, 600);
  if (error) {
    console.error('sign proof url error:', error);
    return null;
  }
  return data.signedUrl;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_METHODS = ['bank_transfer', 'jawwal_pay', 'palpay'];

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}
function fail(res, status, error) {
  return res.status(status).json({ success: false, data: null, error });
}

// يحوّل أخطاء PaymentProvider لأكواد HTTP مناسبة، بدون كشف تفاصيل قاعدة البيانات
function mapProviderError(err) {
  const msg = err.message || '';
  if (msg === 'plan_not_found') return { status: 404, error: 'الخطة غير موجودة' };
  if (msg === 'plan_not_active') return { status: 400, error: 'الخطة غير متاحة حاليًا' };
  if (msg === 'invalid_payment_method') return { status: 400, error: 'طريقة دفع غير صالحة' };
  if (msg === 'request_not_found') return { status: 404, error: 'طلب الدفع غير موجود' };
  if (msg === 'invalid_decision') return { status: 400, error: 'قرار غير صالح' };
  if (msg.startsWith('invalid_transition')) return { status: 409, error: 'لا يمكن تنفيذ هذا الإجراء على حالة الطلب الحالية' };
  return { status: 500, error: 'حدث خطأ داخلي' };
}
// GET /plans/:id - قراءة فقط، بدون authentication، لعرض تفاصيل خطة قبل الاشتراك
// لا يُرجع أي بيانات حساسة - فقط ما يحتاجه الـFrontend لعرض السعر
router.get('/plans/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, price_amount_minor, currency, billing_interval, is_active')
      .eq('id', id)
      .single();

    if (error || !data) return fail(res, 404, 'الخطة غير موجودة');
    return ok(res, data);
  } catch (err) {
    console.error('get plan error:', err);
    return fail(res, 500, 'حدث خطأ داخلي');
  }
});
// GET /requests - يعرض كل طلبات المستخدم الحالي فقط (لا يوجد طلبات مستخدمين آخرين)
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const withSignedUrls = await Promise.all(
      data.map(async (r) => ({ ...r, proof_signed_url: await signProofUrl(r.proof_url) }))
    );

    return ok(res, withSignedUrls);
  } catch (err) {
    console.error('list requests error:', err);
    return fail(res, 500, 'حدث خطأ داخلي');
  }
});
// POST /requests - إنشاء طلب دفع
// ملاحظة أمنية: نقرأ فقط planId وpaymentMethod من body. أي amountMinor/currency مُرسل من العميل يُتجاهل تمامًا،
// لأن createRequest بالـProvider يجلب السعر والعملة من جدول plans حصرًا.
router.post('/requests', authMiddleware, async (req, res) => {
  const { planId, paymentMethod } = req.body;

  if (typeof planId !== 'string' || !planId.trim()) {
    return fail(res, 400, 'plan_id مطلوب');
  }
  if (!VALID_METHODS.includes(paymentMethod)) {
    return fail(res, 400, 'طريقة دفع غير صالحة');
  }

  try {
    const request = await provider.createRequest(req.userId, planId.trim(), paymentMethod);
    return ok(res, request, 201);
  } catch (err) {
    const { status, error } = mapProviderError(err);
    if (status === 500) console.error('create request error:', err);
    return fail(res, status, error);
  }
});

// POST /requests/:id/submit - إرسال رقم العملية/إثبات الدفع
router.post('/requests/:id/submit', authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return fail(res, 400, 'معرف غير صالح');

  const { referenceNumber, proofUrl } = req.body;
  if (typeof referenceNumber !== 'string' || !referenceNumber.trim()) {
    return fail(res, 400, 'رقم العملية مطلوب');
  }
  if (proofUrl !== undefined && proofUrl !== null && typeof proofUrl !== 'string') {
    return fail(res, 400, 'رابط إثبات غير صالح');
  }

  try {
    // تحقق ملكية: المستخدم لا يستطيع إرسال إثبات لطلب غير طلبه
    const { data: existing, error: fetchError } = await supabase
      .from('payment_requests')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) return fail(res, 404, 'طلب الدفع غير موجود');
    if (existing.user_id !== req.userId) return fail(res, 404, 'طلب الدفع غير موجود');

    const result = await provider.submitProof(id, referenceNumber.trim(), proofUrl || null);
    return ok(res, result);
  } catch (err) {
    const { status, error } = mapProviderError(err);
    if (status === 500) console.error('submit proof error:', err);
    return fail(res, status, error);
  }
});

// GET /requests/:id - عرض حالة طلب المستخدم (لصاحب الطلب فقط)
router.get('/requests/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return fail(res, 400, 'معرف غير صالح');

  try {
    const { data, error } = await supabase.from('payment_requests').select('*').eq('id', id).single();
    if (error || !data) return fail(res, 404, 'طلب الدفع غير موجود');
    // سياسة المشروع: نُرجع 404 (لا 403) لعدم الكشف عن وجود طلب لا يخص المستخدم
    if (data.user_id !== req.userId) return fail(res, 404, 'طلب الدفع غير موجود');
    return ok(res, { ...data, proof_signed_url: await signProofUrl(data.proof_url) });
  } catch (err) {
    console.error('get request error:', err);
    return fail(res, 500, 'حدث خطأ داخلي');
  }
});
// POST /requests/:id/cancel - pending -> canceled فقط، لصاحب الطلب فقط
router.post('/requests/:id/cancel', authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return fail(res, 400, 'معرف غير صالح');

  try {
    const { data, error } = await supabase.rpc('fn_cancel_payment_request', {
      p_request_id: id,
      p_user_id: req.userId,
    });
    if (error) throw new Error(error.message);
    return ok(res, data);
  } catch (err) {
    const { status, error } = mapProviderError(err);
    if (status === 500) console.error('cancel request error:', err);
    return fail(res, status, error);
  }
});
// ==== Admin: قائمة وتفاصيل الطلبات ====

// GET /admin/requests - كل طلبات الدفع (لكل المستخدمين)، مع اسم/بريد المستخدم واسم الخطة
router.get('/admin/requests', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const userIds = [...new Set(requests.map((r) => r.user_id))];
    const planIds = [...new Set(requests.map((r) => r.plan_id))];

    const { data: users } = await supabase.from('users').select('id, email, name').in('id', userIds);
    const { data: plans } = await supabase.from('plans').select('id, name').in('id', planIds);

    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));
    const planMap = Object.fromEntries((plans || []).map((p) => [p.id, p]));

    const enriched = requests.map((r) => ({
      ...r,
      user_email: userMap[r.user_id]?.email || null,
      user_name: userMap[r.user_id]?.name || null,
      plan_name: planMap[r.plan_id]?.name || r.plan_id,
    }));

    return ok(res, enriched);
  } catch (err) {
    console.error('admin list requests error:', err);
    return fail(res, 500, 'حدث خطأ داخلي');
  }
});

// GET /admin/requests/:id - تفاصيل طلب واحد (أدمن فقط، بدون قيد الملكية) مع رابط إثبات موقّت
router.get('/admin/requests/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return fail(res, 400, 'معرف غير صالح');

  try {
    const { data, error } = await supabase.from('payment_requests').select('*').eq('id', id).single();
    if (error || !data) return fail(res, 404, 'طلب الدفع غير موجود');

    const { data: user } = await supabase.from('users').select('email, name').eq('id', data.user_id).single();
    const { data: plan } = await supabase.from('plans').select('name').eq('id', data.plan_id).single();

    return ok(res, {
      ...data,
      user_email: user?.email || null,
      user_name: user?.name || null,
      plan_name: plan?.name || data.plan_id,
      proof_signed_url: await signProofUrl(data.proof_url),
    });
  } catch (err) {
    console.error('admin get request error:', err);
    return fail(res, 500, 'حدث خطأ داخلي');
  }
});

// POST /admin/requests/:id/start-review - submitted → under_review
router.post('/admin/requests/:id/start-review', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return fail(res, 400, 'معرف غير صالح');

  try {
    const { data, error } = await supabase.rpc('fn_start_payment_review', {
      p_request_id: id,
      p_actor_id: req.userId,
    });
    if (error) throw new Error(error.message);
    return ok(res, data);
  } catch (err) {
    const { status, error } = mapProviderError(err);
    if (status === 500) console.error('start review error:', err);
    return fail(res, status, error);
  }
});
// ==== Admin فقط ====

// POST /requests/:id/review
router.post('/requests/:id/review', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return fail(res, 400, 'معرف غير صالح');

  const { decision, adminNote } = req.body;
  if (!['approve', 'reject'].includes(decision)) return fail(res, 400, 'قرار غير صالح');
  if (decision === 'reject' && (typeof adminNote !== 'string' || !adminNote.trim())) {
    return fail(res, 400, 'سبب الرفض (admin_note) مطلوب');
  }

  try {
    const result = await provider.reviewRequest(id, decision, adminNote || null, req.userId);
    return ok(res, result);
  } catch (err) {
    const { status, error } = mapProviderError(err);
    if (status === 500) console.error('review request error:', err);
    return fail(res, status, error);
  }
});

// POST /requests/:id/refund
router.post('/requests/:id/refund', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return fail(res, 400, 'معرف غير صالح');

  const { adminNote } = req.body;

  try {
    const result = await provider.refund(id, adminNote || null, req.userId);
    return ok(res, result);
  } catch (err) {
    const { status, error } = mapProviderError(err);
    if (status === 500) console.error('refund error:', err);
    return fail(res, status, error);
  }
});
// POST /requests/:id/proof - إرسال رقم مرجعي + ملف إثبات اختياري معًا (multipart/form-data)
router.post('/requests/:id/proof', authMiddleware, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return fail(res, 400, 'حجم الملف كبير جدًا (الحد الأقصى 5MB)');
      if (err.message === 'invalid_file_type') return fail(res, 400, 'نوع الملف غير مدعوم (صور أو PDF فقط)');
      return fail(res, 400, 'فشل رفع الملف');
    }
    next();
  });
}, async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return fail(res, 400, 'معرف غير صالح');

  const { referenceNumber } = req.body;
  if (typeof referenceNumber !== 'string' || !referenceNumber.trim()) {
    return fail(res, 400, 'رقم العملية مطلوب');
  }

  try {
    // تحقق ملكية وحالة قبل أي رفع فعلي - يمنع رفع ملفات لطلبات لا تخص المستخدم أو غير قابلة للتعديل
    const { data: existing, error: fetchError } = await supabase
      .from('payment_requests')
      .select('id, user_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) return fail(res, 404, 'طلب الدفع غير موجود');
    if (existing.user_id !== req.userId) return fail(res, 404, 'طلب الدفع غير موجود');
    if (existing.status !== 'pending') return fail(res, 409, 'لا يمكن إرسال إثبات لهذا الطلب في حالته الحالية');

    let storagePath = null;
    if (req.file) {
      const ext = req.file.mimetype === 'application/pdf' ? 'pdf' : req.file.mimetype.split('/')[1];
      storagePath = `${req.userId}/${id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });

      if (uploadError) {
        console.error('proof upload error:', uploadError);
        return fail(res, 500, 'فشل رفع ملف الإثبات');
      }
    }

    const result = await provider.submitProof(id, referenceNumber.trim(), storagePath);
    return ok(res, result);
  } catch (err) {
    const { status, error } = mapProviderError(err);
    if (status === 500) console.error('submit proof (with file) error:', err);
    return fail(res, status, error);
  }
});
export default router;