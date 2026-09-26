import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, Trash2, AlertCircle, Volume2, ArrowRight, Inbox, Play, Pause, Share2, Sparkles } from 'lucide-react';
import { SettingsSelect } from './settings/SettingsSelect.jsx';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;
const MAX_TEXT_LENGTH = 200; // حد Groq/Orpheus الفعلي

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}
function detectTextScript(str) {
  const arabicChars = (str.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (str.match(/[A-Za-z]/g) || []).length;
  if (arabicChars === 0 && latinChars === 0) return null;
  return arabicChars > latinChars ? 'ar' : 'en';
}
const VOICE_OPTIONS = {
  ar: [{ value: 'fahad', label: 'فهد' }, { value: 'noura', label: 'نورة' }],
  en: [{ value: 'troy', label: 'Troy' }],
};

// ===== شريط موجات زخرفي (CSS بحت، بدون تحليل صوت فعلي) — يتحرك أثناء التشغيل فقط =====
function TTSWaveform({ playing, size = 'lg', barCount = 40 }) {
  const bars = Array.from({ length: barCount }, (_, i) => {
    const h = 30 + Math.abs(Math.sin(i * 0.7)) * 70;
    return h;
  });
  return (
    <div className={`tts-waveform ${size === 'sm' ? 'tts-waveform-sm' : ''} ${playing ? 'is-playing' : ''}`}>
      {bars.map((h, i) => (
        <span key={i} style={{ height: `${h}%`, animationDelay: `${(i % 8) * 0.06}s` }} />
      ))}
    </div>
  );
}

function formatTime(sec) {
  if (!sec || Number.isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ===== مشغل صوت مخصص (زر تشغيل + موجات + مدة) بدل عنصر audio الافتراضي =====
function TTSPlayer({ src, size = 'lg' }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); } else { el.play().catch(() => {}); }
  };

  return (
    <div className={`tts-player ${size === 'sm' ? 'tts-player-sm' : ''}`}>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        style={{ display: 'none' }}
      />
      <button type="button" className="tts-player-btn" onClick={toggle} aria-label={playing ? 'pause' : 'play'}>
        {playing ? <Pause size={size === 'sm' ? 13 : 16} fill="currentColor" /> : <Play size={size === 'sm' ? 13 : 16} fill="currentColor" />}
      </button>
      <TTSWaveform playing={playing} size={size} />
      <span className="tts-player-time">{formatTime(current)} / {formatTime(duration)}</span>
    </div>
  );
}

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

    const detected = detectTextScript(text.trim());
    if (detected && detected !== voiceLang) {
      const chosenLabel = voiceLang === 'en' ? t('الإنجليزية', 'English') : t('العربية', 'Arabic');
      const detectedLabel = detected === 'en' ? t('الإنجليزية', 'English') : t('العربية', 'Arabic');
      setError(t(`النص المكتوب يبدو بـ${detectedLabel}، لكن اللغة المختارة ${chosenLabel}.`, `Your text looks like ${detectedLabel}, but the selected language is ${chosenLabel}.`));
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

  const handleShare = (item) => {
    if (navigator.share && item?.audio_url) {
      navigator.share({ title: 'Nexo — TTS', url: item.audio_url }).catch(() => {});
    } else if (item?.audio_url) {
      navigator.clipboard.writeText(item.audio_url);
    }
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

  const voiceLabel = (item) => {
    const opts = VOICE_OPTIONS[item.language] || [];
    return opts.find((v) => v.value === item.voice)?.label || item.voice;
  };

  return (
    <div className="nexo-tool-page tts-page">
     <div className="tts-hero-art" aria-hidden="true">
       <span className="tts-hero-orb tts-hero-orb-1" />
       <span className="tts-hero-orb tts-hero-orb-2" />
       <span className="tts-hero-orb tts-hero-orb-3" />
       <div className="tts-hero-grid" />
       <div className="tts-hero-rings"><span /><span /><span /></div>
       <div className="tts-hero-particles">
         {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} />)}
       </div>
       <div className="tts-hero-speaker"><Volume2 size={38} /></div>
     </div>
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="tts-hero-header">
        <div className="tts-hero-text">
          <span className="tts-hero-badge"><Sparkles size={12} /> {t('صوت الذكاء الاصطناعي', 'AI Voice')}</span>
          <h1 className="nexo-tool-page-title">{t('تحويل النص إلى صوت', 'Text to Speech')}</h1>
          <p className="nexo-tool-page-desc">
            {t('اكتب نصًا واختر اللغة وصوتًا طبيعيًا، ودع Nexo يحوّله إلى صوت واقعي فورًا.', 'Write text, pick a language and a natural voice, and let Nexo turn it into real speech instantly.')}
          </p>
        </div>
        <div className="tts-hero-icon"><Volume2 size={22} /></div>
      </div>

      <div className="nexo-card-luxe tts-composer-card">
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 220, height: 220, top: -70, insetInlineEnd: -40 }} />

        <div className="tts-textarea-wrap">
          <textarea
            className="nexo-textarea tts-textarea" dir="auto" rows={5} value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('اكتب النص هون...', 'Write your text here...')}
            maxLength={MAX_TEXT_LENGTH}
          />
          <div className="nexo-char-count">{text.length}/{MAX_TEXT_LENGTH}</div>
        </div>

        <div className="tts-controls-row">
          <div className="tts-select-group">
            <span className="tts-select-label">{t('اللغة', 'Language')}</span>
            <SettingsSelect
              value={voiceLang} onChange={handleVoiceLangChange}
              options={[{ value: 'ar', label: t('عربي', 'Arabic') }, { value: 'en', label: t('إنجليزي', 'English') }]}
            />
          </div>
          <div className="tts-select-group">
            <span className="tts-select-label">{t('الصوت', 'Voice')}</span>
            <SettingsSelect value={voice} onChange={setVoice} options={VOICE_OPTIONS[voiceLang]} />
          </div>
          <button className="nexo-btn nexo-btn-primary tts-generate-btn" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 size={14} className="nexo-spin" /> : <Sparkles size={14} />}
            {generating ? t('جارِ التوليد...', 'Generating...') : t('توليد الصوت الآن', 'Generate Audio')}
          </button>
        </div>

        {error && (
          <div className="nexo-inline-error"><AlertCircle size={14} /> {error}</div>
        )}
      </div>

      {currentResult && currentResult.audio_url && (
        <div className="nexo-card tts-result-card">
          <div className="tts-result-header">
            <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('النتيجة', 'Result')}</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleShare(currentResult)} title={t('مشاركة', 'Share')}>
                <Share2 size={15} />
              </button>
              <a href={currentResult.audio_url} download className="nexo-btn nexo-btn-ghost nexo-btn-icon" title={t('تنزيل', 'Download')}>
                <Download size={15} />
              </a>
            </div>
          </div>
          <TTSPlayer src={currentResult.audio_url} size="lg" />
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
        <div className="tts-history-list">
          {history.map((item) => (
            <div key={item.id} className="tts-history-item">
              <p className="tts-history-title" dir="auto">{item.input_text}</p>

              {item.status === 'completed' && item.audio_url ? (
                <div className="tts-history-row">
                  <TTSPlayer src={item.audio_url} size="sm" />
                  <div className="tts-history-meta">
                    <span className="tts-lang-chip">{item.language === 'ar' ? t('عربي', 'Arabic') : t('إنجليزي', 'English')} · {voiceLabel(item)}</span>
                  </div>
                  <div className="tts-history-actions">
                    <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleShare(item)} title={t('مشاركة', 'Share')}><Share2 size={14} /></button>
                    <a href={item.audio_url} download className="nexo-btn nexo-btn-ghost nexo-btn-icon" title={t('تنزيل', 'Download')}><Download size={14} /></a>
                    <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}><Trash2 size={14} /></button>
                  </div>
                </div>
              ) : item.status === 'failed' ? (
                <div className="tts-history-row">
                  <span className="nexo-badge nexo-badge-danger">{t('فشل', 'Failed')}: {item.error_message}</span>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                </div>
              ) : (
                <span className="nexo-list-item-sub">
                  <Loader2 size={12} className="nexo-spin" style={{ display: 'inline', marginInlineEnd: 4 }} />
                  {t('جارِ المعالجة...', 'Processing...')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
     </div>
    </div>
  );
}