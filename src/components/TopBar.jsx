import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MoreHorizontal, Pin, Archive, Pencil, Trash2, Search, Sparkles, Bell } from 'lucide-react';

export function TopBar({
  t, lang, sidebarCollapsed, toggleSidebar, handleShare, hasMessages,
  moreMenuOpen, setMoreMenuOpen, activeChat, handleTogglePin, handleToggleArchive,
  handleRenameChat, handleDeleteCurrentChat,
}) {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="top-bar">
      {sidebarCollapsed && (
        <button className="icon-btn expand-btn" title={t.collapse} onClick={toggleSidebar}>
          <Menu size={18} />
        </button>
      )}
      <span className="top-bar-title">{t.brand}</span>

      <div className="topbar-v3-row">
        <div className="topbar-v3-search" title={lang === 'en' ? 'Coming soon' : 'قريبًا'} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          <Search size={14} />
          <input placeholder={lang === 'en' ? 'Search coming soon...' : 'البحث قريبًا...'} disabled />
        </div>
      </div>

      <div className="top-bar-actions">
        <button className="premium-badge" onClick={() => navigate('/upgrade')}>
          <Sparkles size={13} /> {lang === 'en' ? 'Nexo Premium' : 'Nexo Premium'}
        </button>

        <div className="notif-btn-wrap">
          <button className="icon-btn" title={lang === 'en' ? 'Notifications' : 'الإشعارات'} onClick={() => setNotifOpen((v) => !v)}>
            <Bell size={17} />
          </button>
          {notifOpen && (
            <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
              {lang === 'en' ? 'No notifications yet.' : 'لا يوجد إشعارات حتى الآن.'}
            </div>
          )}
        </div>

        <button className="pill-btn" onClick={handleShare} disabled={!hasMessages}>
          {t.share}
        </button>
        <div className="more-menu-wrapper">
          <button className="icon-btn" title={t.more} onClick={() => setMoreMenuOpen((prev) => !prev)} disabled={!hasMessages}>
            <MoreHorizontal size={18} />
          </button>
          {moreMenuOpen && (
            <div className="brand-menu more-menu" onClick={(e) => e.stopPropagation()}>
              <div className="brand-menu-item" onClick={handleTogglePin}>
                <Pin size={14} />
                {activeChat?.pinned ? (lang === 'en' ? 'Unpin chat' : 'إلغاء تثبيت المحادثة') : (lang === 'en' ? 'Pin chat' : 'تثبيت المحادثة')}
              </div>
              <div className="brand-menu-item" onClick={handleToggleArchive}>
                <Archive size={14} />
                {activeChat?.archived ? (lang === 'en' ? 'Unarchive' : 'إلغاء الأرشفة') : (lang === 'en' ? 'Archive' : 'أرشفة')}
              </div>
              <div className="brand-menu-item" onClick={handleRenameChat}>
                <Pencil size={14} /> {lang === 'en' ? 'Rename chat' : 'إعادة تسمية المحادثة'}
              </div>
              <div className="brand-menu-item danger" onClick={handleDeleteCurrentChat}>
                <Trash2 size={14} /> {t.deleteChat}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}