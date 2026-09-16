import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Download, Trash2, AlertCircle, Image as ImageIcon, ArrowRight, X, Inbox } from 'lucide-react';
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
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/images`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.generations || []))
      .catch((err) => { console.error('Load image history error:', err); setHistoryError(true); })
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
    <label className={`nexo-image-slot ${preview ? 'has-image' : ''}`}>
      {preview ? (
        <>
          <img src={preview} alt="" />
          <button
            className="nexo-image-slot-clear"
            onClick={(e) => { e.preventDefault(); clearImage(slot); }}
          >
            <X size={12} color="#fff" />
          </button>
        </>
      ) : (
        <>
          <Upload size={18} color="var(--text-secondary)" />
          <span className="nexo-dropzone-hint" style={{ marginTop: 6, padding: '0 6px' }}>
            {t(`صورة ${slot} (اختياري)`, `Image ${slot} (optional)`)}
          </span>
        </>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImageChange(slot, e)} style={{ display: 'none' }} />
    </label>
  );

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner" style={{ maxWidth: 900 }}>
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><ImageIcon size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('استوديو الصور الذكي', 'AI Image Studio')}</h1>
          <p className="nexo-tool-page-desc">
            {t('اكتب وصفًا لتوليد صورة احترافية من الصفر، أو ارفع صورة/صورتين واطلب من Nexo دمجهما أو تعديلهما بدقة (مثل: تغيير الخلفية، دمج شخصين بمشهد واحد، أو تعديل عناصر معينة بالصورة).', 'Write a description to generate a professional image from scratch, or upload 1-2 images and ask Nexo to precisely merge or edit them (e.g. change the background, combine two people into one scene, or adjust specific elements in the photo).')}
          </p>
        </div>
      </div>

      <div className="nexo-card" style={{ marginBottom: 28, position: 'relative' }}>
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
          className="nexo-textarea" dir="auto" rows={4} value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('مثلاً: ادمج الصورتين بحيث يبدو الشخصان يتصافحان بخلفية مكتب عصري...', 'e.g. merge the two photos so both people appear shaking hands in a modern office background...')}
          maxLength={MAX_PROMPT_LENGTH}
        />
        <div className="nexo-char-count">{prompt.length}/{MAX_PROMPT_LENGTH}</div>

        {error && (
          <div className="nexo-inline-error"><AlertCircle size={14} /> {error}</div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, minWidth: 200 }}>
          {generating && <Loader2 size={14} className="nexo-spin" />}
          {generating ? t('جارِ التوليد...', 'Generating...') : t('توليد الصورة', 'Generate Image')}
        </button>
      </div>

      {currentResult && currentResult.result_image_url && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <h4 className="nexo-card-row-title" style={{ marginBottom: 12 }}>{t('النتيجة', 'Result')}</h4>
          <img src={currentResult.result_image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 14 }} />
          <a href={currentResult.result_image_url} download className="nexo-btn nexo-btn-secondary" style={{ textDecoration: 'none' }}>
            <Download size={14} /> {t('تنزيل', 'Download')}
          </a>
        </div>
      )}

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && (
          <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>
            {t('مسح الكل', 'Clear all')}
          </button>
        )}
      </div>

      {loadingHistory ? (
        <div className="nexo-gallery-grid">
          {[0, 1, 2, 3].map((i) => <div key={i} className="nexo-skeleton" style={{ height: 170, borderRadius: 12 }} />)}
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
            <div className="nexo-state-title">{t('لا يوجد صور بعد', 'No images yet')}</div>
          </div>
        </div>
      ) : (
        <div className="nexo-gallery-grid">
          {history.map((item) => (
            <div key={item.id} className="nexo-gallery-item">
              {item.status === 'completed' && item.result_image_url ? (
                <img src={item.result_image_url} alt="" className="nexo-gallery-thumb" />
              ) : item.status === 'failed' ? (
                <div className="nexo-gallery-placeholder">
                  <AlertCircle size={20} color="var(--color-error)" />
                  <span style={{ fontSize: 11, color: 'var(--color-error)' }}>{t('فشل', 'Failed')}</span>
                </div>
              ) : (
                <div className="nexo-gallery-placeholder">
                  <Loader2 size={20} className="nexo-spin" color="var(--accent-2)" />
                </div>
              )}
              <p className="nexo-list-item-sub" dir="auto" style={{ margin: '8px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.prompt}
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {item.status === 'completed' && item.result_image_url && (
                  <a href={item.result_image_url} download className="nexo-btn nexo-btn-ghost nexo-btn-icon" title={t('تنزيل', 'Download')}><Download size={13} /></a>
                )}
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
     </div>
    </div>
  );
}