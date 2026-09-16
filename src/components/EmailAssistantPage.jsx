import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Copy, Check, Trash2, AlertCircle, Mail, ArrowRight, Inbox } from 'lucide-react';
import { SettingsSelect } from './settings/SettingsSelect.jsx';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;
const MAX_TEXT_LENGTH = 3000;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const MODES = { compose: { ar: 'كتابة جديدة', en: 'Compose new' }, reply: { ar: 'رد على إيميل', en: 'Reply to email' }, improve: { ar: 'تحسين مسودة', en: 'Improve draft' } };
const TONES = [
  { value: 'formal', label: 'رسمي' }, { value: 'friendly', label: 'ودود' },
  { value: 'direct', label: 'مباشر ومختصر' }, { value: 'persuasive', label: 'إقناعي' },
];

export function EmailAssistantPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [mode, setMode] = useState('compose');
  const [tone, setTone] = useState('formal');
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/email-assistant/history`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => { console.error('Load history error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleGenerate = () => {
    setError('');
    if (!text.trim()) { setError(t('الرجاء إدخال النص', 'Please enter text')); return; }
    setGenerating(true);

    fetch(`${BASE}/email-assistant/generate`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ mode, tone, text: text.trim(), lang }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setResult(data.draft);
        setHistory((prev) => [data.draft, ...prev]);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setGenerating(false));
  };

  const handleCopy = (item) => {
    navigator.clipboard.writeText(`${item.subject ? `${t('الموضوع', 'Subject')}: ${item.subject}\n\n` : ''}${item.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = (id) => {
    fetch(`${BASE}/email-assistant/history/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (result?.id === id) setResult(null);
      })
      .catch((err) => console.error('Delete error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/email-assistant/history`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setResult(null); })
      .catch((err) => console.error('Delete all error:', err));
  };

  const placeholder = mode === 'compose'
    ? t('اكتب هدف الإيميل: مين المستلم، شو بدك توصله؟', 'Describe the email goal: who is it for, what do you want to convey?')
    : mode === 'reply'
    ? t('الصق نص الإيميل الأصلي يلي بدك ترد عليه...', 'Paste the original email you want to reply to...')
    : t('الصق مسودتك الحالية وبنحسّنها...', "Paste your current draft and we'll improve it...");

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Mail size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('مساعد الإيميلات', 'Email Assistant')}</h1>
          <p className="nexo-tool-page-desc">{t('اكتب، ردّ، أو حسّن إيميلاتك بالذكاء الاصطناعي مجانًا.', 'Compose, reply to, or improve your emails with AI, for free.')}</p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />

        <div className="nexo-tabs" style={{ marginBottom: 14 }}>
          {Object.entries(MODES).map(([key, labels]) => (
            <button key={key} className={`nexo-tab ${mode === key ? 'active' : ''}`} onClick={() => setMode(key)}>
              {lang === 'en' ? labels.en : labels.ar}
            </button>
          ))}
        </div>

        <div className="nexo-settings-row" style={{ marginBottom: 14 }}>
          <span className="nexo-settings-row-label">{t('النبرة', 'Tone')}</span>
          <SettingsSelect value={tone} onChange={setTone} options={TONES} />
        </div>

        <textarea className="nexo-textarea" dir="auto" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={MAX_TEXT_LENGTH} />
        <div className="nexo-char-count">{text.length}/{MAX_TEXT_LENGTH}</div>

        {error && <div className="nexo-inline-error"><AlertCircle size={14} /> {error}</div>}

        <button className="nexo-btn nexo-btn-primary" onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, minWidth: 200 }}>
          {generating && <Loader2 size={14} className="nexo-spin" />}
          {generating ? t('جارِ الكتابة...', 'Writing...') : t('توليد الإيميل', 'Generate Email')}
        </button>
      </div>

      {result && result.status === 'completed' && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('الإيميل', 'Email')}</h4>
            <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopy(result)}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>
          {result.subject && (
            <p dir="auto" style={{ fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)', fontSize: 14 }}>
              {t('الموضوع', 'Subject')}: {result.subject}
            </p>
          )}
          <div className="nexo-result-text" dir="auto">{result.body}</div>
        </div>
      )}

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
            <div className="nexo-state-title">{t('لا يوجد إيميلات بعد', 'No drafts yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main" onClick={() => setResult(item)} style={{ cursor: 'pointer' }}>
                <div className="nexo-list-item-title" dir="auto">{item.subject || item.body?.slice(0, 50)}</div>
                <span className="nexo-list-item-sub">{MODES[item.mode]?.[lang] || item.mode}</span>
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