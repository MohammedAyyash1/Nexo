import { useState, useEffect } from 'react';
import { FileText, Image, FileSpreadsheet, File, X } from 'lucide-react';
import { translations } from '../translations.js';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

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

export function LibraryPage({ user }) {
  const t = translations[loadLang()];
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/files`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((data) => setFiles(data.files || []))
      .catch((err) => console.error('Load files error:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleFileClick = (file) => {
    if (file.type?.startsWith('image/')) {
      setPreviewFile(file);
    } else {
      // PDF وباقي الأنواع: نفتحها بتبويب جديد مباشرة (معاينة داخلية لها لاحقًا)
      window.open(file.url, '_blank');
    }
  };

  return (
    <div style={{ padding: 40, color: 'var(--text-primary)' }}>
      <h1>{t.library}</h1>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>جارِ التحميل...</p>
      ) : files.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>لم ترفع أي ملفات بعد.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 24 }}>
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <li
                key={file.id}
                onClick={() => handleFileClick(file)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color, #333)',
                  cursor: 'pointer',
                }}
              >
                <Icon size={18} />
                <div>
                  <div>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {formatSize(file.size)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <button
            onClick={() => setPreviewFile(null)}
            style={{
              position: 'absolute', top: 20, right: 20, background: 'transparent',
              border: 'none', color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={28} />
          </button>
          <img
            src={previewFile.url}
            alt={previewFile.name}
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}