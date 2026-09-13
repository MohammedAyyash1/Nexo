import { useState, useRef } from 'react';
import { LogOut, Camera } from 'lucide-react';
import { SettingsSelect } from '../SettingsSelect.jsx';
import { applyAccent, loadSavedAccent, applyThemeMode, loadSavedThemeMode } from '../../../utils/theme.js';

const USER_KEY = 'nexo_user';

export function GeneralSection({ user, lang, toggleLang, onLogout }) {
  const [appearance, setAppearance] = useState(() => loadSavedThemeMode());
  const [accent, setAccent] = useState(() => loadSavedAccent());
  const [avatar, setAvatar] = useState(() => user?.avatar || user?.avatarUrl || user?.photoUrl || user?.picture || null);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

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

  const handleAvatarClick = () => fileInputRef.current?.click();

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
        // نصغّر الصورة لمربع 256×256 (Cover crop) ونضغطها JPEG حتى تضل ضمن حد localStorage مهما كان حجم الصورة الأصلية
        const SIZE = 256;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        ctx.drawImage(img, (SIZE - drawW) / 2, (SIZE - drawH) / 2, drawW, drawH);

        let compressedDataUrl;
        try {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        } catch (err) {
          console.error('Compress avatar error:', err);
          setAvatarError(lang === 'en' ? 'Could not process this image.' : 'تعذّر معالجة هذه الصورة.');
          return;
        }

        setAvatar(compressedDataUrl);
        try {
          const saved = localStorage.getItem(USER_KEY);
          const parsed = saved ? JSON.parse(saved) : (user || {});
          localStorage.setItem(USER_KEY, JSON.stringify({ ...parsed, avatar: compressedDataUrl }));
        } catch (err) {
          console.error('Save avatar to localStorage error:', err);
          setAvatarError(lang === 'en' ? 'Could not save the picture on this device (storage full).' : 'تعذّر حفظ الصورة على هذا الجهاز (التخزين ممتلئ).');
        }
      };
      img.onerror = () => setAvatarError(lang === 'en' ? 'Could not read this image.' : 'تعذّر قراءة هذه الصورة.');
      img.src = reader.result;
    };
    reader.onerror = () => setAvatarError(lang === 'en' ? 'Could not read this image.' : 'تعذّر قراءة هذه الصورة.');
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="settings-row" style={{ alignItems: 'center' }}>
        <span className="settings-label">{lang === 'en' ? 'Profile picture' : 'الصورة الشخصية'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            onClick={handleAvatarClick}
            title={lang === 'en' ? 'Change picture' : 'تغيير الصورة'}
            style={{
              position: 'relative', width: 52, height: 52, borderRadius: '50%', cursor: 'pointer',
              background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
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
          <button className="settings-inline-btn" onClick={handleAvatarClick}>
            {lang === 'en' ? 'Change picture' : 'تغيير الصورة'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>
      </div>
      {avatarError && <p className="settings-hint" style={{ color: '#f87171', marginTop: -8, marginBottom: 12 }}>{avatarError}</p>}
      <p className="settings-hint" style={{ marginTop: 4, marginBottom: 20 }}>
        {lang === 'en' ? 'Saved on this device only for now — not yet synced to the server.' : 'محفوظة على هذا الجهاز فقط حاليًا — لسه مو متزامنة مع السيرفر.'}
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