import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, ShieldCheck, ArrowRight, ShieldAlert, ShieldQuestion, ShieldX, Inbox, ExternalLink } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const VERDICT_META = {
  likely_true: { color: 'var(--color-success)', icon: ShieldCheck, ar: 'يبدو صحيحًا', en: 'Likely True' },
  likely_false: { color: 'var(--color-error)', icon: ShieldX, ar: 'يبدو غير صحيح', en: 'Likely False' },
  misleading: { color: 'var(--color-warning)', icon: ShieldAlert, ar: 'مضلّل جزئيًا', en: 'Misleading' },
  unverified: { color: 'var(--text-muted)', icon: ShieldQuestion, ar: 'غير مؤكّد', en: 'Unverified' },
};

export function NewsCheckPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [text, setText] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/news-check/history`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => { console.error('Load history error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleCheck = () => {
    setError('');
    if (!text.trim()) { setError(t('الرجاء إدخال الخبر أو الرابط', 'Please enter the news or link')); return; }
    setChecking(true);

    fetch(`${BASE}/news-check`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ text: text.trim(), lang }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentResult(data.check);
        setHistory((prev) => [data.check, ...prev]);
        setText('');
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setChecking(false));
  };

  const handleDelete = (id) => {
    fetch(`${BASE}/news-check/history/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentResult?.id === id) setCurrentResult(null);
      })
      .catch((err) => console.error('Delete error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/news-check/history`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentResult(null); })
      .catch((err) => console.error('Delete all error:', err));
  };

  const renderResult = (result) => {
    const meta = VERDICT_META[result.verdict] || VERDICT_META.unverified;
    const Icon = meta.icon;
    return (
      <div className="nexo-card" style={{ marginBottom: 24 }}>
        <div className="nexo-verdict-banner" style={{ borderColor: meta.color }}>
          <Icon size={22} color={meta.color} />
          <span style={{ fontWeight: 700, color: meta.color, fontSize: 15 }}>{lang === 'en' ? meta.en : meta.ar}</span>
        </div>
        <p className="nexo-result-text" dir="auto" style={{ marginBottom: result.sources?.length ? 18 : 0 }}>{result.explanation}</p>
        {result.sources?.length > 0 && (
          <div>
            <div className="nexo-section-title" style={{ fontSize: 11, marginBottom: 8 }}>{t('المصادر', 'Sources')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="nexo-source-link" dir="auto">
                  <ExternalLink size={12} /> {s.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><ShieldCheck size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('كاشف مصداقية الأخبار', 'News Credibility Checker')}</h1>
          <p className="nexo-tool-page-desc">
            {t('الصق خبرًا أو ادعاءً أو رابطًا، وسيتحقق Nexo من مصداقيته عبر البحث بمصادر حقيقية.', 'Paste a news claim or link, and Nexo will fact-check it using real web sources.')}
          </p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 24 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />
        <textarea
          className="nexo-textarea" dir="auto" rows={3} value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('مثلاً: "فلان اتخذ قرارًا بكذا" أو رابط خبر...', 'e.g. "X made this decision" or a news link...')}
        />
        {error && <div className="nexo-inline-error"><AlertCircle size={14} /> {error}</div>}
        <button className="nexo-btn nexo-btn-primary" onClick={handleCheck} disabled={checking} style={{ marginTop: 16, minWidth: 200 }}>
          {checking && <Loader2 size={14} className="nexo-spin" />}
          {checking ? t('جارِ التحقق...', 'Checking...') : t('تحقق الآن', 'Check now')}
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
            <div className="nexo-state-title">{t('لا يوجد فحوصات بعد', 'No checks yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => {
            const meta = VERDICT_META[item.verdict] || VERDICT_META.unverified;
            const Icon = meta.icon;
            return (
              <li key={item.id} className="nexo-list-item">
                <div className="nexo-file-row-icon" style={{ background: 'transparent' }}>
                  <Icon size={16} color={meta.color} />
                </div>
                <div className="nexo-list-item-main" onClick={() => setCurrentResult(item)} style={{ cursor: 'pointer' }}>
                  <span style={{ color: meta.color, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 2 }}>
                    {lang === 'en' ? meta.en : meta.ar}
                  </span>
                  <div className="nexo-list-item-title" dir="auto">{item.input_text}</div>
                </div>
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
              </li>
            );
          })}
        </ul>
      )}
     </div>
    </div>
  );
}