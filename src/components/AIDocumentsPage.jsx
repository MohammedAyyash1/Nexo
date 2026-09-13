import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Download, Trash2, AlertCircle, FileStack, ArrowRight, Copy, Check, Inbox, FileText, File as FileIcon } from 'lucide-react';
import { exportMessageAsWord, exportMessageAsPdf } from '../utils/exportDoc.js';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function stripMarkdownPreview(text, maxLen = 60) {
  if (!text) return '';
  const plain = text
    .replace(/^#{1,6}\s+/gm, '') // عناوين ### / ## / #
    .replace(/\*\*(.*?)\*\*/g, '$1') // **عريض**
    .replace(/\*(.*?)\*/g, '$1') // *مائل*
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // كود
    .replace(/^[-*]\s+/gm, '') // نقاط قوائم
    .replace(/\n+/g, ' ') // أسطر جديدة → مسافة
    .trim();
  return plain.slice(0, maxLen);
}

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

// أيقونة + لون حسب نوع الملف — تحسين بصري بحت، ما بيغيّر أي بيانات
function fileTypeMeta(fileName = '') {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf') return { icon: FileText, color: '#f87171', bg: 'rgba(239, 68, 68, 0.14)' };
  if (ext === 'docx' || ext === 'doc') return { icon: FileText, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.14)' };
  return { icon: FileIcon, color: 'var(--accent-light)', bg: 'rgba(var(--accent-1-rgb), 0.16)' };
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
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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

  const handleFileChange = (e) => {
    selectFile(e.target.files?.[0]);
  };

  // Drag & Drop — نفس مسار اختيار الملف بالضبط، بس عبر السحب والإفلات
  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  };

  const handleAnalyze = () => {
    if (!file) { setError(t('الرجاء اختيار ملف', 'Please select a file')); return; }
    setError('');
    setProcessing(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', lang);

    fetch(`${BASE}/documents/analyze`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentResult(data.document);
        setHistory((prev) => [data.document, ...prev]);
        setFile(null);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setProcessing(false));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = (id) => {
    if (!window.confirm(t('حذف هذا التحليل نهائيًا؟', 'Delete this analysis permanently?'))) return;
    fetch(`${BASE}/documents/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentResult?.id === id) setCurrentResult(null);
      })
      .catch((err) => console.error('Delete document error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/documents`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentResult(null); })
      .catch((err) => console.error('Delete all documents error:', err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><FileStack size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('تحليل المستندات', 'AI Documents')}</h1>
          <p className="nexo-tool-page-desc">
            {t('ارفع ملف PDF أو Word وسيقوم Nexo بتحليله وتلخيصه واستخراج أهم النقاط.', 'Upload a PDF or Word file and Nexo will analyze, summarize, and extract key points.')}
          </p>
        </div>
      </div>

      {/* ===== منطقة الرفع ===== */}
      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 220, height: 220, top: -70, insetInlineEnd: -50 }} />
        <span className="nexo-glow-orb nexo-glow-orb-pink" style={{ width: 160, height: 160, bottom: -60, insetInlineStart: -40 }} />
        <label
          className={`nexo-dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="nexo-dropzone-icon"><Upload size={22} /></div>
          {file ? (
            <>
              <span className="nexo-dropzone-text" dir="auto">{file.name}</span>
              <span className="nexo-dropzone-hint">{t('اضغط لاختيار ملف آخر', 'Click to choose a different file')}</span>
            </>
          ) : (
            <>
              <span className="nexo-dropzone-text">{t('اضغط لاختيار ملف، أو اسحبه وأفلته هون', 'Click to select a file, or drag and drop it here')}</span>
              <span className="nexo-dropzone-hint">PDF · DOCX</span>
            </>
          )}
          <input type="file" accept="application/pdf,.docx" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        {error && (
          <div className="nexo-inline-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleAnalyze} disabled={processing || !file} style={{ marginTop: 18, minWidth: 200 }}>
          {processing && <Loader2 size={14} className="nexo-spin" />}
          {processing ? t('جارِ التحليل...', 'Analyzing...') : t('تحليل المستند', 'Analyze Document')}
        </button>
      </div>

      {/* ===== النتيجة الحالية ===== */}
      {currentResult && currentResult.status === 'completed' && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" dir="auto">{currentResult.file_name}</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopy(currentResult.summary_text)} title={t('نسخ', 'Copy')}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => exportMessageAsWord(currentResult.summary_text, currentResult.file_name, lang)} title="Word">
                <Download size={15} />
              </button>
            </div>
          </div>
          <div className="nexo-result-text" dir="auto">{currentResult.summary_text}</div>
        </div>
      )}

      {/* ===== السجل ===== */}
      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
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
        <ul className="nexo-list">
          {history.map((item) => {
            const meta = fileTypeMeta(item.file_name);
            const TypeIcon = meta.icon;
            return (
              <li key={item.id} className="nexo-list-item">
                <div className="nexo-list-item-icon" style={{ background: meta.bg, color: meta.color }}>
                  <TypeIcon size={16} />
                </div>
                <div className="nexo-list-item-main">
                  <div className="nexo-list-item-title" dir="auto">{item.file_name}</div>
                  {item.status === 'failed' ? (
                    <span className="nexo-badge nexo-badge-danger">{t('فشل', 'Failed')}: {item.error_message}</span>
                  ) : (
                    <span className="nexo-list-item-sub" dir="auto">{stripMarkdownPreview(item.summary_text)}...</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {item.status === 'completed' && (
                    <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => setCurrentResult(item)} title={t('عرض', 'View')}>
                      <FileStack size={14} />
                    </button>
                  )}
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
     </div>
    </div>
  );
}