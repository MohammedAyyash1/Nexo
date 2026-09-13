import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Copy, Check, Download, Trash2, AlertCircle, ScanText, ArrowRight } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function OCRPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = () => {
    fetch(`${BASE}/ocr/history`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => console.error('Load OCR history error:', err))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
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
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoOcrSpin { to { transform: rotate(360deg); } } .nexo-ocr-spin { animation: nexoOcrSpin 1s linear infinite; }`}</style>

      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ScanText size={20} /> {t('استخراج النص من الصور (OCR)', 'Text Extraction (OCR)')}
      </h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>
        {t('ارفع صورة فيها نص (مستند، لافتة، خط يد) وسيستخرج Nexo النص منها بدقة.', 'Upload an image with text (document, sign, handwriting) and Nexo will extract it accurately.')}
      </p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32 }}>
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: preview ? 0 : '30px 16px', borderRadius: 12, border: '1px dashed var(--border-input)',
          cursor: 'pointer', background: 'var(--bg-input-2)', textAlign: 'center', overflow: 'hidden',
        }}>
          {preview ? (
            <img src={preview} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'contain' }} />
          ) : (
            <>
              <Upload size={22} color="var(--text-secondary)" />
              <span style={{ marginTop: 8, fontSize: 13.5 }}>{t('اضغط لاختيار صورة', 'Click to select an image')}</span>
            </>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        {error && (
          <p className="settings-hint" style={{ color: '#f87171', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <button className="settings-btn" onClick={handleExtract} disabled={processing || !file} style={{ marginTop: 16, maxWidth: 220 }}>
          {processing && <Loader2 size={14} className="nexo-ocr-spin" />}
          {processing ? t('جارِ الاستخراج...', 'Extracting...') : t('استخراج النص', 'Extract Text')}
        </button>
      </div>

      {currentResult && currentResult.status === 'completed' && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 className="settings-group-title" style={{ margin: 0 }}>{t('النص المستخرج', 'Extracted Text')}</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn" onClick={() => handleCopy(currentResult.extracted_text)}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
              <button className="icon-btn" onClick={() => handleDownload(currentResult.extracted_text)}><Download size={15} /></button>
            </div>
          </div>
          <textarea className="settings-textarea" rows={8} readOnly value={currentResult.extracted_text} />
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
        <p className="settings-hint">{t('لا يوجد استخراجات سابقة.', 'No extractions yet.')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {history.map((item) => (
            <div key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: 10, cursor: 'pointer' }} onClick={() => setCurrentResult(item)}>
              {item.source_image_url && (
                <img src={item.source_image_url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="settings-hint" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {item.status === 'completed' ? item.extracted_text?.slice(0, 30) : t('فشل', 'Failed')}
                </span>
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} style={{ width: 20, height: 20, flexShrink: 0 }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}