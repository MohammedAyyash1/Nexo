import { useState, useEffect } from 'react';
import { X, Trash2, LogOut } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';

export function Settings({ user, lang, toggleLang, onLogout, onClose, showToast }) {
  const [facts, setFacts] = useState([]);
  const [loadingFacts, setLoadingFacts] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/memory`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((data) => setFacts(data.facts || []))
      .catch((err) => console.error('Load memory error:', err))
      .finally(() => setLoadingFacts(false));
  }, []);

  const handleDeleteMemory = () => {
    const confirmed = window.confirm(
      lang === 'en' ? 'Delete all remembered facts about you?' : 'حذف كل الحقائق المحفوظة عنك؟'
    );
    if (!confirmed) return;

    fetch(`${API_BASE}/api/memory`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then(() => {
        setFacts([]);
        showToast(lang === 'en' ? 'Memory cleared' : 'تم مسح الذاكرة');
      })
      .catch((err) => console.error('Delete memory error:', err));
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>{lang === 'en' ? 'Settings' : 'الإعدادات'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="settings-section">
          <h3>{lang === 'en' ? 'Profile' : 'الملف الشخصي'}</h3>
          <div className="settings-row">
            <span className="settings-label">{lang === 'en' ? 'Name' : 'الاسم'}</span>
            <span className="settings-value">{user?.name || '—'}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">{lang === 'en' ? 'Email' : 'البريد الإلكتروني'}</span>
            <span className="settings-value">{user?.email || '—'}</span>
          </div>
        </div>

        <div className="settings-section">
          <h3>{lang === 'en' ? 'Language' : 'اللغة'}</h3>
          <button className="settings-btn" onClick={toggleLang}>
            {lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
          </button>
        </div>

        <div className="settings-section">
          <h3>{lang === 'en' ? 'Memory' : 'الذاكرة'}</h3>
          {loadingFacts ? (
            <p className="settings-hint">{lang === 'en' ? 'Loading...' : 'جارِ التحميل...'}</p>
          ) : facts.length === 0 ? (
            <p className="settings-hint">
              {lang === 'en' ? 'Nexo doesn\'t remember anything about you yet.' : 'لا يوجد لدى Nexo أي معلومات محفوظة عنك بعد.'}
            </p>
          ) : (
            <ul className="settings-facts-list">
              {facts.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}
          {facts.length > 0 && (
            <button className="settings-btn danger" onClick={handleDeleteMemory}>
              <Trash2 size={14} /> {lang === 'en' ? 'Clear memory' : 'مسح الذاكرة'}
            </button>
          )}
        </div>

        <div className="settings-section">
          <button className="settings-btn danger" onClick={onLogout}>
            <LogOut size={14} /> {lang === 'en' ? 'Log out' : 'تسجيل الخروج'}
          </button>
        </div>
      </div>
    </div>
  );
}