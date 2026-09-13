import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Copy, Check, Trash2, AlertCircle, Languages, ArrowRight, ArrowLeftRight, Inbox } from 'lucide-react';
import { SettingsSelect } from './settings/SettingsSelect.jsx';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;
const MAX_TEXT_LENGTH = 2000;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const DIALECTS = [
  { value: 'palestinian', label: 'الفلسطينية' },
  { value: 'levantine', label: 'الشامية' },
  { value: 'gulf', label: 'الخليجية' },
  { value: 'egyptian', label: 'المصرية' },
  { value: 'iraqi', label: 'العراقية' },
  { value: 'maghrebi', label: 'المغاربية' },
];

export function DialectConverterPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [text, setText] = useState('');
  const [direction, setDirection] = useState('to_fusha');
  const [dialect, setDialect] = useState('palestinian');
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/dialect/history`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => { console.error('Load history error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleConvert = () => {
    setError('');
    if (!text.trim()) { setError(t('الرجاء كتابة نص', 'Please enter some text')); return; }
    setConverting(true);
    setResult('');

    fetch(`${BASE}/dialect/convert`, {
      method: 'POST', headers: authHeadersJson(),
      body: JSON.stringify({ text: text.trim(), direction, dialect: direction === 'to_dialect' ? dialect : null }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setResult(data.conversion.output_text);
        setHistory((prev) => [data.conversion, ...prev]);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setConverting(false));
  };

  const handleSwapDirection = () => {
    setDirection((d) => (d === 'to_fusha' ? 'to_dialect' : 'to_fusha'));
    setResult('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = (id) => {
    fetch(`${BASE}/dialect/history/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setHistory((prev) => prev.filter((h) => h.id !== id)))
      .catch((err) => console.error('Delete error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/dialect/history`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setHistory([]))
      .catch((err) => console.error('Delete all error:', err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Languages size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('محوّل العامية والفصحى', 'Dialect ↔ Fusha Converter')}</h1>
          <p className="nexo-tool-page-desc">
            {t('حوّل نصك بين العامية والفصحى بأسلوب طبيعي، مجانًا بالكامل.', 'Convert your text between dialect and formal Arabic naturally, completely free.')}
          </p>
        </div>
      </div>

      <div className="nexo-card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            {direction === 'to_fusha' ? t('عامية → فصحى', 'Dialect → Fusha') : t('فصحى → عامية', 'Fusha → Dialect')}
          </span>
          <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={handleSwapDirection} title={t('عكس الاتجاه', 'Swap direction')}>
            <ArrowLeftRight size={15} />
          </button>
          {direction === 'to_dialect' && (
            <SettingsSelect value={dialect} onChange={setDialect} options={DIALECTS} />
          )}
        </div>

        <textarea
          className="nexo-textarea" dir="auto" rows={5} value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={direction === 'to_fusha' ? t('اكتب نصك بالعامية هون...', 'Write your dialect text here...') : t('اكتب نصك بالفصحى هون...', 'Write your formal text here...')}
          maxLength={MAX_TEXT_LENGTH}
        />
        <div className="nexo-char-count">{text.length}/{MAX_TEXT_LENGTH}</div>

        {error && (
          <div className="nexo-inline-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleConvert} disabled={converting} style={{ marginTop: 16, minWidth: 200 }}>
          {converting && <Loader2 size={14} className="nexo-spin" />}
          {converting ? t('جارِ التحويل...', 'Converting...') : t('حوّل النص', 'Convert')}
        </button>

        {result && (
          <div className="nexo-subcard" style={{ marginTop: 20, marginBottom: 0 }}>
            <div className="nexo-card-row-header" style={{ marginBottom: 6 }}>
              <span className="nexo-section-title" style={{ fontSize: 11 }}>{t('النتيجة', 'Result')}</span>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={handleCopy}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
            </div>
            <p className="nexo-result-text" dir="auto" style={{ margin: 0 }}>{result}</p>
          </div>
        )}
      </div>

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
            <div className="nexo-state-title">{t('لا يوجد تحويلات بعد', 'No conversions yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main">
                <div className="nexo-list-item-title" dir="auto">{item.input_text}</div>
                {item.status === 'completed' && <span className="nexo-list-item-sub" dir="auto">{item.output_text}</span>}
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