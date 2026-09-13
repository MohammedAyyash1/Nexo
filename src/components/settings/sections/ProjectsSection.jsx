import { useState, useEffect } from 'react';
import { FolderKanban, Plus, Inbox } from 'lucide-react';
import { ProjectModal } from '../../ProjectModal.jsx';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

export function ProjectsSection({ lang, showToast }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const t = (ar, en) => (lang === 'en' ? en : ar);

  const loadProjects = () => {
    fetch(`${API_BASE}/api/projects`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []))
      .catch((err) => console.error('Load projects error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProjects(); }, []);

  const openCreate = () => { setEditingProject(null); setModalOpen(true); };
  const openEdit = (project) => { setEditingProject(project); setModalOpen(true); };

  const handleSaved = () => {
    setModalOpen(false); setEditingProject(null);
    loadProjects();
    showToast(t('تم الحفظ', 'Saved'));
  };

  const handleDeleted = () => {
    setModalOpen(false); setEditingProject(null);
    loadProjects();
    showToast(t('تم حذف المشروع', 'Project deleted'));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
        {[0, 1].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
      </div>
    );
  }

  return (
    <div className="nexo-settings-block" style={{ borderBottom: 'none' }}>
      <p className="nexo-settings-desc" style={{ marginBottom: 16 }}>
        {t('نظّم محادثاتك وملفاتك بمساحات عمل خاصة، وNexo يفهم سياق المشروع بدل ما يبدأ من الصفر كل مرة.', 'Organize your chats and files into dedicated workspaces — Nexo understands the project context instead of starting from scratch each time.')}
      </p>

      {projects.length === 0 ? (
        <div className="nexo-state">
          <div className="nexo-state-icon"><Inbox size={18} /></div>
          <div className="nexo-state-title">{t('لا يوجد لديك أي مشروع بعد', "You don't have any projects yet")}</div>
        </div>
      ) : (
        <ul className="nexo-list" style={{ marginBottom: 16 }}>
          {projects.map((p) => (
            <li key={p.id} className="nexo-list-item" onClick={() => openEdit(p)} style={{ cursor: 'pointer' }}>
              <div className="nexo-file-row-icon"><FolderKanban size={16} /></div>
              <div className="nexo-list-item-main">
                <div className="nexo-list-item-title" dir="auto">{p.name}</div>
                {p.description && <span className="nexo-list-item-sub" dir="auto">{p.description}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button className="nexo-btn nexo-btn-primary" onClick={openCreate}>
        <Plus size={14} /> {t('مشروع جديد', 'New project')}
      </button>

      {modalOpen && (
        <ProjectModal
          mode={editingProject ? 'edit' : 'create'}
          project={editingProject}
          lang={lang}
          onClose={() => { setModalOpen(false); setEditingProject(null); }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}