import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, MessageSquare, Search, Image, Upload,
  FolderOpen, Brain, Sparkles, Cpu, Mic, Zap,
} from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const FEATURE_META = {
  chat: { icon: MessageSquare, ar: 'المحادثة', en: 'Chat' },
  web_search: { icon: Search, ar: 'البحث بالويب', en: 'Web search' },
  image_generation: { icon: Image, ar: 'توليد الصور', en: 'Image generation' },
  file_upload: { icon: Upload, ar: 'رفع الملفات', en: 'File upload' },
  memory: { icon: Brain, ar: 'الذاكرة', en: 'Memory' },
  custom_system_prompt: { icon: Sparkles, ar: 'شخصية مخصصة', en: 'Custom personality' },
  model_selection: { icon: Cpu, ar: 'اختيار النموذج', en: 'Model selection' },
  library_storage: { icon: FolderOpen, ar: 'مكتبة الملفات', en: 'File library' },
  voice_transcription: { icon: Mic, ar: 'تفريغ صوتي', en: 'Voice transcription' },
  priority_processing: { icon: Zap, ar: 'أولوية المعالجة', en: 'Priority processing' },
};

const PERIOD_LABEL = {
  ar: { daily: 'يوميًا', monthly: 'شهريًا', lifetime: 'إجمالي' },
  en: { daily: 'daily', monthly: 'monthly', lifetime: 'total' },
};

function formatPrice(amountMinor, currency) {
  return `${(amountMinor / 100).toFixed(0)} ${currency === 'ILS' ? '₪' : currency}`;
}

function featureLine(f, lang) {
  const meta = FEATURE_META[f.feature_key];
  if (!meta || !f.features?.is_active || !f.is_enabled) return null;
  const label = lang === 'en' ? meta.en : meta.ar;
  const isBoolean = f.features?.unit === 'boolean';
  const suffix = !isBoolean && f.limit_value !== null
    ? ` — ${f.limit_value} ${PERIOD_LABEL[lang][f.limit_period] || ''}`
    : '';
  return { key: f.feature_key, icon: meta.icon, text: label + suffix };
}

export function UpgradePage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const [freePlan, setFreePlan] = useState(null);
  const [proPlan, setProPlan] = useState(null);
  const [freeFeatures, setFreeFeatures] = useState([]);
  const [proFeatures, setProFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const t = (ar, en) => (lang === 'en' ? en : ar);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/v1/payments/plans/free`).then((r) => r.json()),
      fetch(`${API_BASE}/api/v1/payments/plans/pro_monthly`).then((r) => r.json()),
      fetch(`${API_BASE}/api/v1/entitlements/plans/free`).then((r) => r.json()),
      fetch(`${API_BASE}/api/v1/entitlements/plans/pro_monthly`).then((r) => r.json()),
    ])
      .then(([freeP, proP, freeF, proF]) => {
        if (freeP.success) setFreePlan(freeP.data);
        if (proP.success) setProPlan(proP.data);
        if (freeF.success) setFreeFeatures(freeF.data);
        if (proF.success) setProFeatures(proF.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGetPro = () => {
    navigate('/subscribe');
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>{t('جارِ التحميل...', 'Loading...')}</div>;
  }

  return (
    <div
      style={{
        minHeight: '100vh', padding: '60px 20px', color: 'var(--text-primary)',
        background: `
          radial-gradient(ellipse 900px 500px at 15% -5%, rgba(var(--accent-1-rgb), 0.16), transparent 60%),
          radial-gradient(ellipse 700px 500px at 90% 20%, rgba(var(--accent-rgb), 0.12), transparent 55%),
          radial-gradient(ellipse 800px 600px at 50% 110%, rgba(var(--accent-1-rgb), 0.09), transparent 60%),
          var(--bg-page)
        `,
        backgroundAttachment: 'fixed',
      }}
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <button onClick={() => navigate('/')} className="settings-inline-btn" style={{ padding: 0, marginBottom: 24 }}>
          <ArrowRight size={14} style={{ transform: lang === 'en' ? 'none' : 'rotate(180deg)' }} /> {t('رجوع', 'Back')}
        </button>

        <h1 style={{ fontSize: 34, fontWeight: 800, textAlign: 'center', marginBottom: 10, letterSpacing: -0.5, color: 'var(--text-primary)' }}>
          {t('خطط تنمو معك', 'Plans that grow with you')}
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 44, fontSize: 15 }}>
          {t('اختر الخطة التي تناسب استخدامك', 'Choose the plan that fits how you use Nexo')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* بطاقة Free */}
          <div style={{
            border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 30,
            background: 'var(--bg-panel)', backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{freePlan?.name || 'Free'}</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 20 }}>
              {freePlan ? formatPrice(freePlan.price_amount_minor, freePlan.currency) : '—'}
            </div>
            <button className="settings-btn" style={{ width: '100%', justifyContent: 'center', marginBottom: 22, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)' }} disabled>
              {t('خطتك الحالية أو ابدأ مجانًا', 'Your current plan / Start free')}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {freeFeatures.map((f) => featureLine(f, lang)).filter(Boolean).map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5 }}>
                    <Check size={15} color="#4ade80" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{f.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* بطاقة Pro */}
          <div style={{
            border: '1.5px solid rgba(var(--accent-1-rgb), 0.45)', borderRadius: 20, padding: 30,
            background: 'linear-gradient(160deg, rgba(var(--accent-1-rgb), 0.14), rgba(var(--accent-1-rgb), 0.02) 60%)',
            boxShadow: '0 0 40px rgba(var(--accent-1-rgb), 0.12)', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -11, insetInlineStart: 26, background: '#8b5cf6', color: '#fff',
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            }}>
              {t('الأكثر قيمة', 'Best value')}
            </div>
            <div style={{ fontSize: 13, color: '#a78bfa', marginBottom: 6 }}>{proPlan?.name || 'Pro'}</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 4 }}>
              {proPlan ? formatPrice(proPlan.price_amount_minor, proPlan.currency) : '—'}
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>
                {' / '}{proPlan?.billing_interval === 'monthly' ? t('شهريًا', 'month') : t('سنويًا', 'year')}
              </span>
            </div>
            <div style={{ height: 20 }} />
            <button className="settings-btn" style={{ width: '100%', justifyContent: 'center', marginBottom: 22 }} onClick={handleGetPro}>
              {t('احصل على Pro', 'Get Pro')}
            </button>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              {t('كل شيء في Free، بالإضافة إلى:', 'Everything in Free, plus:')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {proFeatures.map((f) => featureLine(f, lang)).filter(Boolean).map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5 }}>
                    <Icon size={15} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{f.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}