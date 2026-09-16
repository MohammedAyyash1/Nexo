import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Search, ArrowRight, Download, Inbox, ExternalLink } from 'lucide-react';
import { exportMessageAsWord } from '../utils/exportDoc.js';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function ResearcherPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/researcher/reports`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setHistory(data.reports || []))
      .catch((err) => { console.error(err); setHistoryError(true); }).finally(() => setLoadingHistory(false));
  };
  useEffect(() => { loadHistory(); }, []);

  const handleRun = () => {
    setError('');
    if (!query.trim()) { setError(t('الرجاء كتابة سؤال البحث', 'Please enter a research question')); return; }
    setRunning(true);
    fetch(`${BASE}/researcher/run`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ query: query.trim(), lang }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrent(data.report);
        setHistory((prev) => [data.report, ...prev]);
        setQuery('');
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setRunning(false));
  };

  const handleDelete = (id) => {
    fetch(`${BASE}/researcher/reports/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory((prev) => prev.filter((h) => h.id !== id)); if (current?.id === id) setCurrent(null); })
      .catch((err) => console.error(err));
  };
  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل التقارير نهائيًا؟', 'Delete all reports permanently?'))) return;
    fetch(`${BASE}/researcher/reports`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrent(null); }).catch((err) => console.error(err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Search size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('الباحث', 'Researcher')}</h1>
          <p className="nexo-tool-page-desc">{t('اطرح سؤال بحث معمّق، وسيبحث Nexo بالويب ويعدّ تقريرًا منظمًا بمصادر حقيقية.', 'Ask a deep research question, and Nexo will search the web and prepare an organized report with real sources.')}</p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />
        <textarea className="nexo-textarea" dir="auto" rows={3} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('مثلاً: شو أحدث التطورات بمجال الطاقة المتجددة بفلسطين؟', 'e.g. What are the latest developments in renewable energy in Palestine?')} />
        {error && <div className="nexo-inline-error"><AlertCircle size={13} />{error}</div>}
        <button className="nexo-btn nexo-btn-primary" onClick={handleRun} disabled={running} style={{ marginTop: 18, minWidth: 200 }}>
          {running && <Loader2 size={14} className="nexo-spin" />} {running ? t('جارِ البحث...', 'Researching...') : t('ابدأ البحث', 'Start Research')}
        </button>
      </div>

      {current && current.status === 'completed' && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" dir="auto" style={{ whiteSpace: 'normal' }}>{current.query}</h4>
            <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => exportMessageAsWord(current.report_text, current.query, lang)}><Download size={15} /></button>
          </div>
          <div className="nexo-result-text" dir="auto" style={{ marginBottom: current.sources?.length ? 18 : 0 }}>{current.report_text}</div>
          {current.sources?.length > 0 && (
            <div>
              <div className="nexo-section-title" style={{ fontSize: 11, marginBottom: 8 }}>{t('المصادر', 'Sources')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {current.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="nexo-source-link" dir="auto">
                    <ExternalLink size={12} /> {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>

      {loadingHistory ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
        </div>
      ) : historyError ? (
        <div className="nexo-card">
          <div className="nexo-state nexo-state-error">
            <div className="nexo-state-icon"><AlertCircle size={20} /></div>
            <div className="nexo-state-title">{t('تعذّر تحميل التقارير', 'Could not load reports')}</div>
            <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={loadHistory}>{t('إعادة المحاولة', 'Retry')}</button>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="nexo-card">
          <div className="nexo-state">
            <div className="nexo-state-icon"><Inbox size={20} /></div>
            <div className="nexo-state-title">{t('لا يوجد تقارير بعد', 'No reports yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main" onClick={() => setCurrent(item)} style={{ cursor: 'pointer' }}>
                <div className="nexo-list-item-title" dir="auto">{item.query}</div>
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