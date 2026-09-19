import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// ⛔ بالإنتاج: نرفض تشغيل السيرفر أساسًا لو JWT_SECRET غير معرّف —
// أفضل بكثير من تشغيله بصمت بمفتاح ثابت معروف بالكود (ثغرة أمنية خطيرة).
if (isProduction && !process.env.JWT_SECRET) {
  console.error('❌ متغير البيئة JWT_SECRET مفقود. لا يمكن تشغيل السيرفر بأمان في وضع الإنتاج بدونه.');
  console.error('   ولّد قيمة عشوائية آمنة بالأمر التالي وضعها بملف .env:');
  console.error('   openssl rand -hex 32');
  process.exit(1);
}

// بالتطوير المحلي فقط: نسمح بمفتاح مؤقت مع تحذير واضح، لتسهيل التشغيل السريع.
if (!isProduction && !process.env.JWT_SECRET) {
  console.warn('⚠️  تحذير: JWT_SECRET غير معرّف بملف .env — يُستخدم مفتاح تطوير مؤقت غير آمن.');
  console.warn('   لا تستخدم هذا الإعداد أبدًا بالإنتاج.');
}

export const config = {
  isProduction,

  // بعض منصات الاستضافة (Render, Railway, إلخ) تفرض رقم المنفذ عبر process.env.PORT تلقائيًا
  port: process.env.PORT || 3001,

  jwtSecret: process.env.JWT_SECRET || 'nexo-dev-secret-change-me',

  googleClientId: process.env.GOOGLE_CLIENT_ID,
  geminiApiKey: process.env.GEMINI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  avatarProvider: process.env.AVATAR_PROVIDER,
  didApiKey: process.env.DID_API_KEY,
  geminiModel: 'gemini-flash-lite-latest',

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  resendApiKey: process.env.RESEND_API_KEY,

  // بالتطوير: يرجع لـ localhost:5173 تلقائيًا (نفس منفذ Vite الافتراضي)
  // بالإنتاج: لازم FRONTEND_URL يكون معرّفًا فعليًا بدومين الفرونت الحقيقي (https://...)
  // وإلا CORS رح يرفض كل الطلبات القادمة من الموقع المنشور.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};