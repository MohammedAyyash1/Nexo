import { Clock } from 'lucide-react';

export function ComingSoonOverlay({ lang, titleAr, titleEn, reasonAr, reasonEn }) {
  const t = (ar, en) => (lang === 'en' ? en : ar);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(10, 8, 20, 0.88)', backdropFilter: 'blur(3px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: 32, borderRadius: 14, zIndex: 5,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: 'rgba(var(--accent-rgb), 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Clock size={24} color="var(--accent-2)" />
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 17, color: 'var(--text-primary)' }}>{titleAr && titleEn ? t(titleAr, titleEn) : t('قريبًا', 'Coming Soon')}</h3>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 340, lineHeight: 1.7 }}>
        {reasonAr && reasonEn ? t(reasonAr, reasonEn) : t('هذه الميزة قيد الإعداد حاليًا وستكون متاحة قريبًا.', 'This feature is being prepared and will be available soon.')}
      </p>
    </div>
  );
}