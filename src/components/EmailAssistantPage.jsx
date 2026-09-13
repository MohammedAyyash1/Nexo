import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Copy, Check, Trash2, AlertCircle, Mail, ArrowRight } from 'lucide-react';
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

  const loadHistory = () => {
    fetch(`${BASE}/email-assistant/history`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => console.error('Load history error:', err))
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
    : t('الصق مسودتك الحالية وبنحسّنها...', 'Paste your current draft and we\'ll improve it...');

  return (
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoEmailSpin { to { transform: rotate(360deg); } } .nexo-email-spin { animation: nexoEmailSpin 1s linear infinite; }`}</style>

      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Mail size={20} /> {t('مساعد الإيميلات', 'Email Assistant')}
      </h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>
        {t('اكتب، ردّ، أو حسّن إيميلاتك بالذكاء الاصطناعي مجانًا.', 'Compose, reply to, or improve your emails with AI, for free.')}
      </p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {Object.entries(MODES).map(([key, labels]) => (
            <button key={key} className={`settings-style-chip ${mode === key ? 'active' : ''}`} onClick={() => setMode(key)} style={{ flex: 1 }}>
              {lang === 'en' ? labels.en : labels.ar}
            </button>
          ))}
        </div>

        <div className="settings-row" style={{ marginBottom: 10 }}>
          <span className="settings-label">{t('النبرة', 'Tone')}</span>
          <SettingsSelect value={tone} onChange={setTone} options={TONES} />
        </div>

        <textarea className="settings-textarea" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={MAX_TEXT_LENGTH} />
        <div className="settings-char-count">{text.length}/{MAX_TEXT_LENGTH}</div>

        {error && (
          <p className="settings-hint" style={{ color: '#f87171', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <button className="settings-btn" onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, maxWidth: 200 }}>
          {generating && <Loader2 size={14} className="nexo-email-spin" />}
          {generating ? t('جارِ الكتابة...', 'Writing...') : t('توليد الإيميل', 'Generate Email')}
        </button>
      </div>

      {result && result.status === 'completed' && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 className="settings-group-title" style={{ margin: 0 }}>{t('الإيميل', 'Email')}</h4>
            <button className="icon-btn" onClick={() => handleCopy(result)}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>
          {result.subject && <p style={{ fontWeight: 600, marginBottom: 8 }}>{t('الموضوع', 'Subject')}: {result.subject}</p>}
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8 }}>{result.body}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && (
          <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>{t('مسح الكل', 'Clear all')}</button>
        )}
      </div>

      {loadingHistory ? (
        <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p>
      ) : history.length === 0 ? (
        <p className="settings-hint">{t('لا يوجد إيميلات سابقة.', 'No drafts yet.')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((item) => (
            <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span onClick={() => setResult(item)} style={{ cursor: 'pointer', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {item.subject || item.body?.slice(0, 50)}
              </span>
              <button className="icon-btn" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}