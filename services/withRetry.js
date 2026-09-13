// أخطاء تعتبر "مؤقتة" ويُعاد المحاولة معها — كلها من طبقة البنية التحتية
// (شبكة/مصادقة عابرة)، وليست أخطاء منطقية أو صلاحيات
function isTransientError(err) {
  if (!err) return false;

  // خطأ Supabase الشهير: "JWT issued at future" (مشاكل مصادقة مؤقتة من طرف Supabase)
  if (err.code === 'PGRST303') return true;

  // أخطاء شبكة/اتصال شائعة (Node.js / fetch)
  const transientMessages = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'fetch failed',
    'network',
    'socket disconnected',
  ];
  const combinedText = `${err.message || ''} ${err.details || ''}`.toLowerCase();
  return transientMessages.some((m) => combinedText.includes(m.toLowerCase()));
}

// ينفّذ الدالة المعطاة، ويعيد المحاولة تلقائيًا فقط لو الخطأ مؤقت
// fn: async function ترجع { data, error } (نمط استجابة Supabase القياسي)
export async function withRetry(fn, { retries = 2, delayMs = 500 } = {}) {
  let lastResult;
  for (let attempt = 0; attempt <= retries; attempt++) {
    lastResult = await fn();
    const err = lastResult?.error;

    if (!err) return lastResult; // نجح — رجّع فورًا
    if (!isTransientError(err)) return lastResult; // خطأ دائم — لا تعيد المحاولة

    console.error(`⏳ Transient error (attempt ${attempt + 1}/${retries + 1}):`, JSON.stringify(err));
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return lastResult; // فشلت كل المحاولات — رجّع آخر نتيجة (فيها الخطأ)
}