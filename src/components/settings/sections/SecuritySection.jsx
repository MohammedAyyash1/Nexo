import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

export function SecuritySection({ lang, showToast }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = () => {
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(lang === 'en' ? 'Please fill in all fields.' : 'الرجاء تعبئة كل الحقول.');
      return;
    }
    if (newPassword.length < 6) {
      setError(lang === 'en' ? 'New password must be at least 6 characters.' : 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(lang === 'en' ? 'New passwords do not match.' : 'كلمتا المرور الجديدتان غير متطابقتين.');
      return;
    }

    setSaving(true);
    fetch(`${API_BASE}/api/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || (lang === 'en' ? 'Something went wrong.' : 'حدث خطأ ما.'));
          return;
        }
        showToast(lang === 'en' ? 'Password updated' : 'تم تحديث كلمة المرور');
        resetForm();
      })
      .catch(() => setError(lang === 'en' ? 'Connection error.' : 'خطأ بالاتصال.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="nexo-settings-block">
      <h4 className="nexo-settings-title">{lang === 'en' ? 'Change password' : 'تغيير كلمة المرور'}</h4>

      <div className="nexo-field">
        <input
          type={showPasswords ? 'text' : 'password'}
          className="nexo-input"
          placeholder={lang === 'en' ? 'Current password' : 'كلمة المرور الحالية'}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div className="nexo-field">
        <input
          type={showPasswords ? 'text' : 'password'}
          className="nexo-input"
          placeholder={lang === 'en' ? 'New password' : 'كلمة المرور الجديدة'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div className="nexo-field">
        <input
          type={showPasswords ? 'text' : 'password'}
          className="nexo-input"
          placeholder={lang === 'en' ? 'Confirm new password' : 'تأكيد كلمة المرور الجديدة'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => setShowPasswords((s) => !s)} style={{ marginBottom: 12, padding: 0 }}>
        {showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}{' '}
        {showPasswords ? (lang === 'en' ? 'Hide passwords' : 'إخفاء كلمات المرور') : (lang === 'en' ? 'Show passwords' : 'إظهار كلمات المرور')}
      </button>

      {error && <div className="nexo-inline-error" style={{ marginTop: 0, marginBottom: 10 }}>{error}</div>}

      <button className="nexo-btn nexo-btn-primary" onClick={handleSubmit} disabled={saving}>
        <ShieldCheck size={14} />
        {saving ? (lang === 'en' ? 'Updating...' : 'جارِ التحديث...') : (lang === 'en' ? 'Update password' : 'تحديث كلمة المرور')}
      </button>
    </div>
  );
}