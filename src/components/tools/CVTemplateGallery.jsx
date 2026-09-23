import { Check } from 'lucide-react';
import { CV_TEMPLATES, CV_FONT_OPTIONS, ACCENT_SWATCHES } from './cvTemplates.js';

export function CVTemplateGallery({ lang, cv, selectedId, onSelect, accent, onAccentChange, fontId, onFontChange }) {
  const t = (ar, en) => (lang === 'en' ? en : ar);

  return (
    <div className="nexo-card cv-gallery-card">
      <h4 className="nexo-card-row-title" style={{ marginBottom: 12 }}>{t('اختر قالب السيرة الذاتية', 'Choose a CV template')}</h4>

      <div className="cv-template-strip">
        {CV_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            className={`cv-template-thumb ${selectedId === tpl.id ? 'active' : ''}`}
            onClick={() => onSelect(tpl.id)}
          >
            <div className={`cv-template-thumb-mock cv-template-thumb-${tpl.layout}`} style={{ '--tpl-accent': tpl.accent }}>
              <span className="cv-template-thumb-bar" />
              <span className="cv-template-thumb-bar short" />
              <span className="cv-template-thumb-bar" />
            </div>
            <span className="cv-template-thumb-name">{lang === 'en' ? tpl.nameEn : tpl.nameAr}</span>
            {selectedId === tpl.id && <span className="cv-template-thumb-check"><Check size={11} /></span>}
          </button>
        ))}
      </div>

      <div className="cv-customize-row">
        <div>
          <div className="cv-customize-label">{t('اللون', 'Color')}</div>
          <div className="cv-swatches">
            {ACCENT_SWATCHES.map((c) => (
              <button
                key={c}
                className={`cv-swatch ${accent === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => onAccentChange(c)}
                title={c}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="cv-customize-label">{t('الخط', 'Font')}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {CV_FONT_OPTIONS.map((f) => (
              <button
                key={f.id}
                className={`nexo-btn nexo-btn-sm ${fontId === f.id ? 'nexo-btn-secondary' : 'nexo-btn-ghost'}`}
                onClick={() => onFontChange(f.id)}
              >
                {lang === 'en' ? f.nameEn : f.nameAr}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}