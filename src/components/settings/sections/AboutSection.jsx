import { useNavigate } from 'react-router-dom';
import { Sparkles, Heart } from 'lucide-react';

const APP_VERSION = '1.0.0';

export function AboutSection({ lang }) {
  const navigate = useNavigate();

  return (
    <div className="nexo-settings-block" style={{ borderBottom: 'none' }}>
      <div className="nexo-about-logo">
        <div className="nexo-tool-icon-hero" style={{ margin: '0 auto', width: 48, height: 48 }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>N</span>
        </div>
        <h4 style={{ margin: '10px 0 2px', color: 'var(--text-primary)', fontSize: 16 }}>Nexo</h4>
        <p className="nexo-settings-desc" style={{ margin: 0 }}>
          {lang === 'en' ? `Version ${APP_VERSION}` : `الإصدار ${APP_VERSION}`}
        </p>
      </div>

      <div className="nexo-settings-row">
        <span className="nexo-settings-row-label">{lang === 'en' ? 'Build' : 'الإصدار'}</span>
        <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{APP_VERSION}</span>
      </div>

      <p className="nexo-settings-desc" style={{ marginTop: 16, lineHeight: 1.7 }}>
        {lang === 'en'
          ? 'Nexo is your all-in-one AI companion — chat, generate images, and get things done, all in one fast, simple interface.'
          : 'Nexo مساعدك الذكي الشامل — دردشة، توليد صور، وإنجاز مهامك، كل ذلك بواجهة سريعة وبسيطة.'}
      </p>

      <div className="nexo-about-links">
        <a href="/site" target="_blank" rel="noreferrer" className="nexo-btn nexo-btn-secondary nexo-btn-sm">
          <Sparkles size={14} /> {lang === 'en' ? 'Website' : 'الموقع الإلكتروني'}
        </a>
        <button onClick={() => navigate('/features')} className="nexo-btn nexo-btn-secondary nexo-btn-sm">
          <Sparkles size={14} /> {lang === 'en' ? 'Features' : 'المميزات'}
        </button>
      </div>

      <p className="nexo-settings-desc" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
        {lang === 'en' ? 'Made with' : 'صُنع بـ'} <Heart size={12} fill="var(--color-error)" color="var(--color-error)" /> {lang === 'en' ? 'in Palestine' : 'في فلسطين'}
      </p>
    </div>
  );
}