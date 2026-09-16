import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Megaphone, ArrowRight, Copy, Check, Inbox } from 'lucide-react';
import { ComingSoonOverlay } from './ComingSoonOverlay.jsx';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function AdGeneratorPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [idea, setIdea] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/ads`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setHistory(data.ads || []))
      .catch((err) => { console.error(err); setHistoryError(true); }).finally(() => setLoadingHistory(false));
  };
  useEffect(() => { loadHistory(); }, []);

  const handleGenerate = () => {
    setError('');
    if (!idea.trim()) { setError(t('الرجاء وصف فكرة الإعلان', 'Please describe the ad idea')); return; }
    setGenerating(true);
    fetch(`${BASE}/ads/generate`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ productIdea: idea.trim(), lang }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrent(data.ad);
        setHistory((prev) => [data.ad, ...prev]);
        setIdea('');
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setGenerating(false));
  };

  const handleCopy = (item) => {
    navigator.clipboard.writeText(`${item.headline}\n\n${item.description}\n\n${item.cta}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = (id) => {
    fetch(`${BASE}/ads/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory((prev) => prev.filter((h) => h.id !== id)); if (current?.id === id) setCurrent(null); })
      .catch((err) => console.error(err));
  };
  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل الإعلانات نهائيًا؟', 'Delete all ads permanently?'))) return;
    fetch(`${BASE}/ads`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrent(null); }).catch((err) => console.error(err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Megaphone size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('مولّد الإعلانات', 'Ad Generator')}</h1>
          <p className="nexo-tool-page-desc">{t('اكتب فكرة إعلانك، وسيولّد Nexo عنوانًا ووصفًا ودعوة لاتخاذ إجراء + صورة إعلان، مجانًا بالكامل.', 'Describe your ad idea, and Nexo will generate a headline, description, CTA, and an ad image — completely free.')}</p>
        </div>
      </div>

      <div className="nexo-card" style={{ marginBottom: 28, position: 'relative' }}>
        <ComingSoonOverlay
          lang={lang}
          titleAr="صورة الإعلان — قريبًا"
          titleEn="Ad Image — Coming Soon"
          reasonAr="نص الإعلان (العنوان والوصف والـCTA) شغّال بالكامل. صورة الإعلان معطّلة مؤقتًا لحين تجهيز مزوّد صور موثوق."
          reasonEn="Ad copy (headline, description, CTA) is fully working. The ad image is temporarily disabled pending a reliable image provider."
        />
        <textarea className="nexo-textarea" dir="auto" rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t('كل ما وصفت أكتر، كانت النتيجة أدق. مثلاً: "قهوة عربية مختصة بأكياس أنيقة سوداء وذهبية، توصيل خلال ساعة داخل غزة، استهداف محبي القهوة"', 'The more detail you give, the better the result. e.g. "Specialty Arabic coffee in elegant black and gold bags, delivered within an hour in Gaza, targeting coffee lovers"')} />
        {error && <div className="nexo-inline-error"><AlertCircle size={13} />{error}</div>}
        <button className="nexo-btn nexo-btn-primary" onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, minWidth: 200 }}>
          {generating && <Loader2 size={14} className="nexo-spin" />} {generating ? t('جارِ التوليد...', 'Generating...') : t('توليد الإعلان', 'Generate Ad')}
        </button>
      </div>

      {current && current.status === 'completed' && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('نتيجة الإعلان', 'Ad Result')}</h4>
            <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopy(current)}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>
          {current.ad_image_url && <img src={current.ad_image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 16 }} />}
          <h3 dir="auto" style={{ margin: '0 0 8px', fontSize: 19, color: 'var(--text-primary)', fontWeight: 700 }}>{current.headline}</h3>
          <p className="nexo-result-text" dir="auto" style={{ margin: '0 0 14px' }}>{current.description}</p>
          <span className="nexo-btn nexo-btn-primary" style={{ display: 'inline-flex', cursor: 'default' }} dir="auto">{current.cta}</span>
        </div>
      )}

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>

      {loadingHistory ? (
        <div className="nexo-gallery-grid">
          {[0, 1, 2, 3].map((i) => <div key={i} className="nexo-skeleton" style={{ height: 130, borderRadius: 12 }} />)}
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
            <div className="nexo-state-title">{t('لا يوجد إعلانات بعد', 'No ads yet')}</div>
          </div>
        </div>
      ) : (
        <div className="nexo-gallery-grid">
          {history.map((item) => (
            <div key={item.id} className="nexo-gallery-item" onClick={() => setCurrent(item)}>
              {item.ad_image_url && <img src={item.ad_image_url} alt="" className="nexo-gallery-thumb" />}
              <div className="nexo-gallery-footer">
                <span className="nexo-list-item-sub" dir="auto" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.headline || t('فشل', 'Failed')}
                </span>
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} style={{ padding: 4 }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
     </div>
    </div>
  );
}