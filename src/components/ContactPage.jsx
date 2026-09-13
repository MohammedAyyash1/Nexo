import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Logo } from './Logo.jsx';

const CONTACT_EMAIL = 'nexo96002@gmail.com';

export function ContactPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CONTACT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="legal-page" dir="rtl">
      <nav className="legal-nav">
        <div className="landing-brand"><Logo size={28} /><span>Nexo</span></div>
        <button className="btn-ghost" onClick={() => navigate('/')}>
          <ArrowRight size={15} /> رجوع للرئيسية
        </button>
      </nav>

      <div className="contact-content">
        <div className="contact-icon"><Mail size={26} /></div>
        <h1>تواصل معنا</h1>
        <p className="legal-updated">لأي استفسار، اقتراح، أو مشكلة تواجهها، راسلنا مباشرة وسنرد عليك بأقرب وقت.</p>

        <div className="contact-email-box">
          <span>{CONTACT_EMAIL}</span>
          <div className="contact-email-actions">
            <button onClick={handleCopy} className="settings-btn" style={{ padding: '6px 12px', fontSize: 12 }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'تم النسخ' : 'نسخ'}
            </button>
            <a href={`mailto:${CONTACT_EMAIL}`} className="btn-primary-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} /> إرسال بريد
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}