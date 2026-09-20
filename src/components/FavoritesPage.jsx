import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star, Trash2 } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function FavoritesPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = () => {
    fetch(`${BASE}/favorites`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setFavorites(data.favorites || []))
      .catch((err) => console.error('Load favorites error:', err))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadFavorites(); }, []);

  const handleDelete = (messageId) => {
    fetch(`${BASE}/favorites/by-message/${messageId}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setFavorites((prev) => prev.filter((f) => f.message_id !== messageId)))
      .catch((err) => console.error('Delete favorite error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل المفضلة نهائيًا؟', 'Delete all favorites permanently?'))) return;
    fetch(`${BASE}/favorites`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setFavorites([]))
      .catch((err) => console.error('Delete all favorites error:', err));
  };

  const goToChat = (chatId) => navigate(`/?chat=${chatId}`);

  return (
    <div className="nexo-simple-page" style={{ maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Star size={20} /> {t('المفضلة', 'Favorites')}
        </h1>
        {favorites.length > 0 && (
          <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>{t('مسح الكل', 'Clear all')}</button>
        )}
      </div>
      <p className="settings-hint" style={{ marginBottom: 24 }}>{t('كل الردود يلي ثبّتها كمفضلة، بمكان واحد.', 'All the responses you starred, in one place.')}</p>

      {loading ? (
        <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p>
      ) : favorites.length === 0 ? (
        <p className="settings-hint">{t('ما ثبّتّ أي رد كمفضلة لسا. اضغط أيقونة النجمة تحت أي رد بالشات.', "You haven't starred any response yet. Tap the star icon under any chat reply.")}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {favorites.map((item) => (
            <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '14px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => goToChat(item.chat_id)}>
                  <div className="settings-hint" style={{ fontSize: 11.5, marginBottom: 4 }}>{item.chat_title || t('محادثة', 'Chat')}</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.content}
                  </p>
                </div>
                <button className="icon-btn" onClick={() => handleDelete(item.message_id)}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}