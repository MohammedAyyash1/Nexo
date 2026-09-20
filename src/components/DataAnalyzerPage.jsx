import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Trash2, AlertCircle, BarChart3, ArrowRight, Inbox, Sparkles } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'en' || saved === 'ar') return saved;
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return browserLang.startsWith('ar') ? 'ar' : 'en';
}

export function DataAnalyzerPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/data-analyzer/history`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => { console.error('Load history error:', err); setHistoryError(true); })
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
  const handleDrop = (e) => { e.preventDefault(); setDragActive(false); selectFile(e.dataTransfer.files?.[0]); };

  const handleAnalyze = () => {
    if (!file) { setError(t('الرجاء اختيار ملف', 'Please select a file')); return; }
    setError('');
    setProcessing(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', lang);

    fetch(`${BASE}/data-analyzer/analyze`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentResult(data.analysis);
        setHistory((prev) => [data.analysis, ...prev]);
        setFile(null);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setProcessing(false));
  };

  const handleDelete = (id) => {
    fetch(`${BASE}/data-analyzer/history/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentResult?.id === id) setCurrentResult(null);
      })
      .catch((err) => console.error('Delete error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/data-analyzer/history`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentResult(null); })
      .catch((err) => console.error('Delete all error:', err));
  };

  const renderResult = (item) => (
    <div className="nexo-card" style={{ marginBottom: 28 }}>
      <h4 className="nexo-card-row-title" dir="auto" style={{ marginBottom: 14 }}>{item.file_name}</h4>

      <div className="nexo-stat-row">
        <div className="nexo-stat-box">
          <span className="nexo-stat-label">{t('الصفوف', 'Rows')}</span>
          <div className="nexo-stat-value">{item.row_count}</div>
        </div>
        <div className="nexo-stat-box">
          <span className="nexo-stat-label">{t('الأعمدة', 'Columns')}</span>
          <div className="nexo-stat-value">{item.column_count}</div>
        </div>
      </div>

      {item.insights && (
        <div className="nexo-subcard" style={{ marginTop: 16 }}>
          <div className="nexo-section-title" style={{ fontSize: 11, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} /> {t('ملاحظات ذكية', 'AI Insights')}
          </div>
          <p className="nexo-result-text" dir="auto" style={{ fontSize: 13.5, margin: 0 }}>{item.insights}</p>
        </div>
      )}

      {item.stats && Object.entries(item.stats).map(([col, s]) => (
        <div key={col} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6, color: 'var(--text-primary)' }} dir="auto">{col}</div>
          {s.type === 'numeric' ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="nexo-chip" style={{ fontSize: 11.5 }}>Min: {s.min}</span>
              <span className="nexo-chip" style={{ fontSize: 11.5 }}>Max: {s.max}</span>
              <span className="nexo-chip" style={{ fontSize: 11.5 }}>{t('المتوسط', 'Avg')}: {s.avg}</span>
              <span className="nexo-chip" style={{ fontSize: 11.5 }}>{t('المجموع', 'Sum')}: {s.sum}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="nexo-list-item-sub">{t('قيم مميزة', 'Distinct')}: {s.distinctCount}</span>
              {s.topValues.map((tv, i) => (
                <span key={i} className="nexo-chip" dir="auto" style={{ fontSize: 11.5 }}>{tv.value} ({tv.count})</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><BarChart3 size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('محلل البيانات', 'Data Analyzer')}</h1>
          <p className="nexo-tool-page-desc">
            {t('ارفع ملف CSV أو Excel وسيحسب Nexo إحصائيات دقيقة ويعطيك ملاحظات ذكية.', 'Upload a CSV or Excel file and Nexo will compute real statistics and give you smart insights.')}
          </p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />
        <label
          className={`nexo-dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
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
              <span className="nexo-dropzone-hint">CSV · XLSX · XLS</span>
            </>
          )}
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        {error && (
          <div className="nexo-inline-error"><AlertCircle size={14} /> {error}</div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleAnalyze} disabled={processing || !file} style={{ marginTop: 18, minWidth: 200 }}>
          {processing && <Loader2 size={14} className="nexo-spin" />}
          {processing ? t('جارِ التحليل...', 'Analyzing...') : t('حلّل البيانات', 'Analyze Data')}
        </button>
      </div>

      {currentResult && currentResult.status === 'completed' && renderResult(currentResult)}

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && (
          <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>{t('مسح الكل', 'Clear all')}</button>
        )}
      </div>

      {loadingHistory ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
        </div>
      ) : historyError ? (
        <div className="nexo-card">
          <div className="nexo-state nexo-state-error">
            <div className="nexo-state-icon"><AlertCircle size={20} /></div>
            <div className="nexo-state-title">{t('تعذّر تحميل السجل', 'Could not load history')}</div>
            <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={loadHistory}>{t('إعادة المحاولة', 'Retry')}</button>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="nexo-card">
          <div className="nexo-state">
            <div className="nexo-state-icon"><Inbox size={20} /></div>
            <div className="nexo-state-title">{t('لا يوجد تحليلات بعد', 'No analyses yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main" onClick={() => setCurrentResult(item)} style={{ cursor: 'pointer' }}>
                <div className="nexo-list-item-title" dir="auto">{item.file_name}</div>
                <span className="nexo-list-item-sub">{item.row_count} {t('صف', 'rows')} · {item.column_count} {t('عمود', 'columns')}</span>
              </div>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
     </div>
    </div>
  );
}