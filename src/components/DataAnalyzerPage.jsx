import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Trash2, AlertCircle, BarChart3, ArrowRight } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function DataAnalyzerPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = () => {
    fetch(`${BASE}/data-analyzer/history`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => console.error('Load history error:', err))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setCurrentResult(null);
    setFile(f);
  };

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
    <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
      <h4 className="settings-group-title">{item.file_name}</h4>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <div><span className="settings-hint">{t('الصفوف', 'Rows')}</span><div style={{ fontWeight: 700, fontSize: 18 }}>{item.row_count}</div></div>
        <div><span className="settings-hint">{t('الأعمدة', 'Columns')}</span><div style={{ fontWeight: 700, fontSize: 18 }}>{item.column_count}</div></div>
      </div>

      {item.insights && (
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: 'var(--bg-input-2)' }}>
          <h5 className="settings-hint" style={{ marginBottom: 6 }}>{t('ملاحظات ذكية', 'AI Insights')}</h5>
          <p style={{ fontSize: 13.5, lineHeight: 1.8, margin: 0 }}>{item.insights}</p>
        </div>
      )}

      {item.stats && Object.entries(item.stats).map(([col, s]) => (
        <div key={col} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{col}</div>
          {s.type === 'numeric' ? (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
              <span className="settings-hint">Min: <b style={{ color: 'var(--text-primary)' }}>{s.min}</b></span>
              <span className="settings-hint">Max: <b style={{ color: 'var(--text-primary)' }}>{s.max}</b></span>
              <span className="settings-hint">{t('المتوسط', 'Avg')}: <b style={{ color: 'var(--text-primary)' }}>{s.avg}</b></span>
              <span className="settings-hint">{t('المجموع', 'Sum')}: <b style={{ color: 'var(--text-primary)' }}>{s.sum}</b></span>
            </div>
          ) : (
            <div style={{ fontSize: 12 }}>
              <span className="settings-hint">{t('قيم مميزة', 'Distinct')}: {s.distinctCount} — </span>
              {s.topValues.map((tv, i) => (
                <span key={i} style={{ marginInlineEnd: 8 }}>{tv.value} ({tv.count})</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoDataSpin { to { transform: rotate(360deg); } } .nexo-data-spin { animation: nexoDataSpin 1s linear infinite; }`}</style>

      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart3 size={20} /> {t('محلل البيانات', 'Data Analyzer')}
      </h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>
        {t('ارفع ملف CSV أو Excel وسيحسب Nexo إحصائيات دقيقة ويعطيك ملاحظات ذكية.', 'Upload a CSV or Excel file and Nexo will compute real statistics and give you smart insights.')}
      </p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32 }}>
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '30px 16px', borderRadius: 12, border: '1px dashed var(--border-input)',
          cursor: 'pointer', background: 'var(--bg-input-2)', textAlign: 'center',
        }}>
          <Upload size={22} color="var(--text-secondary)" />
          <span style={{ marginTop: 8, fontSize: 13.5 }}>{file ? file.name : t('اضغط لاختيار ملف CSV أو Excel', 'Click to select a CSV or Excel file')}</span>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        {error && (
          <p className="settings-hint" style={{ color: '#f87171', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <button className="settings-btn" onClick={handleAnalyze} disabled={processing || !file} style={{ marginTop: 16, maxWidth: 220 }}>
          {processing && <Loader2 size={14} className="nexo-data-spin" />}
          {processing ? t('جارِ التحليل...', 'Analyzing...') : t('حلّل البيانات', 'Analyze Data')}
        </button>
      </div>

      {currentResult && currentResult.status === 'completed' && renderResult(currentResult)}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && (
          <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>{t('مسح الكل', 'Clear all')}</button>
        )}
      </div>

      {loadingHistory ? (
        <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p>
      ) : history.length === 0 ? (
        <p className="settings-hint">{t('لا يوجد تحليلات سابقة.', 'No analyses yet.')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((item) => (
            <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span onClick={() => setCurrentResult(item)} style={{ cursor: 'pointer', fontSize: 13.5, flex: 1 }}>{item.file_name} — {item.row_count} {t('صف', 'rows')}</span>
                <button className="icon-btn" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}