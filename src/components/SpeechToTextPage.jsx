import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cloud, Loader2, Copy, Check, Download, Trash2, AlertCircle, Mic, Square,
  ArrowRight, Inbox, FolderOpen, Eye, Clock, Zap, Languages, ShieldCheck, Target,
} from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;
const HISTORY_PREVIEW_COUNT = 5;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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
  const [copiedId, setCopiedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const inputRef = useRef(null);

  // --- تسجيل صوتي مباشر ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const FEATURES = [
    { icon: Target, label: t('دقة عالية', 'High Accuracy'), desc: t('مع الحفاظ على التنسيق', 'Keeps formatting intact') },
    { icon: Languages, label: t('يدعم لغات متعددة', 'Multi-language'), desc: t('عربي - إنجليزي وأيضًا', 'Arabic, English & more') },
    { icon: ShieldCheck, label: t('أمن وخصوصية', 'Secure & Private'), desc: t('بياناتك بأمان', 'Your data stays safe') },
    { icon: Zap, label: t('معالجة سريعة', 'Fast Processing'), desc: t('خلال ثوانٍ', 'Within seconds') },
  ];

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
  useEffect(() => () => clearInterval(recordTimerRef.current), []);

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

  const submitTranscription = (fileToSend) => {
    if (!fileToSend) { setError(t('الرجاء اختيار ملف', 'Please select a file')); return; }
    setError('');
    setProcessing(true);

    const formData = new FormData();
    formData.append('file', fileToSend);

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

  const handleTranscribe = () => submitTranscription(file);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        clearInterval(recordTimerRef.current);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const recordedFile = new File([blob], `${t('تسجيل-صوتي', 'recording')}-${Date.now()}.webm`, { type: 'audio/webm' });
        setFile(recordedFile);
        submitTranscription(recordedFile);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setError(t('يجب السماح باستخدام المايكروفون', 'Microphone access is required'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => (isRecording ? stopRecording() : startRecording());

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
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

  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW_COUNT);

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
            {t('حوّل ملفاتك الصوتية إلى نص مكتوب بدقة عالية يدعم مختلف الصيغ واللغات.', 'Upload an audio or video file (MP3, WAV, M4A, MP4, WebM) and Nexo will convert it to copyable text.')}
          </p>
        </div>
      </div>

      <div className="nexo-card" style={{ marginBottom: 20 }}>
        <label
          className={`nexo-dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        >
          <div className="nexo-dropzone-icon"><Cloud size={22} /></div>
          {file ? (
            <>
              <span className="nexo-dropzone-text" dir="auto">{file.name}</span>
              <span className="nexo-dropzone-hint">{t('اضغط لاختيار ملف آخر', 'Click to choose a different file')}</span>
            </>
          ) : (
            <>
              <span className="nexo-dropzone-text">{t('اضغط لاختيار ملف، أو اسحبه وأفلته هنا', 'Click to select a file, or drag and drop it here')}</span>
              <span className="nexo-dropzone-hint">{t('الحد الأقصى لحجم الملف 25MB', 'Up to 25MB')}</span>
            </>
          )}
          <input ref={inputRef} type="file" accept="audio/*,video/mp4,video/webm" onChange={handleFileChange} style={{ display: 'none' }} disabled={isRecording} />
        </label>

        <div className="nexo-auth-divider">{t('أو', 'or')}</div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="nexo-btn nexo-btn-primary"
            onClick={toggleRecording}
            disabled={processing}
            style={{ flex: 1, minWidth: 180 }}
          >
            {isRecording ? (
              <>
                <span className="composer-v3-status-dot" style={{ background: 'var(--color-error)' }} />
                {t('إيقاف التسجيل', 'Stop recording')} · {formatDuration(recordSeconds)}
              </>
            ) : (
              <>
                <Mic size={15} /> {t('تسجيل صوتي مباشر', 'Record live audio')}
              </>
            )}
          </button>
          <button
            className="nexo-btn nexo-btn-secondary"
            onClick={() => inputRef.current?.click()}
            disabled={processing || isRecording}
            style={{ flex: 1, minWidth: 140 }}
          >
            <FolderOpen size={15} /> {t('من ملف', 'From file')}
          </button>
        </div>

        {error && (
          <div className="nexo-inline-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {file && !isRecording && (
          <button className="nexo-btn nexo-btn-primary" onClick={handleTranscribe} disabled={processing} style={{ marginTop: 16, minWidth: 200 }}>
            {processing && <Loader2 size={14} className="nexo-spin" />}
            {processing ? t('جارِ التحويل...', 'Transcribing...') : t('تحويل إلى نص', 'Transcribe')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        {FEATURES.map((f) => (
          <div key={f.label} className="nexo-premium-card nexo-quick-action-card" style={{ flex: '1 1 200px', cursor: 'default' }}>
            <div className="nexo-quick-action-icon"><f.icon size={17} /></div>
            <div className="nexo-quick-action-texts">
              <div className="nexo-quick-action-label">{f.label}</div>
              <div className="nexo-quick-action-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {currentResult && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('النص الناتج', 'Result')}</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopyText(currentResult.transcript_text, 'current')} title={t('نسخ', 'Copy')}>
                {copiedId === 'current' ? <Check size={15} /> : <Copy size={15} />}
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

      <div className="nexo-tool-page-header" style={{ marginBottom: 14, alignItems: 'center' }}>
        <h3 className="nexo-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={13} /> {t('الملفات الأخيرة', 'Recent files')}
        </h3>
        <div style={{ display: 'flex', gap: 10, marginInlineStart: 'auto', alignItems: 'center' }}>
          {history.length > HISTORY_PREVIEW_COUNT && (
            <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => setShowAllHistory((s) => !s)}>
              {showAllHistory ? t('عرض أقل', 'Show less') : t('عرض الكل', 'View all')}
            </button>
          )}
          {history.length > 0 && (
            <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)' }}>
              {t('مسح الكل', 'Clear all')}
            </button>
          )}
        </div>
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
          {visibleHistory.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-file-row-icon"><Mic size={15} /></div>
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
                      <Eye size={14} />
                    </button>
                    <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopyText(item.transcript_text, item.id)} title={t('نسخ', 'Copy')}>
                      {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
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