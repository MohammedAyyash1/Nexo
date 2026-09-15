import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env.js';
import { authMiddleware } from '../authMiddleware.js';
import { withRetry } from '../services/withRetry.js';
import { supabase } from '../services/supabaseClient.js';

const router = express.Router();
const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;
const uploadAvatar = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

/**
 * ⚠️ افتراض مهم: هذا الملف مبني على افتراض إنه جدول `users` بـ Supabase
 * فيه الأعمدة التالية: id, email, name, password (bcrypt hash), is_admin, created_at, avatar_url.
 * إذا كان اسم عمود كلمة المرور مختلف عندك (مثلاً password_hash)، بدّل
 * كل مكان مكتوب فيه `password` بالاسم الصحيح قبل ما تجرب الكود.
 */

function signToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '30d' });
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url || null };
}

// ===== POST /api/signup =====
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existing, error: lookupError } = await withRetry(() =>
      supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle()
    );
    if (lookupError) {
      console.error('Signup lookup error:', lookupError);
      return res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
    if (existing) {
      return res.status(409).json({ error: 'هذا البريد الإلكتروني مستخدم بالفعل' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: created, error: insertError } = await withRetry(() =>
      supabase
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          email: normalizedEmail,
          password: passwordHash,
          name: name || normalizedEmail.split('@')[0],
        })
        .select('id, email, name, avatar_url')
        .single()
    );
    if (insertError) {
      console.error('Signup insert error:', insertError);
      return res.status(500).json({ error: 'فشل إنشاء الحساب' });
    }

    const token = signToken(created.id);
    res.json({ token, user: publicUser(created) });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

// ===== POST /api/login =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: user, error } = await withRetry(() =>
      supabase.from('users').select('id, email, name, password, avatar_url').eq('email', normalizedEmail).maybeSingle()
    );
    if (error) {
      console.error('Login lookup error:', error);
      return res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
    // نفس رسالة الخطأ لعدم وجود المستخدم أو خطأ كلمة المرور، لمنع اكتشاف بريد مسجّل من عدمه
    if (!user || !user.password) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

// ===== POST /api/google-login =====
router.post('/google-login', async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(503).json({ error: 'تسجيل الدخول عبر جوجل غير مفعّل حاليًا' });
    }
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'بيانات جوجل مطلوبة' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    const normalizedEmail = payload.email.trim().toLowerCase();

    const { data: existing, error: lookupError } = await withRetry(() =>
      supabase.from('users').select('id, email, name, avatar_url').eq('email', normalizedEmail).maybeSingle()
    );
    if (lookupError) {
      console.error('Google login lookup error:', lookupError);
      return res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }

    let user = existing;
    if (!user) {
      // حساب جوجل جديد بدون كلمة مرور محلية (يسجل دايمًا عبر جوجل)
      const { data: created, error: insertError } = await withRetry(() =>
        supabase
          .from('users')
          .insert({ id: crypto.randomUUID(), email: normalizedEmail, name: payload.name || normalizedEmail.split('@')[0], password: null })
          .select('id, email, name, avatar_url')
          .single()
      );
      if (insertError) {
        console.error('Google login insert error:', insertError);
        return res.status(500).json({ error: 'فشل إنشاء الحساب' });
      }
      user = created;
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ error: 'فشل تسجيل الدخول عبر جوجل' });
  }
});

// ===== GET /api/config =====
// إعدادات عامة آمنة يحتاجها الفرونت قبل تسجيل الدخول (Client ID فقط، ليس Secret)
router.get('/config', (req, res) => {
  res.json({ googleClientId: config.googleClientId || null });
});

// ===== GET /api/account =====
router.get('/account', authMiddleware, async (req, res) => {
  const { data, error } = await withRetry(() =>
    supabase.from('users').select('id, email, name, avatar_url').eq('id', req.userId).maybeSingle()
  );
  if (error || !data) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }
  res.json({ user: publicUser(data) });
});

// ===== POST /api/change-password =====
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' });
    }

    const { data: user, error } = await withRetry(() =>
      supabase.from('users').select('id, password').eq('id', req.userId).maybeSingle()
    );
    if (error || !user || !user.password) {
      return res.status(400).json({ error: 'لا يمكن تغيير كلمة المرور لهذا الحساب' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await withRetry(() =>
      supabase.from('users').update({ password: newHash }).eq('id', req.userId)
    );
    if (updateError) {
      console.error('Change password update error:', updateError);
      return res.status(500).json({ error: 'فشل تحديث كلمة المرور' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

// ===== POST /api/account/avatar =====
router.post('/account/avatar', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرسال أي صورة' });
    }
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'الملف المرسل ليس صورة' });
    }

    const fileExt = (req.file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const storagePath = `${req.userId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true, // يستبدل الصورة القديمة لنفس المستخدم بدل ما يراكم ملفات جديدة
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return res.status(500).json({ error: 'فشل رفع الصورة' });
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    // نضيف طابع زمني بنهاية الرابط لإجبار المتصفح يحدّث الصورة المعروضة فورًا (cache-busting)
    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await withRetry(() =>
      supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', req.userId)
    );
    if (updateError) {
      console.error('Avatar db update error:', updateError);
      return res.status(500).json({ error: 'تم رفع الصورة لكن فشل حفظ الرابط' });
    }

    res.json({ avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

export default router;