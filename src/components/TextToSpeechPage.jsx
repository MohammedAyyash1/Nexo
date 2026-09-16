import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, Trash2, AlertCircle, Volume2, ArrowRight, Inbox } from 'lucide-react';
import { SettingsSelect } from './settings/SettingsSelect.jsx';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;
const MAX_TEXT_LENGTH = 1000;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const VOICE_OPTIONS = {
  ar: [{ value: 'fahad', label: 'فهد' }, { value: 'noura', label: 'نورة' }],
  en: [{ value: 'troy', label: 'Troy' }],
};

export function TextToSpeechPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [text, setText] = useState('');
  const [voiceLang, setVoiceLang] = useState('ar');
  const [voice, setVoice] = useState('fahad');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/tts/jobs`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.jobs || []))
      .catch((err) => { console.error('Load TTS history error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleVoiceLangChange = (val) => {
    setVoiceLang(val);
    setVoice(VOICE_OPTIONS[val][0].value);
  };

  const handleGenerate = () => {
    setError('');
    if (!text.trim()) { setError(t('الرجاء كتابة نص', 'Please enter some text')); return; }
    if (text.length > MAX_TEXT_LENGTH) {
      setError(t(`النص طويل جدًا (الحد الأقصى ${MAX_TEXT_LENGTH} حرف)`, `Text too long (max ${MAX_TEXT_LENGTH} chars)`));
      return;
    }

    setGenerating(true);
    fetch(`${BASE}/tts/jobs`, {
      method: 'POST', headers: authHeadersJson(),
      body: JSON.stringify({ text: text.trim(), language: voiceLang, voice }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentResult(data.generation);
        setHistory((prev) => [data.generation, ...prev]);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setGenerating(false));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/tts/jobs`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentResult(null); })
      .catch((err) => console.error('Delete all TTS error:', err));
  };

  const handleDelete = (id) => {
    if (!window.confirm(t('حذف هذا الصوت نهائيًا؟', 'Delete this audio permanently?'))) return;
    fetch(`${BASE}/tts/jobs/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (currentResult?.id === id) setCurrentResult(null);
      })
      .catch((err) => console.error('Delete TTS error:', err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Volume2 size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('تحويل النص إلى صوت', 'Text to Speech')}</h1>
          <p className="nexo-tool-page-desc">
            {t('اكتب نصًا واختر صوتًا، وسيقوم Nexo بتوليد ملف صوتي حقيقي بالعربية أو الإنجليزية.', 'Write text and pick a voice — Nexo will generate a real audio file in Arabic or English.')}
          </p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />

        <textarea
          className="nexo-textarea" dir="auto" rows={5} value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('اكتب النص هون...', 'Write your text here...')}
          maxLength={MAX_TEXT_LENGTH}
        />
        <div className="nexo-char-count">{text.length}/{MAX_TEXT_LENGTH}</div>

        <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          <div className="nexo-settings-row" style={{ flex: 1, minWidth: 200 }}>
            <span className="nexo-settings-row-label">{t('اللغة', 'Language')}</span>
            <SettingsSelect
              value={voiceLang} onChange={handleVoiceLangChange}
              options={[{ value: 'ar', label: t('عربي', 'Arabic') }, { value: 'en', label: t('إنجليزي', 'English') }]}
            />
          </div>
          <div className="nexo-settings-row" style={{ flex: 1, minWidth: 200 }}>
            <span className="nexo-settings-row-label">{t('الصوت', 'Voice')}</span>
            <SettingsSelect value={voice} onChange={setVoice} options={VOICE_OPTIONS[voiceLang]} />
          </div>
        </div>

        {error && (
          <div className="nexo-inline-error"><AlertCircle size={14} /> {error}</div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleGenerate} disabled={generating} style={{ marginTop: 18, minWidth: 200 }}>
          {generating && <Loader2 size={14} className="nexo-spin" />}
          {generating ? t('جارِ التوليد...', 'Generating...') : t('توليد الصوت', 'Generate Audio')}
        </button>
      </div>

      {currentResult && currentResult.audio_url && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <h4 className="nexo-card-row-title" style={{ marginBottom: 12 }}>{t('النتيجة', 'Result')}</h4>
          <audio src={currentResult.audio_url} controls className="nexo-audio-player" />
          <a href={currentResult.audio_url} download className="nexo-btn nexo-btn-secondary" style={{ marginTop: 14, textDecoration: 'none' }}>
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
            <div className="nexo-state-title">{t('لا يوجد تسجيلات بعد', 'No generations yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item nexo-list-item-stacked">
              <p className="nexo-list-item-title" dir="auto" style={{ marginBottom: 8 }}>{item.input_text}</p>
              {item.status === 'completed' && item.audio_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <audio src={item.audio_url} controls className="nexo-audio-player" style={{ flex: 1, height: 34 }} />
                  <a href={item.audio_url} download className="nexo-btn nexo-btn-ghost nexo-btn-icon" title={t('تنزيل', 'Download')}><Download size={14} /></a>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}><Trash2 size={14} /></button>
                </div>
              ) : item.status === 'failed' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span className="nexo-badge nexo-badge-danger">{t('فشل', 'Failed')}: {item.error_message}</span>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                </div>
              ) : (
                <span className="nexo-list-item-sub">
                  <Loader2 size={12} className="nexo-spin" style={{ display: 'inline', marginInlineEnd: 4 }} />
                  {t('جارِ المعالجة...', 'Processing...')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
     </div>
    </div>
  );
}