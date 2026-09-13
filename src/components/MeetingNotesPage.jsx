import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Trash2, AlertCircle, Users, ArrowRight, Download } from 'lucide-react';
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
  const [pastedTranscript, setPastedTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = () => {
    fetch(`${BASE}/meeting-notes`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.meetings || []))
      .catch((err) => console.error('Load meetings error:', err))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

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
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoMeetSpin { to { transform: rotate(360deg); } } .nexo-meet-spin { animation: nexoMeetSpin 1s linear infinite; }`}</style>

      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={20} /> {t('محاضر الاجتماعات', 'Meeting Notes')}
      </h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>
        {t('ارفع تسجيل الاجتماع أو الصق نصه، وسيولّد Nexo محضرًا منظمًا: ملخص، قرارات، ومهام بمسؤوليها.', "Upload the meeting recording or paste its text, and Nexo will generate organized notes: summary, decisions, and action items.")}
      </p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32 }}>
        <input className="settings-text-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('عنوان الاجتماع (اختياري)', 'Meeting title (optional)')} style={{ marginBottom: 12 }} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className={`settings-style-chip ${inputMode === 'audio' ? 'active' : ''}`} onClick={() => setInputMode('audio')} style={{ flex: 1 }}>{t('تسجيل صوتي', 'Audio recording')}</button>
          <button className={`settings-style-chip ${inputMode === 'text' ? 'active' : ''}`} onClick={() => setInputMode('text')} style={{ flex: 1 }}>{t('لصق نص', 'Paste text')}</button>
        </div>

        {inputMode === 'audio' ? (
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '30px 16px', borderRadius: 12, border: '1px dashed var(--border-input)',
            cursor: 'pointer', background: 'var(--bg-input-2)', textAlign: 'center',
          }}>
            <Upload size={22} color="var(--text-secondary)" />
            <span style={{ marginTop: 8, fontSize: 13.5 }}>{file ? file.name : t('اضغط لاختيار تسجيل (حتى 25MB)', 'Click to select a recording (up to 25MB)')}</span>
            <input type="file" accept="audio/*,video/mp4,video/webm" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          </label>
        ) : (
          <textarea className="settings-textarea" rows={6} value={pastedTranscript} onChange={(e) => setPastedTranscript(e.target.value)} placeholder={t('الصق نص محضر الاجتماع هون...', 'Paste the meeting transcript here...')} />
        )}

        {error && (
          <p className="settings-hint" style={{ color: '#f87171', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <button className="settings-btn" onClick={handleGenerate} disabled={processing} style={{ marginTop: 16, maxWidth: 220 }}>
          {processing && <Loader2 size={14} className="nexo-meet-spin" />}
          {processing ? t('جارِ المعالجة...', 'Processing...') : t('توليد المحضر', 'Generate Notes')}
        </button>
      </div>

      {current && current.status === 'completed' && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 className="settings-group-title" style={{ margin: 0 }}>{current.title}</h4>
            <button className="icon-btn" onClick={() => handleExport(current)} title="Word"><Download size={15} /></button>
          </div>

          <p style={{ fontSize: 14, lineHeight: 1.8 }}>{current.summary}</p>

          {current.key_points?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h5 className="settings-hint" style={{ marginBottom: 6 }}>{t('نقاط النقاش', 'Key Points')}</h5>
              <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13.5 }}>
                {current.key_points.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}
              </ul>
            </div>
          )}

          {current.decisions?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h5 className="settings-hint" style={{ marginBottom: 6 }}>{t('القرارات', 'Decisions')}</h5>
              <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13.5 }}>
                {current.decisions.map((d, i) => <li key={i} style={{ marginBottom: 4 }}>{d}</li>)}
              </ul>
            </div>
          )}

          {current.action_items?.length > 0 && (
            <div>
              <h5 className="settings-hint" style={{ marginBottom: 6 }}>{t('المهام', 'Action Items')}</h5>
              {current.action_items.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
                  <span>{a.task}</span>
                  <span className="settings-hint">{a.owner} — {a.dueDate}</span>
                </div>
              ))}
            </div>
          )}
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
        <p className="settings-hint">{t('لا يوجد اجتماعات بعد.', 'No meetings yet.')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((item) => (
            <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span onClick={() => setCurrent(item)} style={{ cursor: 'pointer', fontSize: 13.5 }}>{item.title}</span>
              <button className="icon-btn" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}