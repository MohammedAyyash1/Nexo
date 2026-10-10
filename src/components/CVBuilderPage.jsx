import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, FileUser, Plus, X, Sparkles, Download, Save, Trash2, Loader2, Camera, Inbox, AlertCircle,
  User, FileText, Briefcase, GraduationCap, Award, Languages, FolderKanban, BadgeCheck, CheckCircle2,
  Copy, ShieldCheck, Circle, AlertTriangle,
} from 'lucide-react';
import { exportCvAsWord, exportCvAsPdf } from '../utils/cvPdfExport.js';
import { API_BASE } from '../../config/api.js';
import { CV_TEMPLATES, CV_FONT_OPTIONS } from './tools/cvTemplates.js';
import { CVTemplateGallery } from './tools/CVTemplateGallery.jsx';
import { CVLivePreview } from './tools/CVLivePreview.jsx';
import { computeCompletion, computeAtsCheck, firstIncompleteSection } from './tools/cvScoring.js';
import '../styles/cv-preview.css';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const EMPTY_CV = {
  fullName: '', jobTitle: '', email: '', phone: '', location: '', website: '', linkedin: '', summary: '',
  experience: [], education: [], skills: [], languages: [], projects: [], certifications: [], photoUrl: '',
};

function CvAmbientScene() {
  const miniSheet = (variant, lines) => (
    <div className={`cv-mini-sheet ${variant || ''}`}>
      <div className="cv-mini-head"><span className="cv-mini-avatar" /><div className="cv-mini-headlines"><span /><span /></div></div>
      {lines.map((w, i) => <span key={i} className={`cv-mini-line ${w}`} />)}
      <span className="cv-mini-tag" />
    </div>
  );
  return (
    <div className="cv-scene" aria-hidden="true">
      <div className="cv-scene-grid" />
      <span className="cv-scene-blob cv-scene-blob-1" />
      <span className="cv-scene-blob cv-scene-blob-2" />
      <span className="cv-scene-blob cv-scene-blob-3" />
      <span className="cv-scene-blob cv-scene-blob-4" />
      <div className="cv-scene-sheet cv-scene-sheet-a">{miniSheet('', ['w90', 'w80', 'w70'])}</div>
      <div className="cv-scene-sheet cv-scene-sheet-b">{miniSheet('cv-mini-sheet-dark', ['w80', 'w55'])}</div>
      <div className="cv-scene-sheet cv-scene-sheet-c">{miniSheet('cv-mini-sheet-pink', ['w90', 'w70'])}</div>
      <span className="cv-scene-float cv-scene-float-1"><Briefcase size={18} /></span>
      <span className="cv-scene-float cv-scene-float-2"><GraduationCap size={18} /></span>
      <span className="cv-scene-float cv-scene-float-3"><Award size={18} /></span>
      <span className="cv-scene-float cv-scene-float-4"><FileText size={18} /></span>
      <span className="cv-scene-float cv-scene-float-5"><Sparkles size={18} /></span>
    </div>
  );
}

function CvHeroBanner({ t }) {
  const miniSheet = (variant, lines) => (
    <div className={`cv-mini-sheet ${variant || ''}`}>
      <div className="cv-mini-head"><span className="cv-mini-avatar" /><div className="cv-mini-headlines"><span /><span /></div></div>
      {lines.map((w, i) => <span key={i} className={`cv-mini-line ${w}`} />)}
      <span className="cv-mini-tag" />
    </div>
  );
  return (
    <div className="cv-hero-banner">
      <div className="cv-hero-copy">
        <span className="cv-hero-kicker"><Sparkles size={12} /> {t('منشئ سيرة ذاتية احترافي', 'Professional CV Builder')}</span>
        <h2>{t('سيرة ذاتية تفتح لك الأبواب', 'A CV that opens doors')}</h2>
        <p>{t('اختر قالبًا، عبّي بياناتك، ونزّل سيرة PDF احترافية جاهزة للتقديم مباشرة — من الكمبيوتر أو الجوال.', 'Pick a template, fill your info, and download a professional PDF ready to submit — from desktop or mobile.')}</p>
        <div className="cv-hero-points">
          <span><CheckCircle2 size={13} /> {t('تصاميم متعددة', 'Multiple designs')}</span>
          <span><CheckCircle2 size={13} /> {t('صفحات A4 حقيقية', 'Real A4 pages')}</span>
          <span><CheckCircle2 size={13} /> {t('حفظ سهل على الجوال', 'Easy mobile saving')}</span>
        </div>
      </div>
      <div className="cv-hero-art">
        <div className="cv-hero-art-s2">{miniSheet('cv-mini-sheet-dark', ['w80', 'w55'])}</div>
        <div className="cv-hero-art-s1">{miniSheet('', ['w90', 'w70'])}</div>
        <div className="cv-hero-art-s3">{miniSheet('cv-mini-sheet-pink', ['w80', 'w70'])}</div>
        <span className="cv-hero-chip cv-hero-chip-a">PDF</span>
        <span className="cv-hero-chip cv-hero-chip-b">A4</span>
        <span className="cv-hero-chip cv-hero-chip-c">PRO</span>
      </div>
    </div>
  );
}

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
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [atsOpen, setAtsOpen] = useState(false);

  const [saveStatus, setSaveStatus] = useState('idle');
  const [toast, setToast] = useState('');
  const isFirstRender = useRef(true);
  const skipDirtyRef = useRef(false);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (skipDirtyRef.current) { skipDirtyRef.current = false; return; }
    setSaveStatus('dirty');
  }, [cv]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const [templateId, setTemplateId] = useState(CV_TEMPLATES[0].id);
  const [accentOverride, setAccentOverride] = useState(null);
  const [fontId, setFontId] = useState('sans');
  const selectedTemplate = CV_TEMPLATES.find((tp) => tp.id === templateId) || CV_TEMPLATES[0];
  const selectedFont = CV_FONT_OPTIONS.find((f) => f.id === fontId) || CV_FONT_OPTIONS[0];

  // ===== Completion Score + ATS Check: محسوبة محليًا بالكامل، بدون AI وبدون API =====
  const isEmptyCv = !cv.fullName.trim() && !cv.summary.trim() && cv.experience.length === 0 && cv.education.length === 0 && cv.skills.length === 0;
  const completion = useMemo(() => computeCompletion(cv), [cv]);
  const ats = useMemo(() => computeAtsCheck(cv, selectedTemplate), [cv, selectedTemplate]);
  const scoreColor = (score) => (score >= 80 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-error)');

  const sectionRefs = {
    personal: useRef(null),
    summary: useRef(null),
    experience: useRef(null),
    education: useRef(null),
    skills: useRef(null),
    projects: useRef(null),
    certifications: useRef(null),
  };

  const handleImproveCv = () => {
    const key = firstIncompleteSection(completion);
    if (!key) return;
    sectionRefs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const normalizeCv = (data) => ({ ...EMPTY_CV, ...data });

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

  const addProject = () => setCv((c) => ({ ...c, projects: [...c.projects, { name: '', description: '', link: '' }] }));
  const updateProject = (i, key, value) => setCv((c) => ({ ...c, projects: c.projects.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)) }));
  const removeProject = (i) => setCv((c) => ({ ...c, projects: c.projects.filter((_, idx) => idx !== i) }));

  const addCertification = () => setCv((c) => ({ ...c, certifications: [...c.certifications, { name: '', issuer: '', year: '' }] }));
  const updateCertification = (i, key, value) => setCv((c) => ({ ...c, certifications: c.certifications.map((cert, idx) => (idx === i ? { ...cert, [key]: value } : cert)) }));
  const removeCertification = (i) => setCv((c) => ({ ...c, certifications: c.certifications.filter((_, idx) => idx !== i) }));

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
    setSaveStatus('saving');
    const payload = { title: cv.fullName || t('سيرتي الذاتية', 'My CV'), data: cv };
    const request = currentCvId
      ? fetch(`${BASE}/cv/${currentCvId}`, { method: 'PATCH', headers: authHeadersJson(), body: JSON.stringify(payload) })
      : fetch(`${BASE}/cv`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify(payload) });

    request
      .then((res) => res.json())
      .then((data) => {
        const saved = data.cv;
        setCurrentCvId(saved.id);
        setSaveStatus('saved');
        showToast(t('تم حفظ سيرتك الذاتية بنجاح', 'Your CV was saved successfully'));
        loadHistory();
      })
      .catch((err) => { console.error('Save CV error:', err); setSaveStatus('error'); })
      .finally(() => setSaving(false));
  };

  const handleLoad = (item) => {
    skipDirtyRef.current = true;
    setCv(normalizeCv(item.data));
    setCurrentCvId(item.id);
    setSaveStatus('saved');
  };

  // ===== Duplicate CV: بنفس Endpoint الموجود (POST /api/cv) — نسخة مستقلة بالكامل بقاعدة البيانات =====
  const handleDuplicate = (item) => {
    setDuplicatingId(item.id);
    const payload = { title: `${item.title} ${t('(نسخة)', '(Copy)')}`, data: item.data };
    fetch(`${BASE}/cv`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify(payload) })
      .then((res) => res.json())
      .then(() => {
        showToast(t('تم إنشاء نسخة مستقلة من السيرة الذاتية', 'An independent copy of the CV was created'));
        loadHistory();
      })
      .catch((err) => console.error('Duplicate CV error:', err))
      .finally(() => setDuplicatingId(null));
  };

  const handleDelete = (id) => {
    if (!window.confirm(t('حذف هذه السيرة نهائيًا؟', 'Delete this CV permanently?'))) return;
    fetch(`${BASE}/cv/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentCvId === id) {
          skipDirtyRef.current = true;
          setCv(EMPTY_CV);
          setCurrentCvId(null);
          setSaveStatus('idle');
        }
      })
      .catch((err) => console.error('Delete CV error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السير الذاتية نهائيًا؟', 'Delete all CVs permanently?'))) return;
    fetch(`${BASE}/cv`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory([]);
        skipDirtyRef.current = true;
        setCv(EMPTY_CV);
        setCurrentCvId(null);
        setSaveStatus('idle');
      })
      .catch((err) => console.error('Delete all CVs error:', err));
  };

  const handleExportWord = () => {
    exportCvAsWord(cv, lang, selectedTemplate, accentOverride, selectedFont.stack);
    showToast(t('جارِ تنزيل ملف Word...', 'Downloading Word file...'));
  };
  const handleExportPdf = () => {
    exportCvAsPdf(cv, lang, selectedTemplate, accentOverride, selectedFont.stack);
    showToast(t('افتحت شاشة الطباعة — اختر "حفظ كـ PDF"', 'Print screen opened — choose "Save as PDF"'));
  };

  const saveStatusNode = () => {
    if (saveStatus === 'saving') return <span className="cv-save-status cv-save-status-saving"><Loader2 size={12} className="nexo-spin" /> {t('جارِ الحفظ...', 'Saving...')}</span>;
    if (saveStatus === 'saved') return <span className="cv-save-status cv-save-status-saved"><CheckCircle2 size={12} /> {t('تم الحفظ', 'Saved')}</span>;
    if (saveStatus === 'dirty') return <span className="cv-save-status cv-save-status-dirty">{t('تغييرات غير محفوظة', 'Unsaved changes')}</span>;
    if (saveStatus === 'error') return <span className="cv-save-status cv-save-status-error"><AlertCircle size={12} /> {t('فشل الحفظ', 'Save failed')}</span>;
    return null;
  };

  const completionStatusIcon = (status) => (
    status === 'done' ? <CheckCircle2 size={13} /> : status === 'partial' ? <AlertTriangle size={13} /> : <Circle size={13} />
  );
  const atsStatusIcon = (status) => (
    status === 'good' ? <CheckCircle2 size={14} /> : status === 'review' ? <AlertTriangle size={14} /> : <AlertCircle size={14} />
  );

  return (
    <div className="nexo-tool-page cv-builder-ambient-bg">
      <CvAmbientScene />
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

      <CvHeroBanner t={t} />

      <CVTemplateGallery
        lang={lang} cv={cv} selectedId={templateId} onSelect={setTemplateId}
        accent={accentOverride} onAccentChange={setAccentOverride}
        fontId={fontId} onFontChange={setFontId}
      />

      {/* ===== بطاقة صحة السيرة الذاتية: اكتمال + ATS — جزء من نفس تجربة البناء ===== */}
      {isEmptyCv ? (
        <div className="nexo-card cv-health-card cv-health-empty" style={{ marginBottom: 20 }}>
          <Sparkles size={20} color="var(--accent-2)" />
          <div>
            <div className="cv-health-empty-title">{t('لنبدأ ببناء سيرتك الذاتية', "Let's start building your CV")}</div>
            <div className="cv-health-empty-desc">{t('عبّي معلوماتك الأساسية أول شي، وبعدين الخبرات والتعليم — سيرتك رح تتكوّن تدريجيًا.', 'Fill in your basic info first, then experience and education — your CV will take shape gradually.')}</div>
          </div>
        </div>
      ) : (
        <div className="nexo-card cv-health-card" style={{ marginBottom: 20 }}>
          <div className="cv-health-top">
            <div className="cv-health-metric">
              <span className="cv-health-label">{t('اكتمال السيرة الذاتية', 'CV Completion')}</span>
              <span className="cv-health-percent" style={{ color: scoreColor(completion.total) }}>{completion.total}%</span>
            </div>
            <div className="cv-completion-bar"><div className="cv-completion-fill" style={{ width: `${completion.total}%`, background: scoreColor(completion.total) }} /></div>
            <div className="cv-completion-list">
              {completion.sections.map((s) => (
                <span key={s.key} className={`cv-completion-item cv-completion-${s.status}`}>
                  {completionStatusIcon(s.status)} {t(s.label, s.label)}
                </span>
              ))}
            </div>
          </div>

          <div className="cv-health-actions">
            <button className="nexo-btn nexo-btn-primary nexo-btn-sm" onClick={handleImproveCv} disabled={completion.total === 100}>
              <Sparkles size={13} /> {t('تحسين سيرتي', 'Improve my CV')}
            </button>
            <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={() => setAtsOpen((o) => !o)}>
              <ShieldCheck size={13} /> {t('فحص توافق ATS', 'ATS Check')} · {ats.score}%
            </button>
          </div>

          {atsOpen && (
            <div className="cv-ats-panel">
              <div className="cv-ats-panel-head">
                <span>{t('نتيجة توافق ATS', 'ATS Readiness')}</span>
                <span className="cv-ats-panel-score" style={{ color: scoreColor(ats.score) }}>{ats.score}%</span>
              </div>
              <p className="cv-ats-disclaimer">
                {t('هاد تقدير مبني على قواعد عامة ومعروفة، مش ضمان قبول من أي نظام ATS فعلي حقيقي.', 'This is an estimate based on general, known rules — not a guarantee of acceptance by any specific real ATS system.')}
              </p>
              <ul className="cv-ats-checklist">
                {ats.checks.map((c) => (
                  <li key={c.key} className={`cv-ats-check-row cv-ats-${c.status}`}>
                    {atsStatusIcon(c.status)} <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="cv-builder-layout">
        <div>
          {/* ===== المعلومات الأساسية ===== */}
          <div className="nexo-card" style={{ marginBottom: 20 }} ref={sectionRefs.personal}>
<h4 className="nexo-card-row-title cv-section-title-icon" style={{ marginBottom: 16 }}><User size={15} /> {t('المعلومات الأساسية', 'Basic Info')}</h4>
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
            <div className="nexo-form-row" style={{ marginTop: 10 }}>
              <input className="nexo-input" dir="auto" placeholder={t('الموقع الإلكتروني (اختياري)', 'Website (optional)')} value={cv.website} onChange={(e) => updateField('website', e.target.value)} />
              <input className="nexo-input" dir="auto" placeholder={t('رابط LinkedIn (اختياري)', 'LinkedIn URL (optional)')} value={cv.linkedin} onChange={(e) => updateField('linkedin', e.target.value)} />
            </div>
          </div>

          {/* ===== نبذة مختصرة ===== */}
          <div className="nexo-card" style={{ marginBottom: 20 }} ref={sectionRefs.summary}>
            <div className="nexo-card-row-header">
<h4 className="nexo-card-row-title cv-section-title-icon" style={{ margin: 0 }}><FileText size={15} /> {t('نبذة مختصرة', 'Summary')}</h4>              <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleEnhanceSummary} disabled={enhancing || !cv.summary.trim()}>
                {enhancing ? <Loader2 size={13} className="nexo-spin" /> : <Sparkles size={13} />} {t('تحسين بالذكاء الاصطناعي', 'Enhance with AI')}
              </button>
            </div>
            <textarea className="nexo-textarea" dir="auto" rows={4} value={cv.summary} onChange={(e) => updateField('summary', e.target.value)} placeholder={t('لخّص خبرتك ونقاط قوتك بجملتين إلى ثلاث...', 'Summarize your experience and strengths in 2-3 sentences...')} />
          </div>

          {/* ===== الخبرات العملية ===== */}
          <div className="nexo-card" style={{ marginBottom: 20 }} ref={sectionRefs.experience}>
            <div className="nexo-card-row-header">
<h4 className="nexo-card-row-title cv-section-title-icon" style={{ margin: 0 }}><Briefcase size={15} /> {t('الخبرات العملية', 'Experience')}</h4>              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={addExperience}><Plus size={15} /></button>
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
          <div className="nexo-card" style={{ marginBottom: 20 }} ref={sectionRefs.education}>
            <div className="nexo-card-row-header">
<h4 className="nexo-card-row-title cv-section-title-icon" style={{ margin: 0 }}><GraduationCap size={15} /> {t('التعليم', 'Education')}</h4>              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={addEducation}><Plus size={15} /></button>
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

          {/* ===== المشاريع ===== */}
          <div className="nexo-card" style={{ marginBottom: 20 }} ref={sectionRefs.projects}>
            <div className="nexo-card-row-header">
<h4 className="nexo-card-row-title cv-section-title-icon" style={{ margin: 0 }}><FolderKanban size={15} /> {t('المشاريع', 'Projects')}</h4>              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={addProject}><Plus size={15} /></button>
            </div>
            {cv.projects.length === 0 && (
              <p className="nexo-list-item-sub" style={{ padding: '4px 2px' }}>{t('ما ضفت مشاريع بعد — اختياري، بس بيغني سيرتك الذاتية.', "You haven't added projects yet — optional, but enriches your CV.")}</p>
            )}
            {cv.projects.map((p, i) => (
              <div key={i} className="nexo-subcard">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => removeProject(i)}><X size={13} /></button>
                </div>
                <div className="nexo-form-row">
                  <input className="nexo-input" dir="auto" placeholder={t('اسم المشروع', 'Project name')} value={p.name} onChange={(e) => updateProject(i, 'name', e.target.value)} />
                  <input className="nexo-input" dir="auto" placeholder={t('رابط (اختياري)', 'Link (optional)')} value={p.link} onChange={(e) => updateProject(i, 'link', e.target.value)} />
                </div>
                <textarea className="nexo-textarea" dir="auto" rows={2} style={{ marginTop: 10 }} placeholder={t('وصف مختصر للمشروع ودورك فيه', 'Brief description of the project and your role')} value={p.description} onChange={(e) => updateProject(i, 'description', e.target.value)} />
              </div>
            ))}
          </div>

          {/* ===== الشهادات والدورات ===== */}
          <div className="nexo-card" style={{ marginBottom: 20 }} ref={sectionRefs.certifications}>
            <div className="nexo-card-row-header">
<h4 className="nexo-card-row-title cv-section-title-icon" style={{ margin: 0 }}><BadgeCheck size={15} /> {t('الشهادات والدورات', 'Certifications')}</h4>              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={addCertification}><Plus size={15} /></button>
            </div>
            {cv.certifications.length === 0 && (
              <p className="nexo-list-item-sub" style={{ padding: '4px 2px' }}>{t('ما ضفت شهادات بعد.', 'No certifications added yet.')}</p>
            )}
            {cv.certifications.map((cert, i) => (
              <div key={i} className="nexo-form-row" style={{ marginBottom: 10, alignItems: 'center' }}>
                <input className="nexo-input" dir="auto" placeholder={t('اسم الشهادة/الدورة', 'Certification name')} value={cert.name} onChange={(e) => updateCertification(i, 'name', e.target.value)} />
                <input className="nexo-input" dir="auto" placeholder={t('الجهة المانحة', 'Issuer')} value={cert.issuer} onChange={(e) => updateCertification(i, 'issuer', e.target.value)} />
                <input className="nexo-input" dir="auto" placeholder={t('السنة', 'Year')} value={cert.year} onChange={(e) => updateCertification(i, 'year', e.target.value)} />
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => removeCertification(i)}><X size={13} /></button>
              </div>
            ))}
          </div>

          {/* ===== المهارات واللغات ===== */}
          <div className="nexo-cv-half-row" style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }} ref={sectionRefs.skills}>
            <div className="nexo-card nexo-cv-half-card">
<h4 className="nexo-card-row-title cv-section-title-icon" style={{ marginBottom: 12 }}><Award size={15} /> {t('المهارات', 'Skills')}</h4>              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
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
<h4 className="nexo-card-row-title cv-section-title-icon" style={{ marginBottom: 12 }}><Languages size={15} /> {t('اللغات', 'Languages')}</h4>              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
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

          {/* ===== حالة الحفظ + أزرار الحفظ والتصدير (ديسكتوب) ===== */}
          <div className="cv-actions-row" style={{ marginBottom: 12 }}>{saveStatusNode()}</div>
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
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDuplicate(item)} disabled={duplicatingId === item.id} title={t('نسخ', 'Duplicate')}>
                    {duplicatingId === item.id ? <Loader2 size={14} className="nexo-spin" /> : <Copy size={14} />}
                  </button>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ===== العارض الحي ===== */}
        <div className="cv-preview-sticky">
          <CVLivePreview cv={cv} template={selectedTemplate} accent={accentOverride} fontStack={selectedFont.stack} />
        </div>
      </div>
     </div>

      <div className="cv-mobile-actionbar">
        <button className="nexo-btn nexo-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="nexo-spin" /> : <Save size={16} />}
          {t('حفظ', 'Save')}
        </button>
        <button className="nexo-btn nexo-btn-secondary" onClick={handleExportPdf}><Download size={16} />PDF</button>
        <button className="nexo-btn nexo-btn-secondary" onClick={handleExportWord}><Download size={16} />Word</button>
      </div>

      {toast && <div className="cv-toast">{toast}</div>}
    </div>
  );
}