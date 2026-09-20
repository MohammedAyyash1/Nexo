import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { Resend } from 'resend';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env.js';
import { authMiddleware } from '../authMiddleware.js';
import { withRetry } from '../services/withRetry.js';
import { supabase } from '../services/supabaseClient.js';

const router = express.Router();
const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;
const uploadAvatar = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

/**
 * ⚠️ افتراض مهم: هذا الملف مبني على افتراض إنه جدول `users` بـ Supabase
 * فيه الأعمدة التالية: id, email, name, password (bcrypt hash), is_admin,
 * created_at, avatar_url, reset_token, reset_token_expires.
 */

function signToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '30d' });
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url || null };
}

// ===== قالب بريد الترحيب — يُرسل مرة واحدة عند إنشاء حساب جديد =====
function buildWelcomeEmailHtml(name) {
  const displayName = name || 'صديقنا';
  return `
    <div style="margin:0;padding:0;background:#0a0612;font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;padding:40px 20px;direction:rtl;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#1a1424,#14101d);border:1px solid rgba(168,85,247,0.18);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:0;height:4px;background:linear-gradient(90deg,transparent,#7c3aed,#a855f7,transparent);"></td>
          </tr>
          <tr>
            <td style="padding:44px 40px 8px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px;">
                <tr>
                  <td style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#8b5cf6,#7c3aed,#c026d3);text-align:center;vertical-align:middle;box-shadow:0 8px 24px rgba(124,58,237,0.4);">
                    <span style="font-size:26px;line-height:56px;color:#fff;">⚡</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">
                أهلًا بك في Nexo، ${displayName} 👋
              </h1>
              <p style="margin:0;font-size:14.5px;line-height:1.8;color:#a8a2b5;">
                حسابك جاهز الآن. Nexo هو مساعدك الذكي الشامل — محادثة، تحليل مستندات، صور،
                صوت، وأدوات متخصصة، كلها بمكان واحد.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
                    <span style="font-size:13.5px;color:#ececec;">💬 &nbsp; ابدأ محادثة واسأل Nexo عن أي شيء</span>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
                    <span style="font-size:13.5px;color:#ececec;">📄 &nbsp; لخّص مستنداتك أو حلّل بياناتك بثوانٍ</span>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
                    <span style="font-size:13.5px;color:#ececec;">🎙️ &nbsp; حوّل الصوت لنص، أو النص لصوت حقيقي</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 40px 44px;text-align:center;">
              <a href="${config.frontendUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#ffffff;font-size:14.5px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;box-shadow:0 8px 22px rgba(124,58,237,0.35);">
                ابدأ الآن
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:11.5px;color:#6a6275;line-height:1.7;">
                وصلك هذا البريد لأنه تم إنشاء حساب على Nexo بهذا العنوان.<br />
                إذا لم تكن أنت من قام بذلك، يمكنك تجاهل هذه الرسالة بأمان.
              </p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
}

async function sendWelcomeEmail(user) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: 'Nexo <onboarding@resend.dev>',
      to: user.email,
      subject: 'أهلًا بك في Nexo ⚡',
      html: buildWelcomeEmailHtml(user.name),
    });
  } catch (err) {
    // ما بنوقف عملية التسجيل أبدًا بسبب فشل إرسال بريد ترحيبي — هذا تحسين إضافي، مو خطوة حرجة
    console.error('Welcome email send error (non-fatal):', err);
  }
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

    // نرسل بريد الترحيب بالخلفية بعد إرسال الرد — ما نأخّر تسجيل المستخدم بانتظار البريد
    sendWelcomeEmail(created);
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
    let isNewUser = false;
    if (!user) {
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
      isNewUser = true;
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });

    if (isNewUser) sendWelcomeEmail(user);
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ error: 'فشل تسجيل الدخول عبر جوجل' });
  }
});

// ===== GET /api/config =====
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
    const storagePath = `${req.userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return res.status(500).json({ error: 'فشل رفع الصورة' });
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    const avatarUrl = publicUrlData.publicUrl;

    const { data: existingUser } = await supabase.from('users').select('avatar_url').eq('id', req.userId).maybeSingle();

    const { error: updateError } = await withRetry(() =>
      supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', req.userId)
    );
    if (updateError) {
      console.error('Avatar db update error:', updateError);
      return res.status(500).json({ error: 'تم رفع الصورة لكن فشل حفظ الرابط' });
    }

    if (existingUser?.avatar_url) {
      try {
        const oldPath = existingUser.avatar_url.split('/avatars/')[1]?.split('?')[0];
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
      } catch (cleanupErr) {
        console.error('Old avatar cleanup error (non-fatal):', cleanupErr);
      }
    }

    res.json({ avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

// ===== POST /api/forgot-password =====
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const { data: user, error } = await withRetry(() =>
      supabase.from('users').select('id, email, name, password').eq('email', normalizedEmail).maybeSingle()
    );

    const genericResponse = {
      message: 'إذا كان هذا البريد الإلكتروني مسجّلاً لدينا، سيصلك رابط إعادة تعيين كلمة المرور خلال دقائق.',
    };

    if (error || !user || !user.password) {
      return res.json(genericResponse);
    }

    if (!resend) {
      console.error('Forgot password error: RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'خدمة البريد الإلكتروني غير مفعّلة حاليًا' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const { error: updateError } = await withRetry(() =>
      supabase.from('users').update({
        reset_token: resetToken,
        reset_token_expires: expiresAt.toISOString(),
      }).eq('id', user.id)
    );
    if (updateError) {
      console.error('Forgot password token save error:', updateError);
      return res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }

    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    try {
      await resend.emails.send({
        from: 'Nexo <onboarding@resend.dev>',
        to: user.email,
        subject: 'إعادة تعيين كلمة المرور — Nexo',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; direction: rtl;">
            <h2 style="color: #7c3aed;">إعادة تعيين كلمة المرور</h2>
            <p>مرحبًا ${user.name || ''}،</p>
            <p>وصلنا طلب لإعادة تعيين كلمة المرور لحسابك بـ Nexo. اضغط الرابط التالي لإنشاء كلمة مرور جديدة:</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600;">
                إعادة تعيين كلمة المرور
              </a>
            </p>
            <p style="color: #666; font-size: 13px;">هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب هذا، تجاهل هذا البريد ولن يتغيّر شيء بحسابك.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Resend send error:', emailErr);
      return res.status(500).json({ error: 'فشل إرسال البريد الإلكتروني' });
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

// ===== POST /api/reset-password =====
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'الرمز وكلمة المرور الجديدة مطلوبان' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const { data: user, error } = await withRetry(() =>
      supabase.from('users').select('id, reset_token, reset_token_expires').eq('reset_token', token).maybeSingle()
    );

    if (error || !user) {
      return res.status(400).json({ error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' });
    }

    const isExpired = !user.reset_token_expires || new Date(user.reset_token_expires) < new Date();
    if (isExpired) {
      return res.status(400).json({ error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await withRetry(() =>
      supabase.from('users').update({
        password: newHash,
        reset_token: null,
        reset_token_expires: null,
      }).eq('id', user.id)
    );
    if (updateError) {
      console.error('Reset password update error:', updateError);
      return res.status(500).json({ error: 'فشل تحديث كلمة المرور' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

export default router;