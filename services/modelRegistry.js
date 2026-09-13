// سجل النماذج المركزي — كل نموذج جديد (من أي مزوّد أو مستوى) يُضاف هنا فقط
// نستخدم "aliases" بدل أرقام إصدار محددة حيث أمكن، لتفادي انكسار الموديل مع تحديثات Google
//
// ملاحظة: مستوى "balanced" غير مفعّل حاليًا لأن الموديلات المرشحة له
// (مثل gemini-2.5-flash) غير متاحة لحسابات جديدة على الخطة المجانية.
// لإضافته لاحقًا: فعّل الكائن أدناه، وأضف 'balanced' لمصفوفة ACTIVE_TIERS —
// لا حاجة لأي تغيير آخر بقاعدة البيانات أو الواجهة.

export const MODEL_REGISTRY = {
  fast: {
    provider: 'gemini',
    model: 'gemini-flash-lite-latest',
    labelAr: 'سريع',
    labelEn: 'Fast',
  },
  // ⚠️ معطّل مؤقتًا — تم التحقق فعليًا (بتاريخ 2026-07-31) أن gemini-2.5-flash
  // لم يعد متاحًا لحسابات Free Tier الجديدة (Google API ترجع 404 "no longer
  // available to new users"). هذا التعريف موجود جاهزًا فقط، ومحمي بالكامل من
  // أي استخدام فعلي عبر ACTIVE_TIERS أدناه (غير مدرج فيها).
  // فعّله بإضافة 'balanced' لمصفوفة ACTIVE_TIERS بمجرد أن يصبح النموذج متاحًا
  // من جديد لحسابك — بدون أي تعديل آخر بالكود، قاعدة البيانات، أو الواجهة.
  balanced: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    labelAr: 'متوازن',
    labelEn: 'Balanced',
  },
 advanced: {
    provider: 'gemini',
    model: 'gemini-flash-latest',
    labelAr: 'متقدم',
    labelEn: 'Advanced',
  },
  groq_fast: {
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    labelAr: '⚡ سريع جدًا (Groq)',
    labelEn: '⚡ Ultra Fast (Groq)',
  },
  // ⚠️ معطّل مؤقتًا — لا يوجد مفتاح OpenAI فعّال بعد (OPENAI_API_KEY فاضي بـ.env).
  // فعّله بإضافة 'openai_gpt' لمصفوفة ACTIVE_TIERS بمجرد توفر مفتاح صالح —
  // بدون أي تعديل آخر بالكود أو قاعدة البيانات أو الواجهة.
  openai_gpt: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    labelAr: '🧠 GPT (OpenAI)',
    labelEn: '🧠 GPT (OpenAI)',
  },
  // ⚠️ معطّل مؤقتًا — لا يوجد مفتاح Anthropic فعّال بعد (ANTHROPIC_API_KEY فاضي بـ.env).
  // فعّله بإضافة 'claude' لمصفوفة ACTIVE_TIERS بمجرد توفر مفتاح صالح.
  claude: {
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    labelAr: '🎭 Claude',
    labelEn: '🎭 Claude',
  },
};

// المستويات الظاهرة فعليًا للمستخدم حاليًا (subset من MODEL_REGISTRY)
export const ACTIVE_TIERS = ['fast', 'advanced', 'groq_fast'];

export const DEFAULT_TIER = 'fast';

export function resolveModel(tier) {
  const isActive = ACTIVE_TIERS.includes(tier);
  return isActive && MODEL_REGISTRY[tier] ? MODEL_REGISTRY[tier] : MODEL_REGISTRY[DEFAULT_TIER];
}
// يبني سلسلة محاولات مرتبة: الموديل المختار أولًا، ثم موديل "سريع" كملاذ أخير
// (لأنه الأرخص والأكثر توفرًا). قابلة للتوسع تلقائيًا عند إضافة مستويات جديدة —
// بدون أي تعديل هون أو بالملفات التانية.
export function buildFallbackChain(tier) {
  const primary = resolveModel(tier);
  const chain = [primary];
  const fastFallback = MODEL_REGISTRY[DEFAULT_TIER];
  if (fastFallback.model !== primary.model) chain.push(fastFallback);
  return chain;
}