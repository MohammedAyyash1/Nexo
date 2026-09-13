import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Search, Image, Upload, FolderOpen, Brain,
  Sparkles, Cpu, Mic, Zap, Lock, Clock, Check, ArrowUpRight,
} from 'lucide-react';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

const FEATURE_META = {
  chat: { icon: MessageSquare, ar: 'المحادثة', en: 'Chat' },
  web_search: { icon: Search, ar: 'البحث بالويب', en: 'Web search' },
  image_generation: { icon: Image, ar: 'توليد الصور', en: 'Image generation' },
  file_upload: { icon: Upload, ar: 'رفع الملفات', en: 'File upload' },
  advanced_file_analysis: { icon: Upload, ar: 'تحليل ملفات متقدم', en: 'Advanced file analysis' },
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

function UsageRow({ f, lang }) {
  const meta = FEATURE_META[f.feature_key];
  if (!meta) return null;
  const Icon = meta.icon;
  const label = lang === 'en' ? meta.en : meta.ar;
  const isBoolean = f.features?.unit === 'boolean';
  const pct = f.limit_value ? Math.min(100, ((f.used || 0) / f.limit_value) * 100) : 0;
  const nearLimit = f.remaining === 0;

  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isBoolean ? 0 : 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={16} color="#a78bfa" />
          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>{label}</span>
        </div>
        {!isBoolean && f.limit_value !== null && (
          <span style={{ fontSize: 12.5, color: nearLimit ? '#f87171' : 'var(--text-secondary)', fontWeight: 500 }}>
            {f.used ?? 0} / {f.limit_value}
          </span>
        )}
        {isBoolean && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#4ade80' }}>
            <Check size={13} /> {lang === 'en' ? 'Included' : 'متاحة'}
          </span>
        )}
      </div>

      {!isBoolean && f.limit_value !== null && (
        <>
          <div style={{ height: 6, borderRadius: 6, background: 'var(--bg-input-2)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 6, transition: 'width 0.3s',
              background: nearLimit ? '#f87171' : 'linear-gradient(90deg, var(--accent-1), var(--accent-2))',
              width: `${pct}%`,
            }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>
            {PERIOD_LABEL[lang][f.limit_period] || ''}
          </div>
        </>
      )}
    </div>
  );
}

export function PlanOverview({ lang }) {
  const navigate = useNavigate();
  const [myEntitlements, setMyEntitlements] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);
  const [proPreview, setProPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    fetch(`${API_BASE}/api/v1/entitlements/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setMyEntitlements(body.data);
          return fetch(`${API_BASE}/api/v1/payments/plans/${body.data.planId}`).then((r) => r.json());
        }
      })
      .then((planBody) => { if (planBody?.success) setPlanInfo(planBody.data); })
      .finally(() => setLoading(false));

    fetch(`${API_BASE}/api/v1/entitlements/plans/pro_monthly`)
      .then((r) => r.json())
      .then((body) => { if (body.success) setProPreview(body.data); });
  }, []);

  if (loading || !myEntitlements) {
    return <p className="settings-hint">{lang === 'en' ? 'Loading...' : 'جارِ التحميل...'}</p>;
  }

  const isFree = myEntitlements.planId === 'free';
  const activeFeatures = myEntitlements.features.filter((f) => f.features?.is_active && f.is_enabled);
  const lockedFeatures = myEntitlements.features.filter((f) => f.features?.is_active && !f.is_enabled);
  const comingSoonFeatures = myEntitlements.features.filter((f) => f.features && !f.features.is_active);

  const upgradePerks = isFree && proPreview
    ? proPreview.filter((pf) => pf.is_enabled && pf.features?.is_active && lockedFeatures.find((lf) => lf.feature_key === pf.feature_key))
    : [];

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header: شارة + اسم الخطة معًا */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(var(--accent-1-rgb), 0.14), rgba(var(--accent-1-rgb), 0.03))',
        border: '1px solid rgba(var(--accent-1-rgb), 0.22)', borderRadius: 14, padding: '18px 20px', marginBottom: 22,
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {lang === 'en' ? 'Current plan' : 'خطتك الحالية'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)' }}>
            {planInfo?.name || myEntitlements.planId}
          </span>
          <span style={{
            background: isFree ? 'var(--bg-input-2)' : 'rgba(74,222,128,0.15)',
            color: isFree ? 'var(--text-secondary)' : '#4ade80',
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.3,
          }}>
            {isFree ? 'FREE' : 'PRO'}
          </span>
        </div>
      </div>

      {/* الاستخدام */}
      <h4 className="settings-group-title" style={{ marginBottom: 2 }}>
        {lang === 'en' ? 'Usage' : 'استخدامك'}
      </h4>
      <div>
        {activeFeatures.map((f) => <UsageRow key={f.feature_key} f={f} lang={lang} />)}
      </div>

      {/* ميزات مقفلة (Pro فقط) */}
      {lockedFeatures.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <h4 className="settings-group-title" style={{ marginBottom: 10 }}>
            {lang === 'en' ? 'Pro features' : 'ميزات Pro'}
          </h4>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--bg-input)',
            borderRadius: 10, padding: '4px 14px',
          }}>
            {lockedFeatures.map((f) => {
              const meta = FEATURE_META[f.feature_key];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <div key={f.feature_key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={15} color="var(--text-secondary)" />
                    <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                      {lang === 'en' ? meta.en : meta.ar}
                    </span>
                  </div>
                  <Lock size={13} color="var(--text-secondary)" />
                </div>
              );
            })}
          </div>

          {upgradePerks.length > 0 && (
            <button
              className="settings-btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
              onClick={() => navigate('/upgrade')}
            >
              <ArrowUpRight size={14} />
              {lang === 'en' ? 'Upgrade to Pro' : 'الترقية إلى Pro'}
            </button>
          )}
        </div>
      )}

      {/* قريبًا */}
      {comingSoonFeatures.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <h4 className="settings-group-title" style={{ marginBottom: 8 }}>
            {lang === 'en' ? 'Coming soon' : 'قريبًا'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {comingSoonFeatures.map((f) => {
              const meta = FEATURE_META[f.feature_key];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <div key={f.feature_key} style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
                  color: 'var(--text-secondary)', opacity: 0.6,
                }}>
                  <Clock size={13} /> {lang === 'en' ? meta.en : meta.ar}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '24px 0 4px' }} />
    </div>
  );
}