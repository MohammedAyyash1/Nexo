import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Download, Trash2, AlertCircle, Image as ImageIcon, ArrowRight, X } from 'lucide-react';
import { ComingSoonOverlay } from './ComingSoonOverlay.jsx';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;
const MAX_PROMPT_LENGTH = 1000;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function ImageStudioPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [prompt, setPrompt] = useState('');
  const [image1, setImage1] = useState(null);
  const [image1Preview, setImage1Preview] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image2Preview, setImage2Preview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = () => {
    fetch(`${BASE}/images`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.generations || []))
      .catch((err) => console.error('Load image history error:', err))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleImageChange = (slot, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('صيغة الصورة غير مدعومة', 'Unsupported image format'));
      return;
    }
    setError('');
    const preview = URL.createObjectURL(file);
    if (slot === 1) { setImage1(file); setImage1Preview(preview); } else { setImage2(file); setImage2Preview(preview); }
  };

  const clearImage = (slot) => {
    if (slot === 1) { setImage1(null); setImage1Preview(null); } else { setImage2(null); setImage2Preview(null); }
  };

  const handleGenerate = () => {
    setError('');
    if (!prompt.trim()) { setError(t('الرجاء كتابة وصف', 'Please enter a description')); return; }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      setError(t(`الوصف طويل جدًا (الحد الأقصى ${MAX_PROMPT_LENGTH} حرف)`, `Description too long (max ${MAX_PROMPT_LENGTH} chars)`));
      return;
    }

    setGenerating(true);
    const formData = new FormData();
    formData.append('prompt', prompt.trim());
    if (image1) formData.append('image1', image1);
    if (image2) formData.append('image2', image2);

    fetch(`${BASE}/images/generate`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentResult(data.generation);
        setHistory((prev) => [data.generation, ...prev]);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setGenerating(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm(t('حذف هذه الصورة نهائيًا؟', 'Delete this image permanently?'))) return;
    fetch(`${BASE}/images/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentResult?.id === id) setCurrentResult(null);
      })
      .catch((err) => console.error('Delete image gen error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/images`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentResult(null); })
      .catch((err) => console.error('Delete all image gens error:', err));
  };

  const ImageSlot = ({ slot, preview }) => (
    <label style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      width: 140, height: 140, borderRadius: 12, border: '1px dashed var(--border-input)',
      cursor: 'pointer', overflow: 'hidden', background: 'var(--bg-input-2)', position: 'relative', flexShrink: 0,
    }}>
      {preview ? (
        <>
          <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            onClick={(e) => { e.preventDefault(); clearImage(slot); }}
            style={{ position: 'absolute', top: 4, insetInlineEnd: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={12} color="#fff" />
          </button>
        </>
      ) : (
        <>
          <Upload size={18} color="var(--text-secondary)" />
          <span className="settings-hint" style={{ marginTop: 6, fontSize: 11.5, textAlign: 'center', padding: '0 6px' }}>
            {t(`صورة ${slot} (اختياري)`, `Image ${slot} (optional)`)}
          </span>
        </>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImageChange(slot, e)} style={{ display: 'none' }} />
    </label>
  );

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoImgSpin { to { transform: rotate(360deg); } } .nexo-img-spin { animation: nexoImgSpin 1s linear infinite; }`}</style>

      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ImageIcon size={20} /> {t('استوديو الصور الذكي', 'AI Image Studio')}
      </h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>
        {t('اكتب وصفًا لتوليد صورة احترافية من الصفر، أو ارفع صورة/صورتين واطلب من Nexo دمجهما أو تعديلهما بدقة (مثل: تغيير الخلفية، دمج شخصين بمشهد واحد، أو تعديل عناصر معينة بالصورة).', 'Write a description to generate a professional image from scratch, or upload 1-2 images and ask Nexo to precisely merge or edit them (e.g. change the background, combine two people into one scene, or adjust specific elements in the photo).')}
      </p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32, position: 'relative' }}>
        <ComingSoonOverlay
          lang={lang}
          titleAr="استوديو الصور — قريبًا"
          titleEn="Image Studio — Coming Soon"
          reasonAr="نجهّز حاليًا مزوّد توليد صور موثوق وآمن. الميزة هترجع تلقائيًا فور جاهزيتها، بدون أي تغيير على التطبيق."
          reasonEn="We're setting up a reliable, safe image provider. This feature will return automatically once ready — no app changes needed."
        />
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <ImageSlot slot={1} preview={image1Preview} />
          <ImageSlot slot={2} preview={image2Preview} />
        </div>

        <textarea
          className="settings-textarea" rows={4} value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('مثلاً: ادمج الصورتين بحيث يبدو الشخصان يتصافحان بخلفية مكتب عصري...', 'e.g. merge the two photos so both people appear shaking hands in a modern office background...')}
          maxLength={MAX_PROMPT_LENGTH}
        />
        <div className="settings-char-count">{prompt.length}/{MAX_PROMPT_LENGTH}</div>

        {error && (
          <p className="settings-hint" style={{ color: '#f87171', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <button className="settings-btn" onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, maxWidth: 220 }}>
          {generating && <Loader2 size={14} className="nexo-img-spin" />}
          {generating ? t('جارِ التوليد...', 'Generating...') : t('توليد الصورة', 'Generate Image')}
        </button>
      </div>

      {currentResult && currentResult.result_image_url && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
          <h4 className="settings-group-title" style={{ marginBottom: 10 }}>{t('النتيجة', 'Result')}</h4>
          <img src={currentResult.result_image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 12 }} />
          <a href={currentResult.result_image_url} download className="settings-btn" style={{ maxWidth: 160, textDecoration: 'none' }}>
            <Download size={14} /> {t('تنزيل', 'Download')}
          </a>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && (
          <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>
            {t('مسح الكل', 'Clear all')}
          </button>
        )}
      </div>

      {loadingHistory ? (
        <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p>
      ) : history.length === 0 ? (
        <p className="settings-hint">{t('لا يوجد صور سابقة.', 'No images yet.')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {history.map((item) => (
            <div key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 12, padding: 10 }}>
              {item.status === 'completed' && item.result_image_url ? (
                <img src={item.result_image_url} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
              ) : item.status === 'failed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 130, gap: 6 }}>
                  <AlertCircle size={20} color="#f87171" />
                  <span style={{ fontSize: 11, color: '#f87171', textAlign: 'center' }}>{t('فشل', 'Failed')}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 130 }}>
                  <Loader2 size={20} className="nexo-img-spin" color="var(--accent-2)" />
                </div>
              )}
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.prompt}
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {item.status === 'completed' && item.result_image_url && (
                  <a href={item.result_image_url} download className="icon-btn" title={t('تنزيل', 'Download')}><Download size={13} /></a>
                )}
                <button className="icon-btn" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}