import { useNavigate } from 'react-router-dom';
import { ArrowRight, Film } from 'lucide-react';
import { ComingSoonOverlay } from './ComingSoonOverlay.jsx';

const LANG_KEY = 'nexo_lang';
function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function VideoAnalysisPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Film size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('تحليل الفيديو', 'Video Analysis')}</h1>
          <p className="nexo-tool-page-desc">
            {t('استخراج محتوى، تلخيص، وتحليل الفيديوهات.', 'Extract content, summarize, and analyze videos.')}
          </p>
        </div>
      </div>

      <div className="nexo-card" style={{ position: 'relative', minHeight: 260 }}>
        <ComingSoonOverlay
          lang={lang}
          titleAr="تحليل الفيديو — قريبًا"
          titleEn="Video Analysis — Coming Soon"
          reasonAr="هذه الميزة تحتاج مزوّد ذكاء اصطناعي متخصص بالفيديو. جاري تقييم أفضل خيار بأعلى جودة وأنسب تكلفة."
          reasonEn="This feature requires a specialized video AI provider. We're evaluating the best quality-to-cost option."
        />
      </div>
     </div>
    </div>
  );
}