import jwt from 'jsonwebtoken';
import { config } from './config/env.js';
import { supabase } from './services/supabaseClient.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة' });
  }
}// middleware إضافي: يُستخدم بعد authMiddleware، يتحقق من صلاحية الأدمن من public.users فقط
// req.userId يجي من التوكن (JWT) الموقّع من السيرفر - لا يمكن للـFrontend التأثير عليه أو تزويره
export async function requireAdmin(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.userId)
      .single();

    if (error || !data || data.is_admin !== true) {
      return res.status(403).json({ success: false, data: null, error: 'صلاحيات غير كافية' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ success: false, data: null, error: 'حدث خطأ داخلي' });
  }
}