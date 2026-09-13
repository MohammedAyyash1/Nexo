import { ManualPaymentProvider } from '../services/manualPaymentProvider.js';
import { supabase } from '../services/supabaseClient.js';

const provider = new ManualPaymentProvider();
const TEST_USER_ID = 'test-user-' + Date.now();
let pass = 0, fail = 0;

function check(label, condition) {
  if (condition) { console.log(`✅ ${label}`); pass++; }
  else { console.log(`❌ ${label}`); fail++; }
}

async function run() {
  console.log('=== اختبار 1: إنشاء طلب دفع - يجب أن يأخذ السعر من plans ===');
  const req1 = await provider.createRequest(TEST_USER_ID, 'pro_monthly', 'bank_transfer');
  check('السعر مأخوذ من plans (1000)', req1.amount_minor === 1000);
  check('العملة مأخوذة من plans (ILS)', req1.currency === 'ILS');
  check('الحالة الابتدائية pending', req1.status === 'pending');

  console.log('\n=== اختبار 2: محاولة إنشاء طلب بخطة غير موجودة ===');
  try {
    await provider.createRequest(TEST_USER_ID, 'fake_plan', 'bank_transfer');
    check('رفض خطة غير موجودة', false);
  } catch (e) {
    check('رفض خطة غير موجودة (' + e.message + ')', e.message === 'plan_not_found');
  }

  console.log('\n=== اختبار 3: إرسال إثبات الدفع - pending → submitted ===');
  const submitResult = await provider.submitProof(req1.id, 'REF-12345', null);
  check('الحالة صارت submitted', submitResult.status === 'submitted');

  console.log('\n=== اختبار 4: محاولة إرسال إثبات مرة ثانية (انتقال غير مسموح) ===');
  try {
    await provider.submitProof(req1.id, 'REF-99999', null);
    check('رفض إرسال إثبات مكرر', false);
  } catch (e) {
    check('رفض إرسال إثبات مكرر', e.message.includes('invalid_transition'));
  }

  console.log('\n=== اختبار 5: الموافقة على الطلب - يجب تفعيل اشتراك جديد ===');
  const reviewResult1 = await provider.reviewRequest(req1.id, 'approve', 'تم التحقق من التحويل', 'admin-test');
  check('الحالة صارت paid', reviewResult1.status === 'paid');
  check('تم إنشاء subscription_id', !!reviewResult1.subscription_id);

  const { data: sub1 } = await supabase.from('subscriptions').select('*').eq('id', reviewResult1.subscription_id).single();
  check('الاشتراك active', sub1.status === 'active');
  check('السعر بالاشتراك = snapshot من plans (1000)', sub1.price_amount_minor === 1000);

  console.log('\n=== اختبار 6: idempotency - تكرار نفس الموافقة يجب ألا يضاعف الاشتراك ===');
  const reviewResult2 = await provider.reviewRequest(req1.id, 'approve', 'محاولة ثانية', 'admin-test');
  check('already_processed = true بالمحاولة الثانية', reviewResult2.already_processed === true);
  check('نفس subscription_id (لم يُنشأ اشتراك جديد)', reviewResult2.subscription_id === reviewResult1.subscription_id);

  const { data: subCheck } = await supabase.from('subscriptions').select('*').eq('user_id', TEST_USER_ID);
  check('يوجد اشتراك واحد فقط لهذا المستخدم', subCheck.length === 1);

  console.log('\n=== اختبار 7: طلب ثانٍ - تجديد اشتراك فعّال يجب أن يمدد من current_period_end وليس من الآن ===');
  const req2 = await provider.createRequest(TEST_USER_ID, 'pro_monthly', 'jawwal_pay');
  await provider.submitProof(req2.id, 'REF-67890', null);
  const oldPeriodEnd = new Date(sub1.current_period_end).getTime();
  const reviewResult3 = await provider.reviewRequest(req2.id, 'approve', 'تجديد', 'admin-test');
  const newPeriodEnd = new Date(reviewResult3.current_period_end).getTime();
  const expectedMinDiff = 25 * 24 * 60 * 60 * 1000; // على الأقل قريب من شهر
  check('current_period_end امتد من التاريخ القديم (مو من الآن)', newPeriodEnd - oldPeriodEnd > expectedMinDiff);
  check('نفس subscription_id (تجديد، مو اشتراك جديد)', reviewResult3.subscription_id === reviewResult1.subscription_id);

  console.log('\n=== اختبار 8: رفض طلب - submitted → rejected ===');
  const req3 = await provider.createRequest(TEST_USER_ID, 'pro_monthly', 'palpay');
  await provider.submitProof(req3.id, 'REF-BAD', null);
  const rejectResult = await provider.reviewRequest(req3.id, 'reject', 'الإثبات غير واضح', 'admin-test');
  check('الحالة صارت rejected', rejectResult.status === 'rejected');

  console.log('\n=== اختبار 9: استرجاع - paid → refunded، والاشتراك يُلغى ===');
  const refundResult = await provider.refund(req1.id, 'طلب المستخدم استرجاع', 'admin-test');
  check('الحالة صارت refunded', refundResult.status === 'refunded');
  const { data: subAfterRefund } = await supabase.from('subscriptions').select('*').eq('id', sub1.id).single();
  check('الاشتراك أصبح canceled بعد الاسترجاع', subAfterRefund.status === 'canceled');

  console.log('\n=== اختبار 10: سجل الأحداث (Audit Log) موجود لكل انتقال ===');
  const { data: events } = await supabase.from('payment_request_events').select('*').eq('payment_request_id', req1.id);
  check('يوجد سجل أحداث لطلب req1 (created, submitted, approved, refunded)', events.length >= 4);

  console.log(`\n\n===== النتيجة النهائية: ${pass} نجح، ${fail} فشل =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('خطأ غير متوقع بالاختبار:', e);
  process.exit(1);
});