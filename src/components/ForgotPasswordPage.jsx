import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { API_BASE } from '../../config/api.js';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    fetch(`${API_BASE}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'حدث خطأ');
        setSent(true);
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

        {sent ? (
          <>
            <h1 className="nexo-auth-title">تحقق من بريدك</h1>
            <p className="nexo-auth-subtitle">
              إذا كان هذا البريد الإلكتروني مسجّلاً لدينا، وصلك رابط لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة.
            </p>
            <button type="button" className="nexo-btn nexo-btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/')}>
              العودة لتسجيل الدخول
            </button>
          </>
        ) : (
          <>
            <h1 className="nexo-auth-title">نسيت كلمة المرور؟</h1>
            <p className="nexo-auth-subtitle">
              أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
            </p>

            <form onSubmit={handleSubmit} className="nexo-auth-form">
              <input
                type="email" placeholder="البريد الإلكتروني" value={email}
                onChange={(e) => setEmail(e.target.value)} className="nexo-input" dir="ltr" required
              />

              {error && <div className="nexo-inline-error" style={{ marginTop: 0 }}>{error}</div>}

              <button type="submit" className="nexo-btn nexo-btn-primary" disabled={loading} style={{ width: '100%', padding: 13, marginTop: 2 }}>
                {loading ? 'جارِ الإرسال...' : 'إرسال رابط إعادة التعيين'}
              </button>
            </form>

            <div className="nexo-auth-switch">
              <button type="button" onClick={() => navigate('/')}>العودة لتسجيل الدخول</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}