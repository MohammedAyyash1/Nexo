import { useState, useEffect } from 'react';
import { FileText, Image, FileSpreadsheet, File, Trash2, Inbox, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

function getFileIcon(type) {
  if (type?.startsWith('image/')) return Image;
  if (type?.includes('spreadsheet') || type?.includes('excel')) return FileSpreadsheet;
  if (type?.includes('pdf') || type?.includes('word')) return FileText;
  return File;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesSection({ lang, showToast }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadFiles = () => {
    setLoading(true);
    setLoadError(false);
    fetch(`${API_BASE}/api/files`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((data) => setFiles(data.files || []))
      .catch((err) => { console.error('Load files error:', err); setLoadError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFiles(); }, []);

  const handleDelete = (fileId) => {
    const confirmed = window.confirm(
      lang === 'en' ? 'Delete this file permanently?' : 'حذف هذا الملف نهائيًا؟'
    );
    if (!confirmed) return;

    fetch(`${API_BASE}/api/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then(() => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        showToast(lang === 'en' ? 'File deleted' : 'تم حذف الملف');
      })
      .catch((err) => console.error('Delete file error:', err));
  };

  return (
    <div className="nexo-settings-block">
      <h4 className="nexo-settings-title">{lang === 'en' ? 'Your files' : 'ملفاتك'}</h4>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="nexo-skeleton" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="nexo-skeleton nexo-skeleton-line w-60" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="nexo-state nexo-state-error">
          <div className="nexo-state-icon"><AlertCircle size={18} /></div>
          <div className="nexo-state-title">{lang === 'en' ? 'Could not load files' : 'تعذّر تحميل الملفات'}</div>
          <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={loadFiles}>{lang === 'en' ? 'Retry' : 'إعادة المحاولة'}</button>
        </div>
      ) : files.length === 0 ? (
        <div className="nexo-state">
          <div className="nexo-state-icon"><Inbox size={18} /></div>
          <div className="nexo-state-title">{lang === 'en' ? "You haven't uploaded any files yet" : 'لم ترفع أي ملفات بعد'}</div>
        </div>
      ) : (
        <ul className="nexo-list" style={{ marginTop: 10 }}>
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <li key={file.id} className="nexo-list-item">
                <div className="nexo-file-row-icon"><Icon size={16} /></div>
                <div className="nexo-list-item-main">
                  <div className="nexo-list-item-title" dir="auto">{file.name}</div>
                  <span className="nexo-list-item-sub">{formatSize(file.size)}</span>
                </div>
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(file.id)} aria-label="delete">
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}