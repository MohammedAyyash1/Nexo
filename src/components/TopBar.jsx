import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MoreHorizontal, Pin, Archive, Pencil, Trash2, Search, Sparkles, Bell, MessageSquare } from 'lucide-react';

export function TopBar({
  t, lang, sidebarCollapsed, toggleSidebar, handleShare, hasMessages,
  moreMenuOpen, setMoreMenuOpen, activeChat, handleTogglePin, handleToggleArchive,
  handleRenameChat, handleDeleteCurrentChat,
  searchQuery, setSearchQuery, filteredChats, setActiveChatId,
}) {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const q = searchQuery.toLowerCase();
  const showResults = searchFocused && searchQuery.trim() !== '';

  const handlePickResult = (chatId) => {
    setActiveChatId(chatId);
    setSearchQuery('');
    setSearchFocused(false);
  };

  return (
    <div className="top-bar">
      {sidebarCollapsed && (
        <button className="icon-btn expand-btn" title={t.collapse} onClick={toggleSidebar}>
          <Menu size={18} />
        </button>
      )}
      <span className="top-bar-title">{t.brand}</span>

      <div className="topbar-v3-row">
        <div className="topbar-v3-search" style={{ position: 'relative' }}>
          <Search size={14} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder={lang === 'en' ? 'Search your chats...' : 'ابحث بمحادثاتك...'}
          />

          {showResults && (
            <div
              className="notif-dropdown"
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', insetInlineStart: 0,
                width: 340, maxHeight: 340, overflowY: 'auto', padding: 6,
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {filteredChats.length === 0 ? (
                <div style={{ padding: '10px 8px', color: 'var(--text-muted)', fontSize: 13 }}>
                  {lang === 'en' ? 'No matching chats' : 'لا توجد محادثات مطابقة'}
                </div>
              ) : (
                filteredChats.slice(0, 20).map((c) => {
                  const titleMatches = c.title.toLowerCase().includes(q);
                  const matchedMsg = !titleMatches
                    ? c.messages.find((m) => m.content?.toLowerCase().includes(q))
                    : null;

                  return (
                    <div
                      key={c.id}
                      onClick={() => handlePickResult(c.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 10px',
                        borderRadius: 8, cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--accent-rgb), 0.12)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <MessageSquare size={14} style={{ flexShrink: 0, opacity: 0.7, marginTop: 2 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 13.5, color: 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {c.title}
                        </div>
                        {matchedMsg && (
                          <div style={{
                            fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {matchedMsg.content.slice(0, 70)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
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