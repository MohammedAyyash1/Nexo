import { useState, useRef } from 'react';
import { LogOut, Camera, Check, X as XIcon } from 'lucide-react';
import { SettingsSelect } from '../SettingsSelect.jsx';
import { applyAccent, loadSavedAccent, applyThemeMode, loadSavedThemeMode } from '../../../utils/theme.js';
import { API_BASE } from '../../../../config/api.js';

const USER_KEY = 'nexo_user';
const TOKEN_KEY = 'nexo_token';

export function GeneralSection({ user, lang, toggleLang, onLogout }) {
  const [appearance, setAppearance] = useState(() => loadSavedThemeMode());
  const [accent, setAccent] = useState(() => loadSavedAccent());
  const savedAvatarUrl = user?.avatar_url || user?.avatar || user?.avatarUrl || user?.photoUrl || user?.picture || null;
  const [avatar, setAvatar] = useState(savedAvatarUrl); // ما يظهر فعليًا بالدائرة (معاينة محلية أو المحفوظة)
  const [pendingBlob, setPendingBlob] = useState(null); // الصورة الجديدة يلي لسا ما انحفظت بالسيرفر
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  const hasUnsavedAvatar = !!pendingBlob;

  const appearanceOptions = [
    { value: 'dark', labelAr: 'داكن', labelEn: 'Dark' },
    { value: 'light', labelAr: 'فاتح', labelEn: 'Light' },
    { value: 'system', labelAr: 'حسب النظام', labelEn: 'System' },
  ];

  const accentOptions = [
    { value: 'purple', labelAr: 'بنفسجي (افتراضي)', labelEn: 'Purple (Default)' },
    { value: 'blue', labelAr: 'أزرق', labelEn: 'Blue' },
    { value: 'green', labelAr: 'أخضر', labelEn: 'Green' },
    { value: 'pink', labelAr: 'وردي', labelEn: 'Pink' },
    { value: 'orange', labelAr: 'برتقالي', labelEn: 'Orange' },
  ];

  const handleAvatarClick = () => {
    if (avatarUploading) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError('');

    if (!file.type.startsWith('image/')) {
      setAvatarError(lang === 'en' ? 'Please choose an image file.' : 'الرجاء اختيار ملف صورة.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setAvatarError(lang === 'en' ? 'Image must be under 12MB.' : 'يجب أن تكون الصورة أقل من 12 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // نصغّر الصورة لمربع 256×256 (Cover crop) ونضغطها JPEG
        const SIZE = 256;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        ctx.drawImage(img, (SIZE - drawW) / 2, (SIZE - drawH) / 2, drawW, drawH);

        // معاينة فورية بدون انتظار أي رفع — نظهرها فورًا بالدائرة
        const previewDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatar(previewDataUrl);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              setAvatarError(lang === 'en' ? 'Could not process this image.' : 'تعذّر معالجة هذه الصورة.');
              return;
            }
            setPendingBlob(blob); // نخزّنها بانتظار ضغطة "حفظ"
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => setAvatarError(lang === 'en' ? 'Could not read this image.' : 'تعذّر قراءة هذه الصورة.');
      img.src = reader.result;
    };
    reader.onerror = () => setAvatarError(lang === 'en' ? 'Could not read this image.' : 'تعذّر قراءة هذه الصورة.');
    reader.readAsDataURL(file);
  };

  const handleCancelAvatar = () => {
    setPendingBlob(null);
    setAvatar(savedAvatarUrl); // نرجّع الصورة المحفوظة أصلًا، نلغي المعاينة المحلية
    setAvatarError('');
  };

  const handleSaveAvatar = () => {
    if (!pendingBlob) return;
    setAvatarUploading(true);
    setAvatarError('');
    const formData = new FormData();
    formData.append('avatar', pendingBlob, 'avatar.jpg');
    const token = localStorage.getItem(TOKEN_KEY);

    fetch(`${API_BASE}/api/account/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || (lang === 'en' ? 'Upload failed' : 'فشل الرفع'));
        setAvatar(data.avatarUrl);
        setPendingBlob(null); // تم الحفظ فعليًا، ما عاد فيه تغيير معلّق
        try {
          const saved = localStorage.getItem(USER_KEY);
          const parsed = saved ? JSON.parse(saved) : (user || {});
          localStorage.setItem(USER_KEY, JSON.stringify({ ...parsed, avatar_url: data.avatarUrl }));
        } catch (err) {
          console.error('Sync avatar to localStorage error:', err);
        }
      })
      .catch((err) => {
        console.error('Avatar upload error:', err);
        setAvatarError(err.message || (lang === 'en' ? 'Upload failed, try again.' : 'فشل الرفع، حاول مرة أخرى.'));
      })
      .finally(() => setAvatarUploading(false));
  };

  return (
    <>
      <div className="settings-row" style={{ alignItems: 'center' }}>
        <span className="settings-label">{lang === 'en' ? 'Profile picture' : 'الصورة الشخصية'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            onClick={handleAvatarClick}
            title={lang === 'en' ? 'Change picture' : 'تغيير الصورة'}
            style={{
              position: 'relative', width: 52, height: 52, borderRadius: '50%', cursor: avatarUploading ? 'wait' : 'pointer',
              background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
              border: hasUnsavedAvatar ? '2px solid var(--accent-2)' : '1px solid var(--border-subtle)',
              opacity: avatarUploading ? 0.6 : 1,
            }}
          >
            {avatar ? (
              <img src={avatar} alt={user?.name || 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{(user?.name || 'N')[0].toUpperCase()}</span>
            )}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s ease',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
            >
              <Camera size={16} color="#fff" />
            </div>
          </div>

          {!hasUnsavedAvatar && (
            <button className="settings-inline-btn" onClick={handleAvatarClick}>
              {lang === 'en' ? 'Change picture' : 'تغيير الصورة'}
            </button>
          )}

          {hasUnsavedAvatar && (
            <>
              <button
                className="settings-inline-btn"
                onClick={handleSaveAvatar}
                disabled={avatarUploading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-1)', color: '#fff' }}
              >
                <Check size={14} />
                {avatarUploading
                  ? (lang === 'en' ? 'Saving...' : 'جارِ الحفظ...')
                  : (lang === 'en' ? 'Save' : 'حفظ')}
              </button>
              <button
                className="settings-inline-btn"
                onClick={handleCancelAvatar}
                disabled={avatarUploading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <XIcon size={14} />
                {lang === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
            </>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>
      </div>
      {avatarError && <p className="settings-hint" style={{ color: '#f87171', marginTop: -8, marginBottom: 12 }}>{avatarError}</p>}
      <p className="settings-hint" style={{ marginTop: 4, marginBottom: 20 }}>
        {hasUnsavedAvatar
          ? (lang === 'en' ? 'Preview only — press Save to apply.' : 'معاينة فقط — اضغط "حفظ" لتثبيتها.')
          : (lang === 'en' ? 'Synced to your account and visible on any device.' : 'متزامنة مع حسابك ومرئية من أي جهاز.')}
      </p>

      <div className="settings-row">
        <span className="settings-label">{lang === 'en' ? 'Language' : 'اللغة'}</span>
        <button className="settings-inline-btn" onClick={toggleLang}>
          {lang === 'en' ? 'Arabic' : 'English'}
        </button>
      </div>

      <div className="settings-row">
        <span className="settings-label">{lang === 'en' ? 'Appearance' : 'المظهر'}</span>
        <SettingsSelect
          value={appearance}
          onChange={(val) => { setAppearance(val); applyThemeMode(val); }}
          options={appearanceOptions.map((o) => ({ value: o.value, label: lang === 'en' ? o.labelEn : o.labelAr }))}
        />
      </div>

      <div className="settings-row">
        <span className="settings-label">{lang === 'en' ? 'Accent color' : 'لون التمييز'}</span>
        <SettingsSelect
          value={accent}
          onChange={(val) => { setAccent(val); applyAccent(val); }}
          options={accentOptions.map((o) => ({ value: o.value, label: lang === 'en' ? o.labelEn : o.labelAr }))}
        />
      </div>

      <p className="settings-hint" style={{ marginTop: 4, marginBottom: 20 }}>
        {lang === 'en' ? 'Theme & color activation coming soon.' : 'تفعيل المظهر واللون فعليًا قريبًا.'}
      </p>

      <div className="settings-row">
        <span className="settings-label">{lang === 'en' ? 'Name' : 'الاسم'}</span>
        <span className="settings-value">{user?.name || '—'}</span>
      </div>
      <div className="settings-row">
        <span className="settings-label">{lang === 'en' ? 'Email' : 'البريد الإلكتروني'}</span>
        <span className="settings-value">{user?.email || '—'}</span>
      </div>

      <button className="settings-btn danger" onClick={onLogout} style={{ marginTop: 16 }}>
        <LogOut size={14} /> {lang === 'en' ? 'Log out' : 'تسجيل الخروج'}
      </button>
    </>
  );
}