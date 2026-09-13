import { useState, useEffect } from 'react';
import { Bot, Plus, Inbox } from 'lucide-react';
import { AssistantModal } from '../../AssistantModal.jsx';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

export function AssistantsSection({ lang, showToast }) {
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const t = (ar, en) => (lang === 'en' ? en : ar);

  const loadAssistants = () => {
    fetch(`${API_BASE}/api/assistants`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setAssistants(data.assistants || []))
      .catch((err) => console.error('Load assistants error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAssistants(); }, []);

  const openCreate = () => { setEditingAssistant(null); setModalOpen(true); };
  const openEdit = (assistant) => { setEditingAssistant(assistant); setModalOpen(true); };

  const handleSaved = () => {
    setModalOpen(false); setEditingAssistant(null);
    loadAssistants();
    showToast(t('تم الحفظ', 'Saved'));
  };

  const handleDeleted = () => {
    setModalOpen(false); setEditingAssistant(null);
    loadAssistants();
    showToast(t('تم حذف المساعد', 'Assistant deleted'));
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
        {t('أنشئ مساعدين مخصصين بتعليمات وملفات خاصة بهم، واستخدمهم مباشرة من الشريط الجانبي.', 'Create custom assistants with their own instructions and files, and use them directly from the sidebar.')}
      </p>

      {assistants.length === 0 ? (
        <div className="nexo-state">
          <div className="nexo-state-icon"><Inbox size={18} /></div>
          <div className="nexo-state-title">{t('لا يوجد لديك أي مساعد بعد', "You don't have any assistants yet")}</div>
        </div>
      ) : (
        <ul className="nexo-list" style={{ marginBottom: 16 }}>
          {assistants.map((a) => (
            <li key={a.id} className="nexo-list-item" onClick={() => openEdit(a)} style={{ cursor: 'pointer' }}>
              <div className="nexo-file-row-icon"><Bot size={16} /></div>
              <div className="nexo-list-item-main">
                <div className="nexo-list-item-title" dir="auto">{a.name}</div>
                {a.description && <span className="nexo-list-item-sub" dir="auto">{a.description}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button className="nexo-btn nexo-btn-primary" onClick={openCreate}>
        <Plus size={14} /> {t('مساعد جديد', 'New assistant')}
      </button>

      {modalOpen && (
        <AssistantModal
          mode={editingAssistant ? 'edit' : 'create'}
          assistant={editingAssistant}
          lang={lang}
          onClose={() => { setModalOpen(false); setEditingAssistant(null); }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}