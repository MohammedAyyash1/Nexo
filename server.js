import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import filesRoutes from './routes/files.js';
import paymentsRoutes from './routes/payments.js';
import entitlementsRoutes from './routes/entitlements.js';
import assistantsRoutes from './routes/assistants.js';
import projectsRoutes from './routes/projects.js';
import avatarRoutes from './routes/avatar.js';
import sttRoutes from './routes/stt.js';
import ttsRoutes from './routes/tts.js';
import documentsRoutes from './routes/documents.js';
import imageStudioRoutes from './routes/imageStudio.js';
import islamicRoutes from './routes/islamic.js';
import cvRoutes from './routes/cv.js';
import youtubeRoutes from './routes/youtube.js';
import newsCheckRoutes from './routes/newsCheck.js';
import dialectRoutes from './routes/dialect.js';
import studyRoutes from './routes/study.js';
import ocrRoutes from './routes/ocr.js';
import dataAnalyzerRoutes from './routes/dataAnalyzer.js';
import meetingNotesRoutes from './routes/meetingNotes.js';
import emailAssistantRoutes from './routes/emailAssistant.js';
import flashcardsRoutes from './routes/flashcards.js';
import codeWorkspaceRoutes from './routes/codeWorkspace.js';
import knowledgeBaseRoutes from './routes/knowledgeBase.js';
import researcherRoutes from './routes/researcher.js';
import workflowsRoutes from './routes/workflows.js';
import adGeneratorRoutes from './routes/adGenerator.js';
import liveTranslateRoutes from './routes/liveTranslate.js';
import favoritesRoutes from './routes/favorites.js';
import http from 'http';
import { setupLiveTranslateSocket } from './liveTranslateSocket.js';
const app = express();

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json({ limit: '50mb' }));

// ===== Health check =====
// تحتاجه أغلب منصات الاستضافة (Render, Railway, إلخ) للتأكد الدوري أن السيرفر شغّال وصحي.
// لا يتطلب مصادقة عمدًا، ولا يكشف أي معلومة حساسة.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api', flashcardsRoutes);
app.use('/api', codeWorkspaceRoutes);
app.use('/api', knowledgeBaseRoutes);
app.use('/api', researcherRoutes);
app.use('/api', workflowsRoutes);
app.use('/api', adGeneratorRoutes);
app.use('/api', liveTranslateRoutes);
app.use('/api', favoritesRoutes);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'محاولات كثيرة جدًا، حاول لاحقًا بعد 15 دقيقة.' },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'طلبات كثيرة جدًا، انتظر قليلاً.' },
});

app.use('/api/signup', authLimiter);
app.use('/api/login', authLimiter);
app.use('/api/google-login', authLimiter);
app.use('/api/change-password', authLimiter);
app.use('/api/account', authLimiter);
app.use('/api/forgot-password', authLimiter);
app.use('/api/reset-password', authLimiter);
app.use('/api/forgot-password', authLimiter);
app.use('/api/reset-password', authLimiter);

app.use('/api', authRoutes);
app.use('/api/chat', chatLimiter);
app.use('/api', chatRoutes);
app.use('/api', filesRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/entitlements', entitlementsRoutes);
app.use('/api', projectsRoutes);
app.use('/api', avatarRoutes);
app.use('/api', sttRoutes);
app.use('/api', ttsRoutes);
app.use('/api', documentsRoutes);
app.use('/api', imageStudioRoutes);
app.use('/api', islamicRoutes);
app.use('/api', cvRoutes);
app.use('/api', youtubeRoutes);
app.use('/api', newsCheckRoutes);
app.use('/api', dialectRoutes);
app.use('/api', studyRoutes);
app.use('/api', ocrRoutes);
app.use('/api', dataAnalyzerRoutes);
app.use('/api', meetingNotesRoutes);
app.use('/api', emailAssistantRoutes);
app.use('/api', assistantsRoutes);

// ===== 404: أي مسار API غير موجود =====
// لازم يكون بعد كل الـroutes وقبل الـerror handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'المسار المطلوب غير موجود' });
});

// ===== Error handler مركزي =====
// لازم يكون آخر middleware بالسلسلة (4 معاملات = Express بيتعرف عليه كـerror handler تلقائيًا).
// يمنع تسريب أي stack trace أو تفاصيل تقنية حساسة للمستخدم، ويسجل الخطأ الحقيقي بالسيرفر فقط.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: config.isProduction ? 'حدث خطأ غير متوقع في السيرفر' : (err.message || 'حدث خطأ غير متوقع في السيرفر'),
  });
});

const server = http.createServer(app);
setupLiveTranslateSocket(server);

server.listen(config.port, () => {
  console.log(`✅ Server running on port ${config.port}`);
});