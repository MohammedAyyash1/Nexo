import { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo.jsx';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const USER_KEY = 'nexo_user';

export function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);
  const [googleBtnWidth, setGoogleBtnWidth] = useState(320);

  useEffect(() => {
    const updateWidth = () => {
      const available = window.innerWidth - 48 - 32;
      setGoogleBtnWidth(Math.max(200, Math.min(320, available)));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const endpoint = mode === 'login' ? '/api/login' : '/api/signup';
    const body = mode === 'login' ? { email, password } : { email, password, name };
    fetch(`${API_BASE}${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'حدث خطأ');
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        onAuthenticated(data.user);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleGoogleResponse = (response) => {
    setError(''); setLoading(true);
    fetch(`${API_BASE}/api/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول عبر جوجل');
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        onAuthenticated(data.user);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/config`)
      .then((res) => res.json())
      .then(({ googleClientId }) => {
        if (!googleClientId || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: googleBtnWidth,
          text: 'continue_with',
        });
      })
      .catch((err) => console.error('Failed to load Google config:', err));
  }, []);

  return (
    <div className="auth-screen-v2">
      <div className="auth-v2-card">
        <div className="auth-v2-logo"><Logo size={40} /></div>
        <h1 className="auth-v2-title">{mode === 'login' ? 'مرحبًا بعودتك' : 'ابدأ رحلتك مع Nexo'}</h1>
        <p className="auth-v2-subtitle">
          {mode === 'login' ? 'سجّل دخولك وتابع إنشاءك.' : 'أنشئ حسابك وابدأ بتحويل أفكارك إلى محتوى مذهل.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <input type="text" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} className="auth-input" />
          )}
          <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" required />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" required />
          
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'جارِ التحقق...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
          </button>
        </form>

        <div className="auth-divider">أو</div>
        <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }}></div>

                {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="/forgot-password" style={{ color: 'var(--accent-2)', fontSize: 13, textDecoration: 'none' }}>
              نسيت كلمة المرور؟
            </a>
          </div>
        )}

        <div className="nexo-auth-switch">
          {mode === 'login' ? (
            <span>ليس لديك حساب؟ <button type="button" onClick={() => { setMode('signup'); setError(''); }}>أنشئ حسابًا</button></span>
          ) : (
            <span>لديك حساب بالفعل؟ <button type="button" onClick={() => { setMode('login'); setError(''); }}>سجّل دخولك</button></span>
          )}
        </div>
      </div>
    </div>
  );
}