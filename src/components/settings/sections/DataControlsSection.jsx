import { useState } from 'react';
import { Download, Trash2, Loader2 } from 'lucide-react';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

export function DataControlsSection({ lang, showToast, onAccountDeleted }) {
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const confirmWord = lang === 'en' ? 'DELETE' : 'حذف';

  const handleDeleteAccount = () => {
    setDeleteError('');
    if (deleteConfirmText !== confirmWord) {
      setDeleteError(lang === 'en' ? `Please type "${confirmWord}" to confirm.` : `الرجاء كتابة "${confirmWord}" للتأكيد.`);
      return;
    }

    setDeleting(true);
    fetch(`${API_BASE}/api/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
      body: JSON.stringify({ password: deletePassword }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setDeleteError(data.error || (lang === 'en' ? 'Something went wrong.' : 'حدث خطأ ما.'));
          return;
        }
        if (onAccountDeleted) onAccountDeleted();
      })
      .catch(() => setDeleteError(lang === 'en' ? 'Connection error.' : 'خطأ بالاتصال.'))
      .finally(() => setDeleting(false));
  };

  const handleExportAll = () => {
    setExporting(true);
    fetch(`${API_BASE}/api/data/export`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexo-my-data-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(lang === 'en' ? 'Data downloaded' : 'تم تحميل بياناتك');
      })
      .catch((err) => console.error('Export all data error:', err))
      .finally(() => setExporting(false));
  };

  return (
    <div className="nexo-settings-block" style={{ borderBottom: 'none' }}>
      <h4 className="nexo-settings-title">{lang === 'en' ? 'Download your data' : 'تنزيل بياناتك'}</h4>
      <p className="nexo-settings-desc">
        {lang === 'en'
          ? 'Download a complete copy of your data: conversations, memory, personalization, and settings.'
          : 'حمّل نسخة كاملة من بياناتك: المحادثات، الذاكرة، التخصيص، والإعدادات.'}
      </p>
      <button className="nexo-btn nexo-btn-secondary" onClick={handleExportAll} disabled={exporting}>
        {exporting ? <Loader2 size={14} className="nexo-spin" /> : <Download size={14} />}
        {exporting ? (lang === 'en' ? 'Preparing...' : 'جارِ التجهيز...') : (lang === 'en' ? 'Download my data' : 'تنزيل بياناتي')}
      </button>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
        <h4 className="nexo-settings-title" style={{ color: 'var(--color-error)' }}>
          {lang === 'en' ? 'Delete account' : 'حذف الحساب'}
        </h4>
        <p className="nexo-settings-desc">
          {lang === 'en'
            ? 'This permanently deletes your account and all associated data. This cannot be undone.'
            : 'سيتم حذف حسابك وكل بياناتك المرتبطة نهائيًا. هذا الإجراء لا يمكن التراجع عنه.'}
        </p>

        {!showDeleteConfirm ? (
          <button className="nexo-btn nexo-btn-danger" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={14} /> {lang === 'en' ? 'Delete my account' : 'حذف حسابي'}
          </button>
        ) : (
          <div>
            <div className="nexo-field">
              <input
                type="password" className="nexo-input"
                placeholder={lang === 'en' ? 'Your password' : 'كلمة المرور'}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
            <div className="nexo-field">
              <input
                type="text" className="nexo-input"
                placeholder={lang === 'en' ? `Type "${confirmWord}" to confirm` : `اكتب "${confirmWord}" للتأكيد`}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>
            {deleteError && <div className="nexo-inline-error" style={{ marginTop: 0 }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="nexo-btn nexo-btn-danger" onClick={handleDeleteAccount} disabled={deleting} style={{ flex: 1 }}>
                {deleting ? (lang === 'en' ? 'Deleting...' : 'جارِ الحذف...') : (lang === 'en' ? 'Confirm delete' : 'تأكيد الحذف')}
              </button>
              <button className="nexo-btn nexo-btn-ghost" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>
                {lang === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}