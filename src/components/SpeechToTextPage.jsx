import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Copy, Check, Download, Trash2, AlertCircle, Mic, ArrowRight, Inbox } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function SpeechToTextPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const inputRef = useRef(null);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/stt/jobs`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.jobs || []))
      .catch((err) => { console.error('Load STT history error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const selectFile = (f) => {
    if (!f) return;
    setError('');
    setCurrentResult(null);
    setFile(f);
  };

  const handleFileChange = (e) => selectFile(e.target.files?.[0]);
  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  const handleTranscribe = () => {
    if (!file) { setError(t('الرجاء اختيار ملف', 'Please select a file')); return; }
    setError('');
    setProcessing(true);

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${BASE}/stt/jobs`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentResult(data.transcription);
        setHistory((prev) => [data.transcription, ...prev]);
        setFile(null);
        if (inputRef.current) inputRef.current.value = '';
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setProcessing(false));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = (item) => {
    const blob = new Blob([item.transcript_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.source_file_name}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/stt/jobs`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentResult(null); })
      .catch((err) => console.error('Delete all STT error:', err));
  };

  const handleDelete = (id) => {
    if (!window.confirm(t('حذف هذا التفريغ نهائيًا؟', 'Delete this transcription permanently?'))) return;
    fetch(`${BASE}/stt/jobs/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentResult?.id === id) setCurrentResult(null);
      })
      .catch((err) => console.error('Delete transcription error:', err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Mic size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('تحويل الصوت إلى نص', 'Speech to Text')}</h1>
          <p className="nexo-tool-page-desc">
            {t('ارفع ملف صوت أو فيديو (MP3, WAV, M4A, MP4, WebM) وسيقوم Nexo بتحويله إلى نص قابل للنسخ.', 'Upload an audio or video file (MP3, WAV, M4A, MP4, WebM) and Nexo will convert it to copyable text.')}
          </p>
        </div>
      </div>

      <div className="nexo-card" style={{ marginBottom: 28 }}>
        <label
          className={`nexo-dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        >
          <div className="nexo-dropzone-icon"><Upload size={22} /></div>
          {file ? (
            <>
              <span className="nexo-dropzone-text" dir="auto">{file.name}</span>
              <span className="nexo-dropzone-hint">{t('اضغط لاختيار ملف آخر', 'Click to choose a different file')}</span>
            </>
          ) : (
            <>
              <span className="nexo-dropzone-text">{t('اضغط لاختيار ملف، أو اسحبه وأفلته هون', 'Click to select a file, or drag and drop it here')}</span>
              <span className="nexo-dropzone-hint">{t('حتى 25MB', 'Up to 25MB')}</span>
            </>
          )}
          <input ref={inputRef} type="file" accept="audio/*,video/mp4,video/webm" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        {error && (
          <div className="nexo-inline-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleTranscribe} disabled={processing || !file} style={{ marginTop: 18, minWidth: 200 }}>
          {processing && <Loader2 size={14} className="nexo-spin" />}
          {processing ? t('جارِ التحويل...', 'Transcribing...') : t('تحويل إلى نص', 'Transcribe')}
        </button>
      </div>

      {currentResult && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('النص الناتج', 'Result')}</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopy(currentResult.transcript_text)} title={t('نسخ', 'Copy')}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDownload(currentResult)} title={t('تنزيل', 'Download')}>
                <Download size={15} />
              </button>
            </div>
          </div>
          <textarea
            className="nexo-textarea" dir="auto" rows={8} readOnly value={currentResult.transcript_text}
          />
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
            <div className="nexo-state-title">{t('لا يوجد تفريغات بعد', 'No transcriptions yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main">
                <div className="nexo-list-item-title" dir="auto">{item.source_file_name}</div>
                {item.status === 'failed' ? (
                  <span className="nexo-badge nexo-badge-danger">{t('فشل', 'Failed')}: {item.error_message}</span>
                ) : (
                  <span className="nexo-list-item-sub" dir="auto">{item.transcript_text?.slice(0, 60)}...</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {item.status === 'completed' && (
                  <>
                    <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => setCurrentResult(item)} title={t('عرض', 'View')}>
                      <Copy size={14} />
                    </button>
                    <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDownload(item)} title={t('تنزيل', 'Download')}>
                      <Download size={14} />
                    </button>
                  </>
                )}
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}>
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
     </div>
    </div>
  );
}