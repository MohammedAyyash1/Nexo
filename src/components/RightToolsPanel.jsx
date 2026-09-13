import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PanelRightClose, PanelRightOpen, Search, Plus, FolderKanban } from 'lucide-react';

// نفس مجموعات الأدوات الموجودة أصلًا بالـSidebar - انتقلت هون فقط، بدون حذف ولا نسخة مكررة
export function getToolGroups(TOOL_GROUPS_SOURCE) {
  return TOOL_GROUPS_SOURCE;
}

export function RightToolsPanel({
  lang, toolGroups, toolHandlers, collapsed, onToggleCollapse, isMobileDrawer,
  projects = [], chatsByProject = {}, onCreateProject, onOpenProject,
}) {
  const [query, setQuery] = useState('');
  const location = useLocation();
  const t = (ar, en) => (lang === 'en' ? en : ar);

  const filteredGroups = toolGroups
    .map((group) => ({
      ...group,
      tools: group.tools.filter((tool) => {
        if (!query.trim()) return true;
        const label = (lang === 'en' ? tool.labelEn : tool.labelAr).toLowerCase();
        return label.includes(query.toLowerCase());
      }),
    }))
    .filter((group) => group.tools.length > 0);

  return (
    <>
      {isMobileDrawer && !collapsed && (
        <div className="nexo-tools-backdrop" onClick={onToggleCollapse} />
      )}
      <aside className={`nexo-tools-panel ${collapsed ? 'collapsed' : ''}`}>
        <div className="nexo-tools-panel-header">
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {lang === 'en' ? 'Nexo Tools' : 'أدوات Nexo'}
          </span>
          <button className="icon-btn" onClick={onToggleCollapse} title={t('إغلاق', 'Close')}>
            <PanelRightClose size={16} />
          </button>
        </div>

        <div className="nexo-tools-search">
          <Search size={14} color="var(--text-secondary)" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t('بحث بالأدوات...', 'Search tools...')}
          />
        </div>

        <div className="nexo-tools-body">
          {filteredGroups.map((group) => (
            <div key={group.key} className="nexo-tools-group">
              <div className="nexo-tools-group-title">{lang === 'en' ? group.labelEn : group.labelAr}</div>
              {group.tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = tool.path && location.pathname === tool.path;
                return (
                  <div
                    key={tool.key}
                    className={`nexo-tool-item ${isActive ? 'active' : ''}`}
                    onClick={toolHandlers[tool.handlerKey]}
                  >
                    <div className="nexo-tool-icon"><Icon size={15} /></div>
                    <div className="nexo-tool-texts">
                      <div className="nexo-tool-label">{lang === 'en' ? tool.labelEn : tool.labelAr}</div>
                      <div className="nexo-tool-desc">{lang === 'en' ? tool.descEn : tool.descAr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="settings-hint" style={{ padding: 16, textAlign: 'center' }}>{t('لا نتائج', 'No results')}</p>
          )}

          {/* قسم المشاريع — يعيد استخدام نفس البيانات والمعالجات الموجودة أصلًا بـChatApp/Sidebar */}
          <div className="nexo-tools-projects">
            <div className="nexo-tools-projects-header">
              <span className="nexo-tools-projects-title">{t('مشاريعي', 'My Projects')}</span>
              {onCreateProject && (
                <button className="nexo-tools-projects-add" onClick={onCreateProject} title={t('مشروع جديد', 'New project')}>
                  <Plus size={13} />
                </button>
              )}
            </div>

            {projects.length === 0 ? (
              <div className="nexo-tools-projects-empty">{t('لا يوجد مشاريع بعد', 'No projects yet')}</div>
            ) : (
              projects.map((p) => (
                <div key={p.id} className="nexo-project-card" onClick={() => onOpenProject && onOpenProject(p)}>
                  <div className="nexo-project-icon"><FolderKanban size={14} /></div>
                  <div className="nexo-project-texts">
                    <div className="nexo-project-name">{p.name}</div>
                    <div className="nexo-project-count">
                      {(chatsByProject[p.id] || []).length} {t('محادثة', 'chats')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  );
}