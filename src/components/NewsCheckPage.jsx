import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, ShieldCheck, ArrowRight, ShieldAlert, ShieldQuestion, ShieldX } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const VERDICT_META = {
  likely_true: { color: '#4ade80', icon: ShieldCheck, ar: 'يبدو صحيحًا', en: 'Likely True' },
  likely_false: { color: '#f87171', icon: ShieldX, ar: 'يبدو غير صحيح', en: 'Likely False' },
  misleading: { color: '#facc15', icon: ShieldAlert, ar: 'مضلّل جزئيًا', en: 'Misleading' },
  unverified: { color: '#9ca3af', icon: ShieldQuestion, ar: 'غير مؤكّد', en: 'Unverified' },
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

  const loadHistory = () => {
    fetch(`${BASE}/news-check/history`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => console.error('Load history error:', err))
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
      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Icon size={20} color={meta.color} />
          <span style={{ fontWeight: 700, color: meta.color }}>{lang === 'en' ? meta.en : meta.ar}</span>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: result.sources?.length ? 14 : 0 }}>{result.explanation}</p>
        {result.sources?.length > 0 && (
          <div>
            <h5 className="settings-hint" style={{ marginBottom: 6 }}>{t('المصادر', 'Sources')}</h5>
            <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12.5 }}>
              {result.sources.map((s, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-2)' }}>{s.title}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoNewsSpin { to { transform: rotate(360deg); } } .nexo-news-spin { animation: nexoNewsSpin 1s linear infinite; }`}</style>

      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={20} /> {t('كاشف مصداقية الأخبار', 'News Credibility Checker')}
      </h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>
        {t('الصق خبرًا أو ادعاءً أو رابطًا، وسيتحقق Nexo من مصداقيته عبر البحث بمصادر حقيقية.', 'Paste a news claim or link, and Nexo will fact-check it using real web sources.')}
      </p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <textarea
          className="settings-textarea" rows={3} value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('مثلاً: "فلان اتخذ قرارًا بكذا" أو رابط خبر...', 'e.g. "X made this decision" or a news link...')}
        />
        {error && (
          <p className="settings-hint" style={{ color: '#f87171', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}
        <button className="settings-btn" onClick={handleCheck} disabled={checking} style={{ marginTop: 16, maxWidth: 200 }}>
          {checking && <Loader2 size={14} className="nexo-news-spin" />}
          {checking ? t('جارِ التحقق...', 'Checking...') : t('تحقق الآن', 'Check now')}
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
        <p className="settings-hint">{t('لا يوجد فحوصات سابقة.', 'No checks yet.')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((item) => {
            const meta = VERDICT_META[item.verdict] || VERDICT_META.unverified;
            return (
              <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setCurrentResult(item)}>
                    <span style={{ color: meta.color, fontSize: 11.5, fontWeight: 600 }}>{lang === 'en' ? meta.en : meta.ar}</span>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.input_text}</div>
                  </div>
                  <button className="icon-btn" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}