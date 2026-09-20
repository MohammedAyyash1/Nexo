import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Copy, Check, Download, Trash2, AlertCircle, ScanText, ArrowRight, Inbox } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'en' || saved === 'ar') return saved;
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return browserLang.startsWith('ar') ? 'ar' : 'en';
}

export function OCRPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
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
    fetch(`${BASE}/ocr/history`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => { console.error('Load OCR history error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const selectFile = (f) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError(t('صيغة الصورة غير مدعومة', 'Unsupported image format'));
      return;
    }
    setError('');
    setCurrentResult(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleFileChange = (e) => selectFile(e.target.files?.[0]);
  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e) => { e.preventDefault(); setDragActive(false); selectFile(e.dataTransfer.files?.[0]); };

  const handleExtract = () => {
    if (!file) { setError(t('الرجاء اختيار صورة', 'Please select an image')); return; }
    setError('');
    setProcessing(true);

    const formData = new FormData();
    formData.append('image', file);

    fetch(`${BASE}/ocr/extract`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentResult(data.extraction);
        setHistory((prev) => [data.extraction, ...prev]);
        setFile(null);
        setPreview(null);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setProcessing(false));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = (text) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id) => {
    fetch(`${BASE}/ocr/history/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentResult?.id === id) setCurrentResult(null);
      })
      .catch((err) => console.error('Delete OCR error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/ocr/history`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentResult(null); })
      .catch((err) => console.error('Delete all OCR error:', err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><ScanText size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('استخراج النص من الصور (OCR)', 'Text Extraction (OCR)')}</h1>
          <p className="nexo-tool-page-desc">
            {t('ارفع صورة فيها نص (مستند، لافتة، خط يد) وسيستخرج Nexo النص منها بدقة.', 'Upload an image with text (document, sign, handwriting) and Nexo will extract it accurately.')}
          </p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />
        <label
          className={`nexo-dropzone ${dragActive ? 'drag-active' : ''} ${preview ? 'has-file' : ''}`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          style={preview ? { padding: 0, overflow: 'hidden' } : undefined}
        >
          {preview ? (
            <img src={preview} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'contain' }} />
          ) : (
            <>
              <div className="nexo-dropzone-icon"><Upload size={22} /></div>
              <span className="nexo-dropzone-text">{t('اضغط لاختيار صورة، أو اسحبها وأفلتها هون', 'Click to select an image, or drag and drop it here')}</span>
              <span className="nexo-dropzone-hint">JPG · PNG · WEBP</span>
            </>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        {error && (
          <div className="nexo-inline-error"><AlertCircle size={14} /> {error}</div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleExtract} disabled={processing || !file} style={{ marginTop: 18, minWidth: 200 }}>
          {processing && <Loader2 size={14} className="nexo-spin" />}
          {processing ? t('جارِ الاستخراج...', 'Extracting...') : t('استخراج النص', 'Extract Text')}
        </button>
      </div>

      {currentResult && currentResult.status === 'completed' && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('النص المستخرج', 'Extracted Text')}</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopy(currentResult.extracted_text)}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDownload(currentResult.extracted_text)}><Download size={15} /></button>
            </div>
          </div>
          <textarea className="nexo-textarea" dir="auto" rows={8} readOnly value={currentResult.extracted_text} />
        </div>
      )}

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && (
          <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>{t('مسح الكل', 'Clear all')}</button>
        )}
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
            <div className="nexo-state-title">{t('لا يوجد استخراجات بعد', 'No extractions yet')}</div>
          </div>
        </div>
      ) : (
        <div className="nexo-gallery-grid">
          {history.map((item) => (
            <div key={item.id} className="nexo-gallery-item" onClick={() => setCurrentResult(item)}>
              {item.source_image_url && (
                <img src={item.source_image_url} alt="" className="nexo-gallery-thumb" />
              )}
              <div className="nexo-gallery-footer">
                <span className="nexo-list-item-sub" dir="auto" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.status === 'completed' ? item.extracted_text?.slice(0, 30) : t('فشل', 'Failed')}
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