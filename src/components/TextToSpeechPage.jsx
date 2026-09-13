import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, Trash2, AlertCircle, Volume2, ArrowRight } from 'lucide-react';
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

  const loadHistory = () => {
    fetch(`${BASE}/tts/jobs`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.jobs || []))
      .catch((err) => console.error('Load TTS history error:', err))
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
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoTtsSpin { to { transform: rotate(360deg); } } .nexo-tts-spin { animation: nexoTtsSpin 1s linear infinite; }`}</style>

      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>
      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Volume2 size={20} /> {t('تحويل النص إلى صوت', 'Text to Speech')}
      </h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>
        {t('اكتب نصًا واختر صوتًا، وسيقوم Nexo بتوليد ملف صوتي حقيقي بالعربية أو الإنجليزية.', 'Write text and pick a voice — Nexo will generate a real audio file in Arabic or English.')}
      </p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32 }}>
        <textarea
          className="settings-textarea" rows={5} value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('اكتب النص هون...', 'Write your text here...')}
          maxLength={MAX_TEXT_LENGTH}
        />
        <div className="settings-char-count">{text.length}/{MAX_TEXT_LENGTH}</div>

        <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
          <div className="settings-row" style={{ flex: 1, minWidth: 200 }}>
            <span className="settings-label">{t('اللغة', 'Language')}</span>
            <SettingsSelect
              value={voiceLang} onChange={handleVoiceLangChange}
              options={[{ value: 'ar', label: t('عربي', 'Arabic') }, { value: 'en', label: t('إنجليزي', 'English') }]}
            />
          </div>
          <div className="settings-row" style={{ flex: 1, minWidth: 200 }}>
            <span className="settings-label">{t('الصوت', 'Voice')}</span>
            <SettingsSelect value={voice} onChange={setVoice} options={VOICE_OPTIONS[voiceLang]} />
          </div>
        </div>

        {error && (
          <p className="settings-hint" style={{ color: '#f87171', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <button className="settings-btn" onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, maxWidth: 220 }}>
          {generating && <Loader2 size={14} className="nexo-tts-spin" />}
          {generating ? t('جارِ التوليد...', 'Generating...') : t('توليد الصوت', 'Generate Audio')}
        </button>
      </div>

      {currentResult && currentResult.audio_url && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
          <h4 className="settings-group-title" style={{ marginBottom: 10 }}>{t('النتيجة', 'Result')}</h4>
          <audio src={currentResult.audio_url} controls style={{ width: '100%' }} />
          <a href={currentResult.audio_url} download className="settings-btn" style={{ marginTop: 12, maxWidth: 160, textDecoration: 'none' }}>
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
        <p className="settings-hint">{t('لا يوجد تسجيلات سابقة.', 'No generations yet.')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((item) => (
            <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              <p style={{ fontSize: 13, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.input_text}
              </p>
              {item.status === 'completed' && item.audio_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <audio src={item.audio_url} controls style={{ flex: 1, height: 32 }} />
                  <a href={item.audio_url} download className="icon-btn" title={t('تنزيل', 'Download')}><Download size={14} /></a>
                  <button className="icon-btn" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}><Trash2 size={14} /></button>
                </div>
              ) : item.status === 'failed' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#f87171' }}>{t('فشل', 'Failed')}: {item.error_message}</span>
                  <button className="icon-btn" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                </div>
              ) : (
                <span className="settings-hint">{t('جارِ المعالجة...', 'Processing...')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}