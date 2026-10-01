import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Upload, Loader2, Download, Trash2, AlertCircle, FileStack, ArrowRight, Copy, Check,
  Inbox, FileText, File as FileIcon, RotateCw, Sparkles, MoreHorizontal, X, CheckCircle2,
} from 'lucide-react';
import { exportMessageAsWord } from '../utils/exportDoc.js';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

function fileTypeMeta(fileName = '') {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf') return { icon: FileText, color: '#f87171', bg: 'rgba(239, 68, 68, 0.14)', label: 'PDF' };
  if (ext === 'docx' || ext === 'doc') return { icon: FileText, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.14)', label: 'Word' };
  return { icon: FileIcon, color: 'var(--accent-light)', bg: 'rgba(var(--accent-1-rgb), 0.16)', label: ext?.toUpperCase() || '' };
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripMarkdownPreview(text, maxLen = 60) {
  if (!text) return '';
  const plain = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
  return plain.slice(0, maxLen);
}

// يقسم نص التحليل (Markdown) عند عناوينه الفعلية (## أو ###) — استخراج للبنية الموجودة
// أصلًا بنتيجة الـAI، بدون اختراع أي محتوى جديد
function parseAnalysisSections(md) {
  if (!md) return [];
  const lines = md.split('\n');
  const sections = [];
  let current = null;
  lines.forEach((line) => {
    const m = line.match(/^#{2,3}\s+(.*)$/);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1].replace(/[*_]/g, '').trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    } else if (!sections.length) {
      current = { heading: null, body: [line] };
    }
  });
  if (current) sections.push(current);
  return sections
    .map((s, i) => ({ id: `sec-${i}`, heading: s.heading, body: s.body.join('\n').trim() }))
    .filter((s) => s.body || s.heading);
}

function extractListItems(md) {
  if (!md) return [];
  return md
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^([-*]|\d+[.)])\s+/.test(l))
    .map((l) => l.replace(/^([-*]|\d+[.)])\s+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

export function AIDocumentsPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [analyzedMeta, setAnalyzedMeta] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState('');
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const lastFileRef = useRef(null); // نسخة الملف الفعلي لدعم "إعادة التحليل" بدون رفع يدوي مجددًا

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/documents`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.documents || []))
      .catch((err) => { console.error('Load documents error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const selectFile = (f) => {
    if (!f) return;
    setError('');
    setCurrentResult(null);
    setFile(f);
  };

  const handleFileChange = (e) => selectFile(e.target.files?.[0]);
  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  };

  const removeSelectedFile = () => { setFile(null); setError(''); };

  const doAnalyze = (fileToAnalyze) => {
    if (!fileToAnalyze) { setError(t('الرجاء اختيار ملف', 'Please select a file')); return; }
    setError('');
    setProcessing(true);
    setActiveTab('overview');

    const formData = new FormData();
    formData.append('file', fileToAnalyze);
    formData.append('lang', lang);

    fetch(`${BASE}/documents/analyze`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentResult(data.document);
        setHistory((prev) => [data.document, ...prev]);
        setAnalyzedMeta({ size: fileToAnalyze.size });
        lastFileRef.current = fileToAnalyze;
        setFile(null);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setProcessing(false));
  };

  const handleAnalyze = () => doAnalyze(file);
  const handleReanalyze = () => { if (lastFileRef.current) doAnalyze(lastFileRef.current); };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast(t('تم النسخ', 'Copied'));
  };

  const handleDelete = (id) => {
    if (!window.confirm(t('حذف هذا التحليل نهائيًا؟', 'Delete this analysis permanently?'))) return;
    fetch(`${BASE}/documents/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentResult?.id === id) { setCurrentResult(null); setAnalyzedMeta(null); }
      })
      .catch((err) => console.error('Delete document error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/documents`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentResult(null); setAnalyzedMeta(null); })
      .catch((err) => console.error('Delete all documents error:', err));
  };

  const openHistoryItem = (item) => {
    setCurrentResult(item);
    setAnalyzedMeta(null);
    setActiveTab('overview');
    lastFileRef.current = null;
  };

  const sections = currentResult?.summary_text ? parseAnalysisSections(currentResult.summary_text) : [];
  const overviewSection = sections.find((s) => s.heading && /ملخص|overview|summary/i.test(s.heading)) || sections[0] || null;
  const keyPointsSection = sections.find((s) => s.heading && /نقاط|point|insight/i.test(s.heading)) || null;
  const keyPointsList = keyPointsSection ? extractListItems(keyPointsSection.body) : [];

  const TABS = [
    { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', Icon: Sparkles },
    ...(keyPointsList.length ? [{ id: 'keypoints', labelAr: 'أهم النقاط', labelEn: 'Key Insights', Icon: CheckCircle2 }] : []),
    { id: 'full', labelAr: 'التحليل الكامل', labelEn: 'Full Analysis', Icon: FileText },
  ];

  const meta = currentResult ? fileTypeMeta(currentResult.file_name) : null;
  const MetaIcon = meta?.icon;

  return (
    <div className="nexo-tool-page doc-analysis-page">
     <div className="doc-hero-art" aria-hidden="true">
       <span className="doc-hero-glow" />
       <img
         src="/assets/doc-analysis-hero.png"
         alt=""
         className="doc-hero-art-img"
         loading="eager"
         draggable="false"
       />
       <span className="doc-hero-scrim" />
     </div>
     <div className="nexo-tool-page-inner doc-analysis-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><FileStack size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('تحليل المستندات', 'AI Documents')}</h1>
          <p className="nexo-tool-page-desc">
            {t('ارفع ملف PDF أو Word ودع Nexo يحلله ويستخرج أهم المعلومات.', 'Upload a PDF or Word file and let Nexo analyze it and extract the key information.')}
          </p>
        </div>
      </div>

      {/* ===== منطقة الرفع ===== */}
      <div className="nexo-card-luxe doc-upload-card">
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 220, height: 220, top: -70, insetInlineEnd: -50 }} />
        <span className="nexo-glow-orb nexo-glow-orb-pink" style={{ width: 160, height: 160, bottom: -60, insetInlineStart: -40 }} />

        {!file ? (
          <label
            className={`nexo-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="nexo-dropzone-icon"><Upload size={22} /></div>
            <span className="nexo-dropzone-text">{t('اضغط لاختيار ملف، أو اسحبه وأفلته هون', 'Click to select a file, or drag and drop it here')}</span>
            <span className="nexo-dropzone-hint">PDF · DOCX</span>
            <input type="file" accept="application/pdf,.docx" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        ) : (
          (() => {
            const fm = fileTypeMeta(file.name);
            const FIcon = fm.icon;
            return (
              <div className="doc-file-card">
                <div className="doc-file-icon" style={{ background: fm.bg, color: fm.color }}><FIcon size={20} /></div>
                <div className="doc-file-info">
                  <div className="doc-file-name" dir="auto" style={{ unicodeBidi: 'plaintext' }}>{file.name}</div>
                  <div className="doc-file-sub" dir="ltr">{fm.label} · {formatBytes(file.size)}</div>
                </div>
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={removeSelectedFile} title={t('إزالة', 'Remove')} aria-label={t('إزالة الملف', 'Remove file')}>
                  <X size={15} />
                </button>
              </div>
            );
          })()
        )}

        {error && (
          <div className="nexo-inline-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleAnalyze} disabled={processing || !file} style={{ marginTop: 18, minWidth: 200 }}>
          {processing && <Loader2 size={14} className="nexo-spin" />}
          {processing ? t('جارِ تحليل المستند...', 'Analyzing document...') : t('تحليل المستند', 'Analyze Document')}
        </button>
        {processing && <div className="doc-processing-bar" aria-hidden="true"><span /></div>}
      </div>

      {/* ===== نتيجة التحليل ===== */}
      {currentResult && currentResult.status === 'completed' && (
        <>
          <div className="nexo-card doc-header-card">
            <div className="doc-header-left">
              <div className="doc-file-icon lg" style={{ background: meta.bg, color: meta.color }}><MetaIcon size={22} /></div>
              <div className="doc-header-texts">
                <h4 className="doc-header-title" dir="auto" style={{ unicodeBidi: 'plaintext' }}>{currentResult.file_name}</h4>
                <div className="doc-header-meta">
                  <span className="nexo-badge nexo-badge-success"><Check size={11} /> {t('تم التحليل', 'Analyzed')}</span>
                  {analyzedMeta?.size ? <span className="doc-meta-chip" dir="ltr">{formatBytes(analyzedMeta.size)}</span> : null}
                  <span className="doc-meta-chip" dir="ltr">{meta.label}</span>
                </div>
              </div>
            </div>

            <div className="doc-header-actions">
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopy(currentResult.summary_text)} title={t('نسخ', 'Copy')} aria-label={t('نسخ التحليل', 'Copy analysis')}>
                <Copy size={16} />
              </button>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => exportMessageAsWord(currentResult.summary_text, currentResult.file_name, lang)} title={t('تنزيل Word', 'Download Word')} aria-label={t('تنزيل التحليل', 'Download analysis')}>
                <Download size={16} />
              </button>
              {lastFileRef.current && (
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={handleReanalyze} disabled={processing} title={t('إعادة التحليل', 'Re-analyze')} aria-label={t('إعادة التحليل', 'Re-analyze document')}>
                  <RotateCw size={16} className={processing ? 'nexo-spin' : ''} />
                </button>
              )}
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(currentResult.id)} title={t('حذف', 'Delete')} aria-label={t('حذف التحليل', 'Delete analysis')}>
                <Trash2 size={16} />
              </button>
            </div>

            <div className="doc-header-actions-mobile">
              <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={() => setMobileActionsOpen((o) => !o)}>
                <MoreHorizontal size={15} /> {t('الإجراءات', 'Actions')}
              </button>
              {mobileActionsOpen && (
                <>
                  <div className="doc-mobile-menu-backdrop" onClick={() => setMobileActionsOpen(false)} />
                  <div className="doc-mobile-menu">
                    <button className="doc-mobile-menu-item" onClick={() => { handleCopy(currentResult.summary_text); setMobileActionsOpen(false); }}>
                      <Copy size={15} /> {t('نسخ التحليل', 'Copy analysis')}
                    </button>
                    <button className="doc-mobile-menu-item" onClick={() => { exportMessageAsWord(currentResult.summary_text, currentResult.file_name, lang); setMobileActionsOpen(false); }}>
                      <Download size={15} /> {t('تنزيل Word', 'Download Word')}
                    </button>
                    {lastFileRef.current && (
                      <button className="doc-mobile-menu-item" onClick={() => { setMobileActionsOpen(false); handleReanalyze(); }}>
                        <RotateCw size={15} /> {t('إعادة التحليل', 'Re-analyze')}
                      </button>
                    )}
                    <button className="doc-mobile-menu-item danger" onClick={() => { setMobileActionsOpen(false); handleDelete(currentResult.id); }}>
                      <Trash2 size={15} /> {t('حذف', 'Delete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="nexo-tabs doc-result-tabs">
            {TABS.map((tb) => (
              <button key={tb.id} className={`nexo-tab ${activeTab === tb.id ? 'active' : ''}`} onClick={() => setActiveTab(tb.id)}>
                <tb.Icon size={13} /> {lang === 'en' ? tb.labelEn : tb.labelAr}
              </button>
            ))}
          </div>

          <div className="nexo-card doc-result-card">
            {activeTab === 'overview' && (
              <div className="doc-markdown" dir="rtl">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{overviewSection ? (overviewSection.body || currentResult.summary_text) : currentResult.summary_text}</ReactMarkdown>
              </div>
            )}

            {activeTab === 'keypoints' && keyPointsList.length > 0 && (
              <div className="doc-keypoints">
                {keyPointsList.map((point, i) => (
                  <div key={i} className="doc-keypoint-card">
                    <span className="doc-keypoint-num">{String(i + 1).padStart(2, '0')}</span>
                    <p dir="auto">{point}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'full' && (
              <div className="doc-markdown" dir="rtl">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentResult.summary_text}</ReactMarkdown>
              </div>
            )}
          </div>
        </>
      )}

      {currentResult && currentResult.status === 'failed' && (
        <div className="nexo-card">
          <div className="nexo-state nexo-state-error">
            <div className="nexo-state-icon"><AlertCircle size={20} /></div>
            <div className="nexo-state-title">{t('فشل تحليل المستند', 'Document analysis failed')}</div>
            <div className="nexo-state-desc">{currentResult.error_message || t('حدث خطأ غير متوقع.', 'An unexpected error occurred.')}</div>
            {lastFileRef.current && (
              <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={handleReanalyze}>
                <RotateCw size={13} /> {t('إعادة المحاولة', 'Retry')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== السجل ===== */}
      <div className="nexo-tool-page-header doc-history-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && (
          <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: '#f87171', marginInlineStart: 'auto' }}>
            {t('مسح الكل', 'Clear all')}
          </button>
        )}
      </div>

      {loadingHistory ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="nexo-skeleton" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="nexo-skeleton nexo-skeleton-line w-60" />
                <div className="nexo-skeleton nexo-skeleton-line w-40" style={{ marginBottom: 0 }} />
              </div>
            </div>
          ))}
        </div>
      ) : historyError ? (
        <div className="nexo-card">
          <div className="nexo-state nexo-state-error">
            <div className="nexo-state-icon"><AlertCircle size={20} /></div>
            <div className="nexo-state-title">{t('تعذّر تحميل السجل', 'Could not load history')}</div>
            <div className="nexo-state-desc">{t('تأكد من اتصالك وحاول مرة أخرى.', 'Check your connection and try again.')}</div>
            <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={loadHistory}>{t('إعادة المحاولة', 'Retry')}</button>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="nexo-card">
          <div className="nexo-state">
            <div className="nexo-state-icon"><Inbox size={20} /></div>
            <div className="nexo-state-title">{t('لا يوجد تحليلات بعد', 'No analyses yet')}</div>
            <div className="nexo-state-desc">{t('ارفع أول مستند فوق وابدأ.', 'Upload your first document above to get started.')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list doc-history-list">
          {history.map((item) => {
            const hm = fileTypeMeta(item.file_name);
            const HIcon = hm.icon;
            return (
              <li key={item.id} className="nexo-list-item">
                <div className="nexo-list-item-icon" style={{ background: hm.bg, color: hm.color }}>
                  <HIcon size={16} />
                </div>
                <div className="nexo-list-item-main" onClick={() => item.status === 'completed' && openHistoryItem(item)} style={{ cursor: item.status === 'completed' ? 'pointer' : 'default' }}>
                  <div className="nexo-list-item-title" dir="auto" style={{ unicodeBidi: 'plaintext' }}>{item.file_name}</div>
                  {item.status === 'failed' ? (
                    <span className="nexo-badge nexo-badge-danger">{t('فشل', 'Failed')}: {item.error_message}</span>
                  ) : (
                    <span className="nexo-list-item-sub" dir="auto">{stripMarkdownPreview(item.summary_text)}...</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {item.status === 'completed' && (
                    <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => openHistoryItem(item)} title={t('عرض', 'View')} aria-label={t('عرض التحليل', 'View analysis')}>
                      <FileStack size={14} />
                    </button>
                  )}
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')} aria-label={t('حذف', 'Delete')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toast && <div className="nexo-toast nexo-toast-success"><Check size={16} />{toast}</div>}
     </div>
    </div>
  );
}