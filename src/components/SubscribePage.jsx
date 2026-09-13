import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SubscribeFlow } from './SubscribeFlow.jsx';

const LANG_KEY = 'nexo_lang';
function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function SubscribePage() {
  const navigate = useNavigate();
  const lang = loadLang();

  return (
    <div
      style={{
        minHeight: '100vh', padding: '40px 20px', color: 'var(--text-primary)',
        background: `
          radial-gradient(ellipse 700px 500px at 50% 0%, rgba(var(--accent-1-rgb), 0.14), transparent 55%),
          radial-gradient(ellipse 600px 500px at 100% 100%, rgba(var(--accent-rgb), 0.08), transparent 55%),
          var(--bg-page)
        `,
        backgroundAttachment: 'fixed',
      }}
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      <div style={{
        maxWidth: 440, margin: '0 auto', background: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 28,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)',
      }}>
        <button onClick={() => navigate('/upgrade')} className="settings-inline-btn" style={{ padding: 0, marginBottom: 24 }}>
          <ArrowRight size={14} style={{ transform: lang === 'en' ? 'none' : 'rotate(180deg)' }} />
          {lang === 'en' ? 'Back' : 'رجوع'}
        </button>
        <SubscribeFlow lang={lang} />
      </div>
    </div>
  );
}