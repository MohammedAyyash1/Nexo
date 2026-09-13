import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Megaphone, ArrowRight, Copy, Check } from 'lucide-react';
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

  const loadHistory = () => {
    fetch(`${BASE}/ads`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setHistory(data.ads || []))
      .catch((err) => console.error(err)).finally(() => setLoadingHistory(false));
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
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoAdSpin { to { transform: rotate(360deg); } } .nexo-ad-spin { animation: nexoAdSpin 1s linear infinite; }`}</style>
      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}><ArrowRight size={15} /> {t('رجوع', 'Back')}</button>
      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Megaphone size={20} /> {t('مولّد الإعلانات', 'Ad Generator')}</h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>{t('اكتب فكرة إعلانك، وسيولّد Nexo عنوانًا ووصفًا ودعوة لاتخاذ إجراء + صورة إعلان، مجانًا بالكامل.', 'Describe your ad idea, and Nexo will generate a headline, description, CTA, and an ad image — completely free.')}</p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32, position: 'relative' }}>
        <ComingSoonOverlay
          lang={lang}
          titleAr="صورة الإعلان — قريبًا"
          titleEn="Ad Image — Coming Soon"
          reasonAr="نص الإعلان (العنوان والوصف والـCTA) شغّال بالكامل. صورة الإعلان معطّلة مؤقتًا لحين تجهيز مزوّد صور موثوق."
          reasonEn="Ad copy (headline, description, CTA) is fully working. The ad image is temporarily disabled pending a reliable image provider."
        />
        <textarea className="settings-textarea" rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t('كل ما وصفت أكتر، كانت النتيجة أدق. مثلاً: "قهوة عربية مختصة بأكياس أنيقة سوداء وذهبية، توصيل خلال ساعة داخل غزة، استهداف محبي القهوة"', 'The more detail you give, the better the result. e.g. "Specialty Arabic coffee in elegant black and gold bags, delivered within an hour in Gaza, targeting coffee lovers"')} />
        {error && <p className="settings-hint" style={{ color: '#f87171', marginTop: 12 }}><AlertCircle size={13} style={{ display: 'inline', marginInlineEnd: 4 }} />{error}</p>}
        <button className="settings-btn" onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, maxWidth: 200 }}>
          {generating && <Loader2 size={14} className="nexo-ad-spin" />} {generating ? t('جارِ التوليد...', 'Generating...') : t('توليد الإعلان', 'Generate Ad')}
        </button>
      </div>

      {current && current.status === 'completed' && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 className="settings-group-title" style={{ margin: 0 }}>{t('نتيجة الإعلان', 'Ad Result')}</h4>
            <button className="icon-btn" onClick={() => handleCopy(current)}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>
          {current.ad_image_url && <img src={current.ad_image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 14 }} />}
          <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{current.headline}</h3>
          <p style={{ fontSize: 14, lineHeight: 1.8, margin: '0 0 10px' }}>{current.description}</p>
          <span className="settings-btn" style={{ display: 'inline-flex', width: 'auto', padding: '8px 18px' }}>{current.cta}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>
      {loadingHistory ? <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p> : history.length === 0 ? <p className="settings-hint">{t('لا يوجد إعلانات بعد.', 'No ads yet.')}</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {history.map((item) => (
            <div key={item.id} onClick={() => setCurrent(item)} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: 10, cursor: 'pointer' }}>
              {item.ad_image_url && <img src={item.ad_image_url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="settings-hint" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.headline || t('فشل', 'Failed')}</span>
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} style={{ width: 20, height: 20, flexShrink: 0 }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}