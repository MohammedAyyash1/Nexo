import { Clock } from 'lucide-react';

export function ComingSoonOverlay({ lang, titleAr, titleEn, reasonAr, reasonEn }) {
  const t = (ar, en) => (lang === 'en' ? en : ar);
  return (
    <div className="nexo-coming-soon-overlay">
      <div className="nexo-state-icon" style={{ width: 52, height: 52, borderRadius: 14 }}>
        <Clock size={24} />
      </div>
      <div className="nexo-state-title" style={{ fontSize: 16, marginTop: 6 }}>
        {titleAr && titleEn ? t(titleAr, titleEn) : t('قريبًا', 'Coming Soon')}
      </div>
      <p className="nexo-state-desc" style={{ maxWidth: 340 }}>
        {reasonAr && reasonEn ? t(reasonAr, reasonEn) : t('هذه الميزة قيد الإعداد حاليًا وستكون متاحة قريبًا.', 'This feature is being prepared and will be available soon.')}
      </p>
    </div>
  );
}