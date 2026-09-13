import { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { SettingsSelect } from '../SettingsSelect.jsx';
import { getAvailableVoices, speak, stopSpeaking } from '../../../utils/speech.js';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

export function VoiceSection({ lang, showToast }) {
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState('');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const loadVoices = () => setVoices(getAvailableVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    fetch(`${API_BASE}/api/settings/voice`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((res) => {
        setVoiceName(res.data?.voice_name || '');
        setRate(res.data?.rate || 1.0);
        setPitch(res.data?.pitch || 1.0);
      })
      .catch((err) => console.error('Load voice settings error:', err))
      .finally(() => setLoading(false));

    return () => stopSpeaking();
  }, []);

  const saveSettings = (updates) => {
    const payload = { voice_name: voiceName, rate, pitch, ...updates };
    fetch(`${API_BASE}/api/settings/voice`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
      body: JSON.stringify(payload),
    }).catch((err) => console.error('Save voice settings error:', err));
  };

  const handleVoiceChange = (val) => {
    setVoiceName(val);
    saveSettings({ voice_name: val });
  };

  const handleRateChange = (val) => {
    setRate(val);
    saveSettings({ rate: val });
  };

  const handleTest = () => {
    if (testing) {
      stopSpeaking();
      setTesting(false);
      return;
    }
    const sampleText = lang === 'en' ? 'This is how Nexo sounds.' : 'هكذا يبدو صوت Nexo.';
    speak(sampleText, { voiceName, rate, pitch, lang, onEnd: () => setTesting(false) });
    setTesting(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
        <div className="nexo-skeleton nexo-skeleton-line w-60" />
        <div className="nexo-skeleton nexo-skeleton-line w-40" />
      </div>
    );
  }

  // نفلتر الأصوات لتُظهر فقط الأصوات المطابقة للغة التطبيق الحالية
  // (عربي إذا lang === 'ar'، إنجليزي إذا lang === 'en') — يمنع اختيار صوت لا يدعم اللغة أصلًا
  const relevantVoices = voices.filter((v) =>
    lang === 'en' ? v.lang.startsWith('en') : v.lang.startsWith('ar')
  );
  // لو ما فيه أصوات مطابقة إطلاقًا بجهاز المستخدم (نادر)، نعرض كل الأصوات كبديل
  const displayVoices = relevantVoices.length > 0 ? relevantVoices : voices;

  const voiceOptions = [
    { value: '', label: lang === 'en' ? 'Browser default' : 'صوت المتصفح الافتراضي' },
    ...displayVoices.map((v) => ({ value: v.name, label: `${v.name} (${v.lang})` })),
  ];

  const rateOptions = [
    { value: '0.75', label: lang === 'en' ? 'Slow' : 'بطيء' },
    { value: '1', label: lang === 'en' ? 'Normal' : 'طبيعي' },
    { value: '1.25', label: lang === 'en' ? 'Fast' : 'سريع' },
    { value: '1.5', label: lang === 'en' ? 'Very fast' : 'سريع جدًا' },
  ];

  return (
    <div className="nexo-settings-block" style={{ borderBottom: 'none' }}>
      <div className="nexo-settings-row" style={{ marginBottom: 14 }}>
        <span className="nexo-settings-row-label">{lang === 'en' ? 'Voice' : 'الصوت'}</span>
        <SettingsSelect value={voiceName} onChange={handleVoiceChange} options={voiceOptions} />
      </div>

      <div className="nexo-settings-row" style={{ marginBottom: 16 }}>
        <span className="nexo-settings-row-label">{lang === 'en' ? 'Reading speed' : 'سرعة القراءة'}</span>
        <SettingsSelect
          value={String(rate)}
          onChange={(val) => handleRateChange(parseFloat(val))}
          options={rateOptions}
        />
      </div>

      <button className="nexo-btn nexo-btn-secondary" onClick={handleTest}>
        {testing ? <Square size={14} /> : <Play size={14} />}
        {testing ? (lang === 'en' ? 'Stop' : 'إيقاف') : (lang === 'en' ? 'Test voice' : 'تجربة الصوت')}
      </button>
    </div>
  );
}