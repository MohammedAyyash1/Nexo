import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { createSession, getSession, getSessionByCodePrefix } from '../services/liveTranslateService.js';
const router = express.Router();

router.post('/live-translate/sessions', authMiddleware, async (req, res) => {
  try {
    const session = await createSession(req.userId);
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/live-translate/sessions/:id', authMiddleware, async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });
  res.json({ session });
});
// راوت عام — بدون authMiddleware، لأنه المدعو ممكن ما يكون عنده حساب Nexo أصلاً
router.post('/live-translate/join', async (req, res) => {
  try {
    const { code, name } = req.body;
    if (!code || !code.trim()) return res.status(400).json({ error: 'كود المكالمة مطلوب' });

    const session = await getSessionByCode(code.trim().toUpperCase());
    if (!session) return res.status(404).json({ error: 'كود غير صحيح' });
    if (session.status === 'ended') return res.status(410).json({ error: 'هذه المكالمة انتهت' });

    const guestToken = jwt.sign(
      { guest: true, roomId: session.id, name: (name || 'ضيف').slice(0, 30) },
      config.jwtSecret,
      { expiresIn: '3h' }
    );
    res.json({ sessionId: session.id, token: guestToken });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});router.get('/live-translate/sessions/by-code/:code', authMiddleware, async (req, res) => {
  const session = await getSessionByCodePrefix(req.params.code);
  if (!session) return res.status(404).json({ error: 'كود الغرفة غير صحيح' });
  res.json({ session });
});
export default router;