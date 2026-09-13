import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Search, ArrowRight, Download } from 'lucide-react';
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

  const loadHistory = () => {
    fetch(`${BASE}/researcher/reports`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setHistory(data.reports || []))
      .catch((err) => console.error(err)).finally(() => setLoadingHistory(false));
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
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoResSpin { to { transform: rotate(360deg); } } .nexo-res-spin { animation: nexoResSpin 1s linear infinite; }`}</style>
      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}><ArrowRight size={15} /> {t('رجوع', 'Back')}</button>
      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Search size={20} /> {t('الباحث', 'Researcher')}</h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>{t('اطرح سؤال بحث معمّق، وسيبحث Nexo بالويب ويعدّ تقريرًا منظمًا بمصادر حقيقية.', "Ask a deep research question, and Nexo will search the web and prepare an organized report with real sources.")}</p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32 }}>
        <textarea className="settings-textarea" rows={3} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('مثلاً: شو أحدث التطورات بمجال الطاقة المتجددة بفلسطين؟', 'e.g. What are the latest developments in renewable energy in Palestine?')} />
        {error && <p className="settings-hint" style={{ color: '#f87171', marginTop: 12 }}><AlertCircle size={13} style={{ display: 'inline', marginInlineEnd: 4 }} />{error}</p>}
        <button className="settings-btn" onClick={handleRun} disabled={running} style={{ marginTop: 16, maxWidth: 200 }}>
          {running && <Loader2 size={14} className="nexo-res-spin" />} {running ? t('جارِ البحث...', 'Researching...') : t('ابدأ البحث', 'Start Research')}
        </button>
      </div>

      {current && current.status === 'completed' && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 className="settings-group-title" style={{ margin: 0 }}>{current.query}</h4>
            <button className="icon-btn" onClick={() => exportMessageAsWord(current.report_text, current.query, lang)}><Download size={15} /></button>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8, marginBottom: current.sources?.length ? 14 : 0 }}>{current.report_text}</div>
          {current.sources?.length > 0 && (
            <div>
              <h5 className="settings-hint" style={{ marginBottom: 6 }}>{t('المصادر', 'Sources')}</h5>
              <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12.5 }}>
                {current.sources.map((s, i) => <li key={i} style={{ marginBottom: 4 }}><a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-2)' }}>{s.title}</a></li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>
      {loadingHistory ? <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p> : history.length === 0 ? <p className="settings-hint">{t('لا يوجد تقارير بعد.', 'No reports yet.')}</p> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((item) => (
            <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span onClick={() => setCurrent(item)} style={{ cursor: 'pointer', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.query}</span>
              <button className="icon-btn" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}