import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { API_BASE } from '../../config/api.js';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('رابط إعادة التعيين غير صالح.');
      return;
    }
    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'حدث خطأ');
        setDone(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="nexo-auth-page">
      <div className="nexo-auth-card">
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 220, height: 220, top: -70, insetInlineEnd: -50 }} />
        <span className="nexo-glow-orb nexo-glow-orb-pink" style={{ width: 160, height: 160, bottom: -50, insetInlineStart: -40 }} />

        <div className="nexo-auth-logo"><Logo size={40} /></div>

        {done ? (
          <>
            <h1 className="nexo-auth-title">تم بنجاح</h1>
            <p className="nexo-auth-subtitle">تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
            <button type="button" className="nexo-btn nexo-btn-primary" style={{ width: '100%' }} onClick={() => navigate('/')}>
              تسجيل الدخول
            </button>
          </>
        ) : !token ? (
          <>
            <h1 className="nexo-auth-title">رابط غير صالح</h1>
            <p className="nexo-auth-subtitle">هذا الرابط غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا لإعادة تعيين كلمة المرور.</p>
            <button type="button" className="nexo-btn nexo-btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/forgot-password')}>
              طلب رابط جديد
            </button>
          </>
        ) : (
          <>
            <h1 className="nexo-auth-title">كلمة مرور جديدة</h1>
            <p className="nexo-auth-subtitle">أدخل كلمة المرور الجديدة لحسابك.</p>

            <form onSubmit={handleSubmit} className="nexo-auth-form">
              <input
                type="password" placeholder="كلمة المرور الجديدة" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} className="nexo-input" required
              />
              <input
                type="password" placeholder="تأكيد كلمة المرور الجديدة" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} className="nexo-input" required
              />

              {error && <div className="nexo-inline-error" style={{ marginTop: 0 }}>{error}</div>}

              <button type="submit" className="nexo-btn nexo-btn-primary" disabled={loading} style={{ width: '100%', padding: 13, marginTop: 2 }}>
                {loading ? 'جارِ الحفظ...' : 'تحديث كلمة المرور'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}