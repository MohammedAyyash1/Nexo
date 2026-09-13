import { PollinationsImageProvider } from './providers/pollinationsProvider.js';
import { GeminiImageProvider } from './providers/geminiImageProvider.js';

const PROVIDERS = {
  pollinations: () => new PollinationsImageProvider(),
  gemini: () => new GeminiImageProvider(),
};

export function getImageProvider(key) {
  // ⚠️ Pollinations معطّل مؤقتًا (2026-08) - فلتر safe=true فشل يمنع محتوى غير لائق
  // بمحاولة فعلية موثّقة، رغم تفعيله. لا تعيد تفعيله كمزوّد افتراضي إلا بعد
  // اختبار موثوق يثبت فعالية الفلتر، أو استبداله بمزوّد آخر أكثر أمانًا.
  const requested = key || 'pollinations';
  const factory = PROVIDERS[requested === 'pollinations' ? 'gemini' : requested];
  if (!factory) throw new Error(`Unknown image provider: ${requested}`);
  return factory();
}