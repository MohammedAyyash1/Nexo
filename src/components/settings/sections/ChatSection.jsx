import { useState, useEffect } from 'react';
import { Trash2, Download, Loader2 } from 'lucide-react';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

export function ChatSection({ lang, showToast, onChatsCleared, onAutoRenameChange }) {
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [autoRename, setAutoRename] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/chat`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((res) => setAutoRename(res.data?.auto_rename ?? true))
      .catch((err) => console.error('Load chat settings error:', err))
      .finally(() => setLoadingSettings(false));
  }, []);

  const handleToggleAutoRename = () => {
    const newValue = !autoRename;
    setAutoRename(newValue);
    if (onAutoRenameChange) onAutoRenameChange(newValue);
    fetch(`${API_BASE}/api/settings/chat`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
      body: JSON.stringify({ auto_rename: newValue }),
    }).catch((err) => console.error('Update chat settings error:', err));
  };

  const handleExport = () => {
    setExporting(true);
    fetch(`${API_BASE}/api/chats/export`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexo-chats-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(lang === 'en' ? 'Export downloaded' : 'تم تحميل التصدير');
      })
      .catch((err) => console.error('Export chats error:', err))
      .finally(() => setExporting(false));
  };

  const handleDeleteAll = () => {
    const confirmed = window.confirm(
      lang === 'en'
        ? 'Delete ALL your conversations permanently? This cannot be undone.'
        : 'حذف كل محادثاتك نهائيًا؟ هذا الإجراء لا يمكن التراجع عنه.'
    );
    if (!confirmed) return;

    setDeleting(true);
    fetch(`${API_BASE}/api/chats/all`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then(() => {
        showToast(lang === 'en' ? 'All conversations deleted' : 'تم حذف كل المحادثات');
        if (onChatsCleared) onChatsCleared();
      })
      .catch((err) => console.error('Delete all chats error:', err))
      .finally(() => setDeleting(false));
  };

  return (
    <>
      <div className="nexo-settings-block">
        <div className="nexo-settings-row">
          <div>
            <h4 className="nexo-settings-title">
              {lang === 'en' ? 'Auto-rename conversations' : 'التسمية التلقائية للمحادثات'}
            </h4>
            <p className="nexo-settings-desc" style={{ margin: 0 }}>
              {lang === 'en'
                ? 'Automatically name new chats based on the first message.'
                : 'تسمية المحادثات الجديدة تلقائيًا بناءً على أول رسالة.'}
            </p>
          </div>
          <button
            className={`nexo-switch ${autoRename ? 'on' : ''}`}
            onClick={handleToggleAutoRename}
            disabled={loadingSettings}
            aria-label="auto-rename"
          >
            <span className="nexo-switch-knob" />
          </button>
        </div>
      </div>

      <div className="nexo-settings-block">
        <h4 className="nexo-settings-title">{lang === 'en' ? 'Export conversations' : 'تصدير المحادثات'}</h4>
        <p className="nexo-settings-desc">
          {lang === 'en'
            ? 'Download all your conversations as a JSON file.'
            : 'حمّل كل محادثاتك كملف JSON.'}
        </p>
        <button className="nexo-btn nexo-btn-secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 size={14} className="nexo-spin" /> : <Download size={14} />}
          {exporting ? (lang === 'en' ? 'Exporting...' : 'جارِ التصدير...') : (lang === 'en' ? 'Export all conversations' : 'تصدير كل المحادثات')}
        </button>
      </div>

      <div className="nexo-settings-block" style={{ borderBottom: 'none' }}>
        <h4 className="nexo-settings-title">{lang === 'en' ? 'Delete all conversations' : 'حذف كل المحادثات'}</h4>
        <p className="nexo-settings-desc">
          {lang === 'en'
            ? 'Permanently delete all your conversation history. This cannot be undone.'
            : 'حذف كل سجل محادثاتك نهائيًا. هذا الإجراء لا يمكن التراجع عنه.'}
        </p>
        <button className="nexo-btn nexo-btn-danger" onClick={handleDeleteAll} disabled={deleting}>
          {deleting ? <Loader2 size={14} className="nexo-spin" /> : <Trash2 size={14} />}
          {deleting ? (lang === 'en' ? 'Deleting...' : 'جارِ الحذف...') : (lang === 'en' ? 'Delete all conversations' : 'حذف كل المحادثات')}
        </button>
      </div>
    </>
  );
}