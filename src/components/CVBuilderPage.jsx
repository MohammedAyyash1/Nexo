import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileUser, Plus, X, Sparkles, Download, Save, Trash2, Loader2, Camera, Inbox, AlertCircle } from 'lucide-react';
import { exportCvAsWord, exportCvAsPdf } from '../utils/cvPdfExport.js';
import { API_BASE } from '../../config/api.js';
import { CV_TEMPLATES, CV_FONT_OPTIONS } from './tools/cvTemplates.js';
import { CVTemplateGallery } from './tools/CVTemplateGallery.jsx';
import { CVLivePreview } from './tools/CVLivePreview.jsx';
import '../styles/cv-preview.css';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const EMPTY_CV = {
  fullName: '', jobTitle: '', email: '', phone: '', location: '', summary: '',
  experience: [], education: [], skills: [], languages: [], photoUrl: '',
};

export function CVBuilderPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [cv, setCv] = useState(EMPTY_CV);
  const [currentCvId, setCurrentCvId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  // ===== حالة التصميم/التخصيص (جديد) - لا يؤثر على شكل البيانات المحفوظة بالـBackend =====
  const [templateId, setTemplateId] = useState(CV_TEMPLATES[0].id);
  const [accentOverride, setAccentOverride] = useState(null);
  const [fontId, setFontId] = useState('sans');
  const selectedTemplate = CV_TEMPLATES.find((tp) => tp.id === templateId) || CV_TEMPLATES[0];
  const selectedFont = CV_FONT_OPTIONS.find((f) => f.id === fontId) || CV_FONT_OPTIONS[0];

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/cv`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.cvs || []))
      .catch((err) => { console.error('Load CVs error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const updateField = (key, value) => setCv((c) => ({ ...c, [key]: value }));
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);
    fetch(`${BASE}/cv/photo`, { method: 'POST', headers: authHeaders(), body: formData })
      .then((res) => res.json())
      .then((data) => { if (data.url) updateField('photoUrl', data.url); })
      .catch((err) => console.error('Photo upload error:', err))
      .finally(() => setUploadingPhoto(false));
  };
  const addExperience = () => setCv((c) => ({ ...c, experience: [...c.experience, { role: '', company: '', period: '', description: '' }] }));
  const updateExperience = (i, key, value) => setCv((c) => ({ ...c, experience: c.experience.map((e, idx) => (idx === i ? { ...e, [key]: value } : e)) }));
  const removeExperience = (i) => setCv((c) => ({ ...c, experience: c.experience.filter((_, idx) => idx !== i) }));

  const addEducation = () => setCv((c) => ({ ...c, education: [...c.education, { degree: '', institution: '', period: '' }] }));
  const updateEducation = (i, key, value) => setCv((c) => ({ ...c, education: c.education.map((e, idx) => (idx === i ? { ...e, [key]: value } : e)) }));
  const removeEducation = (i) => setCv((c) => ({ ...c, education: c.education.filter((_, idx) => idx !== i) }));

  const addSkill = () => {
    if (!skillInput.trim()) return;
    setCv((c) => ({ ...c, skills: [...c.skills, skillInput.trim()] }));
    setSkillInput('');
  };
  const removeSkill = (i) => setCv((c) => ({ ...c, skills: c.skills.filter((_, idx) => idx !== i) }));

  const addLanguage = () => {
    if (!langInput.trim()) return;
    setCv((c) => ({ ...c, languages: [...c.languages, langInput.trim()] }));
    setLangInput('');
  };
  const removeLanguage = (i) => setCv((c) => ({ ...c, languages: c.languages.filter((_, idx) => idx !== i) }));

  const handleEnhanceSummary = () => {
    if (!cv.summary.trim()) return;
    setEnhancing(true);
    fetch(`${BASE}/cv/enhance`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ text: cv.summary, lang }) })
      .then((res) => res.json())
      .then((data) => { if (data.enhancedText) updateField('summary', data.enhancedText); })
      .catch((err) => console.error('Enhance error:', err))
      .finally(() => setEnhancing(false));
  };

  const handleSave = () => {
    setSaving(true);
    const payload = { title: cv.fullName || t('سيرتي الذاتية', 'My CV'), data: cv };
    const request = currentCvId
      ? fetch(`${BASE}/cv/${currentCvId}`, { method: 'PATCH', headers: authHeadersJson(), body: JSON.stringify(payload) })
      : fetch(`${BASE}/cv`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify(payload) });

    request
      .then((res) => res.json())
      .then((data) => {
        const saved = data.cv;
        setCurrentCvId(saved.id);
        loadHistory();
      })
      .catch((err) => console.error('Save CV error:', err))
      .finally(() => setSaving(false));
  };

  const handleLoad = (item) => {
    setCv(item.data);
    setCurrentCvId(item.id);
  };

  const handleDelete = (id) => {
    if (!window.confirm(t('حذف هذه السيرة نهائيًا؟', 'Delete this CV permanently?'))) return;
    fetch(`${BASE}/cv/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentCvId === id) { setCv(EMPTY_CV); setCurrentCvId(null); }
      })
      .catch((err) => console.error('Delete CV error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السير الذاتية نهائيًا؟', 'Delete all CVs permanently?'))) return;
    fetch(`${BASE}/cv`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCv(EMPTY_CV); setCurrentCvId(null); })
      .catch((err) => console.error('Delete all CVs error:', err));
  };

  const handleExportWord = () => exportCvAsWord(cv, lang, selectedTemplate, accentOverride, selectedFont.stack);
  const handleExportPdf = () => exportCvAsPdf(cv, lang, selectedTemplate, accentOverride, selectedFont.stack);

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner" style={{ maxWidth: 1240 }}>
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><FileUser size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('منشئ السيرة الذاتية', 'CV Builder')}</h1>
          <p className="nexo-tool-page-desc">
            {t('اختر قالبًا، عبّي بياناتك، وشوف سيرتك الذاتية تتكوّن مباشرة أمامك.', 'Pick a template, fill your info, and watch your CV take shape live.')}
          </p>
        </div>
      </div>

      <CVTemplateGallery
        lang={lang} cv={cv} selectedId={templateId} onSelect={setTemplateId}
        accent={accentOverride} onAccentChange={setAccentOverride}
        fontId={fontId} onFontChange={setFontId}
      />

      <div className="cv-builder-layout">
        <div>
          {/* ===== المعلومات الأساسية ===== */}
          <div className="nexo-card" style={{ marginBottom: 20 }}>
            <h4 className="nexo-card-row-title" style={{ marginBottom: 16 }}>{t('المعلومات الأساسية', 'Basic Info')}</h4>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <label className="nexo-avatar-upload">
                {cv.photoUrl ? (
                  <img src={cv.photoUrl} alt="" />
                ) : uploadingPhoto ? (
                  <Loader2 size={20} className="nexo-spin" />
                ) : (
                  <Camera size={20} color="var(--text-secondary)" />
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <div className="nexo-form-row">
              <input className="nexo-input" dir="auto" placeholder={t('الاسم الكامل', 'Full name')} value={cv.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
              <input className="nexo-input" dir="auto" placeholder={t('المسمى الوظيفي', 'Job title')} value={cv.jobTitle} onChange={(e) => updateField('jobTitle', e.target.value)} />
            </div>
            <div className="nexo-form-row" style={{ marginTop: 10 }}>
              <input className="nexo-input" dir="auto" placeholder={t('البريد الإلكتروني', 'Email')} value={cv.email} onChange={(e) => updateField('email', e.target.value)} />
              <input className="nexo-input" dir="auto" placeholder={t('الهاتف', 'Phone')} value={cv.phone} onChange={(e) => updateField('phone', e.target.value)} />
              <input className="nexo-input" dir="auto" placeholder={t('المدينة/البلد', 'City/Country')} value={cv.location} onChange={(e) => updateField('location', e.target.value)} />
            </div>
          </div>

          {/* ===== نبذة مختصرة ===== */}
          <div className="nexo-card" style={{ marginBottom: 20 }}>
            <div className="nexo-card-row-header">
              <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('نبذة مختصرة', 'Summary')}</h4>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleEnhanceSummary} disabled={enhancing || !cv.summary.trim()}>
                {enhancing ? <Loader2 size={13} className="nexo-spin" /> : <Sparkles size={13} />} {t('تحسين بالذكاء الاصطناعي', 'Enhance with AI')}
              </button>
            </div>
            <textarea className="nexo-textarea" dir="auto" rows={4} value={cv.summary} onChange={(e) => updateField('summary', e.target.value)} placeholder={t('لخّص خبرتك ونقاط قوتك بجملتين إلى ثلاث...', 'Summarize your experience and strengths in 2-3 sentences...')} />
          </div>

          {/* ===== الخبرات العملية ===== */}
          <div className="nexo-card" style={{ marginBottom: 20 }}>
            <div className="nexo-card-row-header">
              <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('الخبرات العملية', 'Experience')}</h4>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={addExperience}><Plus size={15} /></button>
            </div>
            {cv.experience.length === 0 && (
              <p className="nexo-list-item-sub" style={{ padding: '4px 2px' }}>{t('ما ضفت خبرات بعد — اضغط + لإضافة أول خبرة.', "You haven't added experience yet — click + to add one.")}</p>
            )}
            {cv.experience.map((exp, i) => (
              <div key={i} className="nexo-subcard">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => removeExperience(i)}><X size={13} /></button>
                </div>
                <div className="nexo-form-row">
                  <input className="nexo-input" dir="auto" placeholder={t('المسمى الوظيفي', 'Role')} value={exp.role} onChange={(e) => updateExperience(i, 'role', e.target.value)} />
                  <input className="nexo-input" dir="auto" placeholder={t('الشركة', 'Company')} value={exp.company} onChange={(e) => updateExperience(i, 'company', e.target.value)} />
                  <input className="nexo-input" dir="auto" placeholder={t('الفترة (مثلاً 2022-2024)', 'Period (e.g. 2022-2024)')} value={exp.period} onChange={(e) => updateExperience(i, 'period', e.target.value)} />
                </div>
                <textarea className="nexo-textarea" dir="auto" rows={2} style={{ marginTop: 10 }} placeholder={t('وصف مختصر للمهام والإنجازات', 'Brief description of duties and achievements')} value={exp.description} onChange={(e) => updateExperience(i, 'description', e.target.value)} />
              </div>
            ))}
          </div>

          {/* ===== التعليم ===== */}
          <div className="nexo-card" style={{ marginBottom: 20 }}>
            <div className="nexo-card-row-header">
              <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('التعليم', 'Education')}</h4>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={addEducation}><Plus size={15} /></button>
            </div>
            {cv.education.length === 0 && (
              <p className="nexo-list-item-sub" style={{ padding: '4px 2px' }}>{t('ما ضفت مؤهلات تعليمية بعد.', 'No education added yet.')}</p>
            )}
            {cv.education.map((edu, i) => (
              <div key={i} className="nexo-form-row" style={{ marginBottom: 10, alignItems: 'center' }}>
                <input className="nexo-input" dir="auto" placeholder={t('الشهادة', 'Degree')} value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} />
                <input className="nexo-input" dir="auto" placeholder={t('الجامعة/المعهد', 'Institution')} value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)} />
                <input className="nexo-input" dir="auto" placeholder={t('السنة', 'Year')} value={edu.period} onChange={(e) => updateEducation(i, 'period', e.target.value)} />
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => removeEducation(i)}><X size={13} /></button>
              </div>
            ))}
          </div>

          {/* ===== المهارات واللغات ===== */}
          <div className="nexo-cv-half-row" style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div className="nexo-card nexo-cv-half-card">
              <h4 className="nexo-card-row-title" style={{ marginBottom: 12 }}>{t('المهارات', 'Skills')}</h4>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input className="nexo-input" dir="auto" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill()} placeholder={t('اكتب مهارة واضغط Enter', 'Type a skill and press Enter')} />
                <button className="nexo-btn nexo-btn-secondary nexo-btn-icon" onClick={addSkill}><Plus size={15} /></button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cv.skills.map((s, i) => (
                  <span key={i} className="nexo-chip" dir="auto">
                    {s} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeSkill(i)} />
                  </span>
                ))}
              </div>
            </div>

            <div className="nexo-card nexo-cv-half-card">
              <h4 className="nexo-card-row-title" style={{ marginBottom: 12 }}>{t('اللغات', 'Languages')}</h4>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input className="nexo-input" dir="auto" value={langInput} onChange={(e) => setLangInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLanguage()} placeholder={t('اكتب لغة واضغط Enter', 'Type a language and press Enter')} />
                <button className="nexo-btn nexo-btn-secondary nexo-btn-icon" onClick={addLanguage}><Plus size={15} /></button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cv.languages.map((l, i) => (
                  <span key={i} className="nexo-chip" dir="auto">
                    {l} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeLanguage(i)} />
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ===== أزرار الحفظ والتصدير ===== */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
            <button className="nexo-btn nexo-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, minWidth: 140 }}>
              {saving ? <Loader2 size={14} className="nexo-spin" /> : <Save size={14} />} {saving ? t('جارِ الحفظ...', 'Saving...') : t('حفظ', 'Save')}
            </button>
            <button className="nexo-btn nexo-btn-secondary" onClick={handleExportWord} style={{ flex: 1, minWidth: 140 }}>
              <Download size={14} /> Word
            </button>
            <button className="nexo-btn nexo-btn-secondary" onClick={handleExportPdf} style={{ flex: 1, minWidth: 140 }}>
              <Download size={14} /> PDF
            </button>
          </div>

          {/* ===== السير الذاتية المحفوظة ===== */}
          <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
            <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('سيري الذاتية المحفوظة', 'Saved CVs')}</h3>
            {history.length > 0 && (
              <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>
                {t('مسح الكل', 'Clear all')}
              </button>
            )}
          </div>

          {loadingHistory ? (
            <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
            </div>
          ) : historyError ? (
            <div className="nexo-card">
              <div className="nexo-state nexo-state-error">
                <div className="nexo-state-icon"><AlertCircle size={20} /></div>
                <div className="nexo-state-title">{t('تعذّر تحميل السجل', 'Could not load saved CVs')}</div>
                <div className="nexo-state-desc">{t('تأكد من اتصالك وحاول مرة أخرى.', 'Check your connection and try again.')}</div>
                <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={loadHistory}>{t('إعادة المحاولة', 'Retry')}</button>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="nexo-card">
              <div className="nexo-state">
                <div className="nexo-state-icon"><Inbox size={20} /></div>
                <div className="nexo-state-title">{t('لا يوجد سير ذاتية محفوظة بعد', 'No saved CVs yet')}</div>
                <div className="nexo-state-desc">{t('عبّي البيانات فوق واضغط حفظ.', 'Fill in the info above and click Save.')}</div>
              </div>
            </div>
          ) : (
            <ul className="nexo-list">
              {history.map((item) => (
                <li key={item.id} className="nexo-list-item">
                  <div className="nexo-list-item-main" onClick={() => handleLoad(item)} style={{ cursor: 'pointer' }}>
                    <div className="nexo-list-item-title" dir="auto">{item.title}</div>
                  </div>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ===== العارض الحي (جديد) ===== */}
        <div className="cv-preview-sticky">
          <CVLivePreview cv={cv} template={selectedTemplate} accent={accentOverride} fontStack={selectedFont.stack} />
        </div>
      </div>
     </div>
    </div>
  );
}