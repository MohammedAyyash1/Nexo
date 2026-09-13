import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Logo } from './Logo.jsx';

export function LegalPage({ title, updatedAt, sections }) {
  const navigate = useNavigate();

  return (
    <div className="legal-page" dir="rtl">
      <nav className="legal-nav">
        <div className="landing-brand"><Logo size={28} /><span>Nexo</span></div>
        <button className="btn-ghost" onClick={() => navigate('/')}>
          <ArrowRight size={15} /> رجوع للرئيسية
        </button>
      </nav>

      <div className="legal-content">
        <h1>{title}</h1>
        <p className="legal-updated">آخر تحديث: {updatedAt}</p>

        {sections.map((s, i) => (
          <section key={i} className="legal-section">
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
            {s.list && (
              <ul>
                {s.list.map((item, k) => <li key={k}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}