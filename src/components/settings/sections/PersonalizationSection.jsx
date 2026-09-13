import { useState, useEffect } from 'react';
import { RotateCcw, Check, Loader2 } from 'lucide-react';
import { API_BASE } from '../../../../config/api.js';

const STYLE_OPTIONS = [
  { value: 'default', labelAr: 'افتراضي', labelEn: 'Default' },
  { value: 'professional', labelAr: 'احترافي', labelEn: 'Professional' },
  { value: 'friendly', labelAr: 'ودود', labelEn: 'Friendly' },
  { value: 'casual', labelAr: 'عفوي', labelEn: 'Casual' },
  { value: 'technical', labelAr: 'تقني', labelEn: 'Technical' },
  { value: 'creative', labelAr: 'إبداعي', labelEn: 'Creative' },
];

const DEFAULTS = {
  preferred_name: '',
  occupation: '',
  about_you: '',
  custom_instructions: '',
  style: 'default',
};

const TOKEN_KEY = 'nexo_token';

export function PersonalizationSection({ lang, showToast }) {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/personalization`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((res) => setForm(res.data || DEFAULTS))
      .catch((err) => console.error('Load personalization error:', err))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    setSaving(true);
    fetch(`${API_BASE}/api/personalization`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then((res) => {
        setForm(res.data);
        showToast(lang === 'en' ? 'Saved' : 'تم الحفظ');
      })
      .catch((err) => console.error('Save personalization error:', err))
      .finally(() => setSaving(false));
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      lang === 'en' ? 'Reset all personalization settings to default?' : 'إعادة كل إعدادات التخصيص للوضع الافتراضي؟'
    );
    if (!confirmed) return;
    setForm(DEFAULTS);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
        {[0, 1, 2].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-80" />)}
      </div>
    );
  }

  return (
    <>
      <p className="nexo-settings-desc" style={{ marginBottom: 6 }}>
        {lang === 'en'
          ? 'Customize how Nexo talks to you and what it knows about you.'
          : 'خصّص طريقة تفاعل Nexo معك وشو بيعرف عنك.'}
      </p>

      <div className="nexo-settings-block">
        <h4 className="nexo-settings-title">{lang === 'en' ? 'Preferred name' : 'الاسم المفضل'}</h4>
        <input
          type="text" className="nexo-input" dir="auto"
          value={form.preferred_name}
          onChange={(e) => updateField('preferred_name', e.target.value)}
          placeholder={lang === 'en' ? 'What should Nexo call you?' : 'كيف تحب أن يناديك Nexo؟'}
          maxLength={40}
        />
      </div>

      <div className="nexo-settings-block">
        <h4 className="nexo-settings-title">{lang === 'en' ? 'Occupation' : 'الوظيفة أو الدور'}</h4>
        <input
          type="text" className="nexo-input" dir="auto"
          value={form.occupation}
          onChange={(e) => updateField('occupation', e.target.value)}
          placeholder={lang === 'en' ? 'e.g. Software developer, student...' : 'مثلاً: مطوّر برمجيات، طالب...'}
          maxLength={60}
        />
      </div>

      <div className="nexo-settings-block">
        <h4 className="nexo-settings-title">{lang === 'en' ? 'About you' : 'نبذة عنك'}</h4>
        <textarea
          className="nexo-textarea" dir="auto"
          value={form.about_you}
          onChange={(e) => updateField('about_you', e.target.value)}
          placeholder={lang === 'en' ? 'Interests, background, anything Nexo should know...' : 'اهتماماتك، خلفيتك، أي شي تحب Nexo يعرفه...'}
          maxLength={500}
          rows={4}
        />
        <div className="nexo-char-count">{form.about_you.length}/500</div>
      </div>

      <div className="nexo-settings-block">
        <h4 className="nexo-settings-title">{lang === 'en' ? 'Custom instructions' : 'تعليمات مخصصة'}</h4>
        <p className="nexo-settings-desc">
          {lang === 'en'
            ? 'Specific instructions for how Nexo should respond to you.'
            : 'تعليمات محددة لطريقة رد Nexo عليك.'}
        </p>
        <textarea
          className="nexo-textarea" dir="auto"
          value={form.custom_instructions}
          onChange={(e) => updateField('custom_instructions', e.target.value)}
          placeholder={lang === 'en' ? 'e.g. Always answer in short bullet points...' : 'مثلاً: دايمًا أجب بنقاط مختصرة...'}
          maxLength={800}
          rows={4}
        />
        <div className="nexo-char-count">{form.custom_instructions.length}/800</div>
      </div>

      <div className="nexo-settings-block" style={{ borderBottom: 'none' }}>
        <h4 className="nexo-settings-title">{lang === 'en' ? 'Style & tone' : 'أسلوب الرد'}</h4>
        <div className="nexo-choice-grid">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={`nexo-choice-chip ${form.style === s.value ? 'active' : ''}`}
              onClick={() => updateField('style', s.value)}
            >
              {lang === 'en' ? s.labelEn : s.labelAr}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button className="nexo-btn nexo-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
          {saving ? <Loader2 size={14} className="nexo-spin" /> : <Check size={14} />} {saving ? (lang === 'en' ? 'Saving...' : 'جارِ الحفظ...') : (lang === 'en' ? 'Save changes' : 'حفظ التغييرات')}
        </button>
        <button className="nexo-btn nexo-btn-secondary" onClick={handleReset} style={{ flex: 1 }}>
          <RotateCcw size={14} /> {lang === 'en' ? 'Reset' : 'إعادة تعيين'}
        </button>
      </div>
    </>
  );
}