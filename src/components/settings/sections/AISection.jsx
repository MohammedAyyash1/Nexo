import { useState, useEffect } from 'react';
import { SettingsSelect } from '../SettingsSelect.jsx';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

const TIER_OPTIONS = [
  { value: 'fast', labelAr: '⚡ سريع', labelEn: '⚡ Fast' },
  { value: 'advanced', labelAr: '🧠 متقدم', labelEn: '🧠 Advanced' },
];

const TIER_DESCRIPTIONS = {
  fast: { ar: 'إجابات فورية وسريعة، مناسب لمعظم الأسئلة اليومية.', en: 'Instant, fast answers — great for everyday questions.' },
  advanced: { ar: 'أقوى قدرة على التحليل والتفكير المعقد، أبطأ شوي.', en: 'Stronger reasoning and deeper analysis, a bit slower.' },
};

const DIALECT_OPTIONS = [
  { value: 'msa', label: 'الفصحى' },
  { value: 'palestinian', label: 'الفلسطينية' },
  { value: 'egyptian', label: 'المصرية' },
  { value: 'syrian', label: 'السورية' },
  { value: 'lebanese', label: 'اللبنانية' },
  { value: 'khaleeji', label: 'الخليجية' },
];

const DIALECT_DESCRIPTIONS = {
  msa: 'Nexo سيرد بالفصحى.',
  palestinian: 'Nexo رح يحكي معك باللهجة الفلسطينية.',
  egyptian: 'Nexo هيرد عليك باللهجة المصرية.',
  syrian: 'Nexo رح يحكي معك باللهجة السورية.',
  lebanese: 'Nexo رح يحكي معك باللهجة اللبنانية.',
  khaleeji: 'Nexo بيرد عليك باللهجة الخليجية.',
};

export function AISection({ lang, showToast }) {
  const [tier, setTier] = useState('fast');
  const [dialect, setDialect] = useState('msa');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/ai`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((res) => {
        setTier(res.data?.model_tier || 'fast');
        setDialect(res.data?.dialect || 'msa');
      })
      .catch((err) => console.error('Load AI settings error:', err))
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = (nextTier, nextDialect) => {
    fetch(`${API_BASE}/api/settings/ai`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
      body: JSON.stringify({ model_tier: nextTier, dialect: nextDialect }),
    })
      .then((res) => res.json())
      .then(() => showToast(lang === 'en' ? 'Saved' : 'تم الحفظ'))
      .catch((err) => console.error('Save AI settings error:', err));
  };

  const handleTierChange = (val) => {
    setTier(val);
    saveSettings(val, dialect);
  };

  const handleDialectChange = (val) => {
    setDialect(val);
    saveSettings(tier, val);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
        <div className="nexo-skeleton nexo-skeleton-line w-60" />
        <div className="nexo-skeleton nexo-skeleton-line w-40" />
      </div>
    );
  }

  return (
    <div className="nexo-settings-block" style={{ borderBottom: 'none' }}>
      <div className="nexo-settings-row">
        <span className="nexo-settings-row-label">{lang === 'en' ? 'Model' : 'النموذج'}</span>
        <SettingsSelect
          value={tier}
          onChange={handleTierChange}
          options={TIER_OPTIONS.map((o) => ({ value: o.value, label: lang === 'en' ? o.labelEn : o.labelAr }))}
        />
      </div>
      <p className="nexo-settings-desc" style={{ marginTop: 8, marginBottom: 20 }}>
        {lang === 'en' ? TIER_DESCRIPTIONS[tier].en : TIER_DESCRIPTIONS[tier].ar}
      </p>

      {lang !== 'en' && (
        <>
          <div className="nexo-settings-row">
            <span className="nexo-settings-row-label">أسلوب الرد بالعربي</span>
            <SettingsSelect
              value={dialect}
              onChange={handleDialectChange}
              options={DIALECT_OPTIONS}
            />
          </div>
          <p className="nexo-settings-desc" style={{ marginTop: 8 }}>
            {DIALECT_DESCRIPTIONS[dialect]}
          </p>
        </>
      )}
    </div>
  );
}