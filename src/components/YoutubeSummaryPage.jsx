import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, Trash2, AlertCircle, PlayCircle, ArrowRight, Copy, Check, Inbox } from 'lucide-react';
import { exportMessageAsWord } from '../utils/exportDoc.js';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function YoutubeSummaryPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/youtube/summaries`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.summaries || []))
      .catch((err) => { console.error('Load YT history error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSummarize = () => {
    setError('');
    if (!url.trim()) { setError(t('الرجاء لصق رابط الفيديو', 'Please paste a video link')); return; }
    setProcessing(true);

    fetch(`${BASE}/youtube/summarize`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ url: url.trim(), lang }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentResult(data.summary);
        setHistory((prev) => [data.summary, ...prev]);
        setUrl('');
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
    if (!window.confirm(t('حذف هذا الملخص نهائيًا؟', 'Delete this summary permanently?'))) return;
    fetch(`${BASE}/youtube/summaries/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentResult?.id === id) setCurrentResult(null);
      })
      .catch((err) => console.error('Delete YT summary error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/youtube/summaries`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentResult(null); })
      .catch((err) => console.error('Delete all YT summaries error:', err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><PlayCircle size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('ملخّص فيديوهات يوتيوب', 'YouTube Video Summarizer')}</h1>
          <p className="nexo-tool-page-desc">
            {t('الصق رابط أي فيديو يوتيوب فيه ترجمة نصية، وسيلخصه Nexo لك مجانًا.', 'Paste any YouTube video link with captions, and Nexo will summarize it for free.')}
          </p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />
        <input
          type="text" className="nexo-input" dir="ltr" value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />

        {error && (
          <div className="nexo-inline-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleSummarize} disabled={processing} style={{ marginTop: 18, minWidth: 200 }}>
          {processing && <Loader2 size={14} className="nexo-spin" />}
          {processing ? t('جارِ التلخيص...', 'Summarizing...') : t('لخّص الفيديو', 'Summarize')}
        </button>
      </div>

      {currentResult && currentResult.status === 'completed' && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" dir="auto">{currentResult.video_title}</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopy(currentResult.summary_text)} title={t('نسخ', 'Copy')}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => exportMessageAsWord(currentResult.summary_text, currentResult.video_title, lang)} title="Word">
                <Download size={15} />
              </button>
            </div>
          </div>
          <div className="nexo-result-text" dir="auto">{currentResult.summary_text}</div>
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
            <div className="nexo-state-title">{t('لا يوجد ملخصات بعد', 'No summaries yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main">
                <div className="nexo-list-item-title" dir="auto">{item.video_title || item.video_url}</div>
                {item.status === 'failed' ? (
                  <span className="nexo-badge nexo-badge-danger">{t('فشل', 'Failed')}: {item.error_message}</span>
                ) : (
                  <span className="nexo-list-item-sub" dir="auto">{item.summary_text?.slice(0, 60)}...</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {item.status === 'completed' && (
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => setCurrentResult(item)} title={t('عرض', 'View')}><PlayCircle size={14} /></button>
                )}
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
     </div>
    </div>
  );
}