import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Trash2, AlertCircle, Users, ArrowRight, Download, Inbox } from 'lucide-react';
import { exportMessageAsWord } from '../utils/exportDoc.js';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function MeetingNotesPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [inputMode, setInputMode] = useState('audio');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [pastedTranscript, setPastedTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/meeting-notes`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.meetings || []))
      .catch((err) => { console.error('Load meetings error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setError(''); setFile(f); }
  };

  const handleGenerate = () => {
    setError('');
    if (inputMode === 'audio' && !file) { setError(t('الرجاء رفع تسجيل صوتي', 'Please upload an audio recording')); return; }
    if (inputMode === 'text' && !pastedTranscript.trim()) { setError(t('الرجاء لصق نص المحضر', 'Please paste the transcript')); return; }

    setProcessing(true);
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('lang', lang);
    if (inputMode === 'audio') formData.append('audio', file);
    if (inputMode === 'text') formData.append('pastedTranscript', pastedTranscript.trim());

    fetch(`${BASE}/meeting-notes/generate`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrent(data.meeting);
        setHistory((prev) => [data.meeting, ...prev]);
        setFile(null); setPastedTranscript(''); setTitle('');
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setProcessing(false));
  };

  const handleExport = (item) => {
    const md = `# ${item.title}\n\n## ${t('الملخص', 'Summary')}\n${item.summary}\n\n## ${t('نقاط النقاش', 'Key Points')}\n${(item.key_points || []).map((p) => `- ${p}`).join('\n')}\n\n## ${t('القرارات', 'Decisions')}\n${(item.decisions || []).map((d) => `- ${d}`).join('\n')}\n\n## ${t('المهام', 'Action Items')}\n${(item.action_items || []).map((a) => `- ${a.task} (${a.owner} — ${a.dueDate})`).join('\n')}`;
    exportMessageAsWord(md, item.title, lang);
  };

  const handleDelete = (id) => {
    fetch(`${BASE}/meeting-notes/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (current?.id === id) setCurrent(null);
      })
      .catch((err) => console.error('Delete meeting error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل الاجتماعات نهائيًا؟', 'Delete all meetings permanently?'))) return;
    fetch(`${BASE}/meeting-notes`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrent(null); })
      .catch((err) => console.error('Delete all error:', err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Users size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('محاضر الاجتماعات', 'Meeting Notes')}</h1>
          <p className="nexo-tool-page-desc">
            {t('ارفع تسجيل الاجتماع أو الصق نصه، وسيولّد Nexo محضرًا منظمًا: ملخص، قرارات، ومهام بمسؤوليها.', 'Upload the meeting recording or paste its text, and Nexo will generate organized notes: summary, decisions, and action items.')}
          </p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />

        <input className="nexo-input" dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('عنوان الاجتماع (اختياري)', 'Meeting title (optional)')} style={{ marginBottom: 14 }} />

        <div className="nexo-tabs" style={{ marginBottom: 14 }}>
          <button className={`nexo-tab ${inputMode === 'audio' ? 'active' : ''}`} onClick={() => setInputMode('audio')}>{t('تسجيل صوتي', 'Audio recording')}</button>
          <button className={`nexo-tab ${inputMode === 'text' ? 'active' : ''}`} onClick={() => setInputMode('text')}>{t('لصق نص', 'Paste text')}</button>
        </div>

        {inputMode === 'audio' ? (
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
                <span className="nexo-dropzone-text">{t('اضغط لاختيار تسجيل، أو اسحبه وأفلته هون', 'Click to select a recording, or drag and drop it here')}</span>
                <span className="nexo-dropzone-hint">{t('حتى 25MB', 'Up to 25MB')}</span>
              </>
            )}
            <input type="file" accept="audio/*,video/mp4,video/webm" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          </label>
        ) : (
          <textarea className="nexo-textarea" dir="auto" rows={6} value={pastedTranscript} onChange={(e) => setPastedTranscript(e.target.value)} placeholder={t('الصق نص محضر الاجتماع هون...', 'Paste the meeting transcript here...')} />
        )}

        {error && (
          <div className="nexo-inline-error"><AlertCircle size={14} /> {error}</div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleGenerate} disabled={processing} style={{ marginTop: 18, minWidth: 200 }}>
          {processing && <Loader2 size={14} className="nexo-spin" />}
          {processing ? t('جارِ المعالجة...', 'Processing...') : t('توليد المحضر', 'Generate Notes')}
        </button>
      </div>

      {current && current.status === 'completed' && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" dir="auto" style={{ margin: 0 }}>{current.title}</h4>
            <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleExport(current)} title="Word"><Download size={15} /></button>
          </div>

          <p className="nexo-result-text" dir="auto" style={{ marginBottom: 18 }}>{current.summary}</p>

          {current.key_points?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="nexo-section-title" style={{ fontSize: 11, marginBottom: 8 }}>{t('نقاط النقاش', 'Key Points')}</div>
              <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.9 }} dir="auto">
                {current.key_points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {current.decisions?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="nexo-section-title" style={{ fontSize: 11, marginBottom: 8 }}>{t('القرارات', 'Decisions')}</div>
              <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.9 }} dir="auto">
                {current.decisions.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}

          {current.action_items?.length > 0 && (
            <div>
              <div className="nexo-section-title" style={{ fontSize: 11, marginBottom: 8 }}>{t('المهام', 'Action Items')}</div>
              <ul className="nexo-list">
                {current.action_items.map((a, i) => (
                  <li key={i} className="nexo-list-item">
                    <div className="nexo-list-item-main">
                      <div className="nexo-list-item-title" dir="auto" style={{ whiteSpace: 'normal' }}>{a.task}</div>
                    </div>
                    <span className="nexo-list-item-sub" dir="auto" style={{ flexShrink: 0 }}>{a.owner} — {a.dueDate}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
            <div className="nexo-state-title">{t('لا يوجد اجتماعات بعد', 'No meetings yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main" onClick={() => setCurrent(item)} style={{ cursor: 'pointer' }}>
                <div className="nexo-list-item-title" dir="auto">{item.title}</div>
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