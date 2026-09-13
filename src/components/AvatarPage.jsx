import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Download, Trash2, X, AlertCircle } from 'lucide-react';
import { ComingSoonOverlay } from './ComingSoonOverlay.jsx';
import { API_BASE } from '../../config/api.js';
const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;
const MAX_SCRIPT_LENGTH = 1500;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const STATUS_LABELS = {
  queued: { ar: 'بالانتظار', en: 'Queued' },
  processing: { ar: 'جارِ التوليد...', en: 'Processing...' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  failed: { ar: 'فشل', en: 'Failed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

export function AvatarPage({ user }) {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const pollTimers = useRef({});

  const loadJobs = () => {
    fetch(`${BASE}/avatar/jobs`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        setJobs(data.jobs || []);
        (data.jobs || []).forEach((j) => {
          if (j.status === 'queued' || j.status === 'processing') startPolling(j.id);
        });
      })
      .catch((err) => console.error('Load avatar jobs error:', err))
      .finally(() => setLoadingJobs(false));
  };

  useEffect(() => {
    loadJobs();
    return () => { Object.values(pollTimers.current).forEach(clearTimeout); };
  }, []);

  const startPolling = (jobId) => {
    if (pollTimers.current[jobId]) return;
    const poll = () => {
      fetch(`${BASE}/avatar/jobs/${jobId}`, { headers: authHeaders() })
        .then((res) => res.json())
        .then((data) => {
          if (!data.job) return;
          setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job : j)));
          if (data.job.status === 'queued' || data.job.status === 'processing') {
            pollTimers.current[jobId] = setTimeout(poll, 4000);
          } else {
            delete pollTimers.current[jobId];
          }
        })
        .catch((err) => {
          console.error('Poll avatar job error:', err);
          pollTimers.current[jobId] = setTimeout(poll, 6000);
        });
    };
    pollTimers.current[jobId] = setTimeout(poll, 4000);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('صيغة الصورة غير مدعومة. استخدم JPG, PNG أو WEBP', 'Unsupported image format. Use JPG, PNG or WEBP'));
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleGenerate = () => {
    setError('');
    if (!imageFile) { setError(t('الرجاء رفع صورة', 'Please upload an image')); return; }
    if (!script.trim()) { setError(t('الرجاء كتابة النص', 'Please enter the script')); return; }
    if (script.length > MAX_SCRIPT_LENGTH) {
      setError(t(`النص طويل جدًا (الحد الأقصى ${MAX_SCRIPT_LENGTH} حرف)`, `Script too long (max ${MAX_SCRIPT_LENGTH} chars)`));
      return;
    }

    setGenerating(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('script', script.trim());

    fetch(`${BASE}/avatar/jobs`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setJobs((prev) => [data.job, ...prev]);
        startPolling(data.job.id);
        setImageFile(null);
        setImagePreview(null);
        setScript('');
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setGenerating(false));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل الفيديوهات نهائيًا؟', 'Delete all videos permanently?'))) return;
    fetch(`${BASE}/avatar/jobs`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setJobs([]); Object.values(pollTimers.current).forEach(clearTimeout); pollTimers.current = {}; })
      .catch((err) => console.error('Delete all avatar jobs error:', err));
  };

  const handleDelete = (jobId) => {
    if (!window.confirm(t('حذف هذا الفيديو نهائيًا؟', 'Delete this video permanently?'))) return;
    fetch(`${BASE}/avatar/jobs/${jobId}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        if (pollTimers.current[jobId]) { clearTimeout(pollTimers.current[jobId]); delete pollTimers.current[jobId]; }
      })
      .catch((err) => console.error('Delete avatar job error:', err));
  };

  const handleCancel = (jobId) => {
    fetch(`${BASE}/avatar/jobs/${jobId}/cancel`, { method: 'POST', headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => { if (data.job) setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job : j))); })
      .catch((err) => console.error('Cancel avatar job error:', err));
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoAvatarSpin { to { transform: rotate(360deg); } } .nexo-avatar-spin { animation: nexoAvatarSpin 1s linear infinite; }`}</style>

      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Avatar AI</h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>
        {t('ارفع صورة شخص واكتب نصًا، وسيقوم Nexo بإنشاء فيديو له وهو يتحدث بهذا النص.', 'Upload a portrait and a script — Nexo will generate a video of that person speaking it.')}
      </p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32, position: 'relative' }}>
        <ComingSoonOverlay
          lang={lang}
          titleAr="أفاتار الذكاء الاصطناعي — قريبًا"
          titleEn="Avatar AI — Coming Soon"
          reasonAr="هذه الميزة جاهزة تقنيًا بالكامل، بانتظار تفعيل ربط مزوّد الفيديو. ستعمل تلقائيًا فور توفره."
          reasonEn="This feature is fully built technically, pending activation of the video provider connection. It will work automatically once available."
        />
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 200px' }}>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: 200, height: 200, borderRadius: 12, border: '1px dashed var(--border-input)',
              cursor: 'pointer', overflow: 'hidden', background: 'var(--bg-input-2)',
            }}>
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <Upload size={22} color="var(--text-secondary)" />
                  <span className="settings-hint" style={{ marginTop: 8 }}>{t('رفع صورة', 'Upload image')}</span>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <textarea
              className="settings-textarea" rows={6} value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder={t('اكتب النص اللي بدك الشخص يقوله...', 'Write the script the person should say...')}
              maxLength={MAX_SCRIPT_LENGTH}
            />
            <div className="settings-char-count">{script.length}/{MAX_SCRIPT_LENGTH}</div>
          </div>
        </div>

        {error && (
          <p className="settings-hint" style={{ color: '#f87171', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <button className="settings-btn" onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, maxWidth: 220 }}>
          {generating && <Loader2 size={14} className="nexo-avatar-spin" />}
          {generating ? t('جارِ الإرسال...', 'Sending...') : 'Generate Video'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('فيديوهاتك', 'Your videos')}</h3>
        {jobs.length > 0 && (
          <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>
            {t('مسح الكل', 'Clear all')}
          </button>
        )}
      </div>

      {loadingJobs ? (
        <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p>
      ) : jobs.length === 0 ? (
        <p className="settings-hint">{t('لسا ما سويت أي فيديو.', "You haven't generated any videos yet.")}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {jobs.map((job) => (
            <div key={job.id} style={{ background: 'var(--bg-input-3)', borderRadius: 12, padding: 14 }}>
              {job.status === 'completed' && job.result_video_url ? (
                <video src={job.result_video_url} controls style={{ width: '100%', borderRadius: 8, marginBottom: 10 }} />
              ) : job.status === 'failed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 8 }}>
                  <AlertCircle size={22} color="#f87171" />
                  <span style={{ fontSize: 12.5, color: '#f87171', textAlign: 'center' }}>{job.error_message || t('فشل التوليد', 'Generation failed')}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 8 }}>
                  <Loader2 size={22} className="nexo-avatar-spin" color="var(--accent-2)" />
                  <span className="settings-hint">{STATUS_LABELS[job.status]?.[lang] || job.status}</span>
                </div>
              )}

              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {job.script_text}
              </p>

              <div style={{ display: 'flex', gap: 6 }}>
                {job.status === 'completed' && job.result_video_url && (
                  <a href={job.result_video_url} download className="icon-btn" title={t('تنزيل', 'Download')}>
                    <Download size={15} />
                  </a>
                )}
                {(job.status === 'queued' || job.status === 'processing') && (
                  <button className="icon-btn" onClick={() => handleCancel(job.id)} title={t('إلغاء', 'Cancel')}>
                    <X size={15} />
                  </button>
                )}
                <button className="icon-btn" onClick={() => handleDelete(job.id)} title={t('حذف', 'Delete')}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}