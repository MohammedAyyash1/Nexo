import { useState, useEffect } from 'react';
import { Trash2, Pin, PinOff, Pencil, Check, X, Inbox } from 'lucide-react';
import { API_BASE } from '../../../../config/api.js';

const TOKEN_KEY = 'nexo_token';

const CATEGORY_META = {
  personal: { ar: 'شخصية', en: 'Personal' },
  work: { ar: 'عمل', en: 'Work' },
  preferences: { ar: 'تفضيلات', en: 'Preferences' },
  projects: { ar: 'مشاريع', en: 'Projects' },
  general: { ar: 'عام', en: 'General' },
};

export function MemorySection({ lang, showToast }) {
  const [facts, setFacts] = useState([]);
  const [loadingFacts, setLoadingFacts] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const t = (ar, en) => (lang === 'en' ? en : ar);

  const loadFacts = () => {
    fetch(`${API_BASE}/api/memory`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setFacts(data.facts || []))
      .catch((err) => console.error('Load memory error:', err))
      .finally(() => setLoadingFacts(false));
  };

  useEffect(() => { loadFacts(); }, []);

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل الحقائق المحفوظة عنك؟', 'Delete all remembered facts about you?'))) return;
    fetch(`${API_BASE}/api/memory`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setFacts([]); showToast(t('تم مسح الذاكرة', 'Memory cleared')); })
      .catch((err) => console.error('Delete memory error:', err));
  };

  const handleDeleteOne = (id) => {
    fetch(`${API_BASE}/api/memory/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setFacts((prev) => prev.filter((f) => f.id !== id)))
      .catch((err) => console.error('Delete fact error:', err));
  };

  const handleTogglePin = (f) => {
    fetch(`${API_BASE}/api/memory/${f.id}/pin`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ pinned: !f.pinned }),
    })
      .then((res) => res.json())
      .then(() => loadFacts()) // إعادة التحميل لضمان الترتيب الصحيح (المثبّتة أولًا)
      .catch((err) => console.error('Pin fact error:', err));
  };

  const startEdit = (f) => { setEditingId(f.id); setEditText(f.fact); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = (f) => {
    if (!editText.trim()) return;
    fetch(`${API_BASE}/api/memory/${f.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ fact: editText.trim(), category: f.category }),
    })
      .then((res) => res.json())
      .then(({ fact }) => {
        setFacts((prev) => prev.map((x) => (x.id === f.id ? fact : x)));
        cancelEdit();
        showToast(t('تم التحديث', 'Updated'));
      })
      .catch((err) => console.error('Update fact error:', err));
  };

  if (loadingFacts) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
        {[0, 1, 2].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-80" />)}
      </div>
    );
  }

  return (
    <div className="nexo-settings-block" style={{ borderBottom: 'none' }}>
      <p className="nexo-settings-desc" style={{ marginBottom: 16 }}>
        {t('هذه المعلومات التي يتذكرها Nexo عنك من محادثاتك، ويستخدمها لتقديم ردود أكثر تخصيصًا.', 'This is what Nexo remembers about you from your conversations, used to personalize its responses.')}
      </p>

      {facts.length === 0 ? (
        <div className="nexo-state">
          <div className="nexo-state-icon"><Inbox size={18} /></div>
          <div className="nexo-state-title">{t('لا يوجد لدى Nexo أي معلومات محفوظة عنك بعد', "Nexo doesn't remember anything about you yet")}</div>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
          {facts.map((f) => (
            <li key={f.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="nexo-badge nexo-badge-accent" style={{ marginBottom: 6 }}>
                  {lang === 'en' ? CATEGORY_META[f.category]?.en || f.category : CATEGORY_META[f.category]?.ar || f.category}
                </span>
                {editingId === f.id ? (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <input
                      className="nexo-input" dir="auto" value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus style={{ flex: 1 }}
                    />
                    <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => saveEdit(f)}><Check size={14} /></button>
                    <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={cancelEdit}><X size={14} /></button>
                  </div>
                ) : (
                  <div dir="auto" style={{ color: 'var(--text-primary)', fontSize: 13.5, marginTop: 4 }}>{f.fact}</div>
                )}
              </div>
              {editingId !== f.id && (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleTogglePin(f)} title={t('تثبيت', 'Pin')}>
                    {f.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => startEdit(f)} title={t('تعديل', 'Edit')}>
                    <Pencil size={13} />
                  </button>
                  <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDeleteOne(f.id)} title={t('حذف', 'Delete')}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {facts.length > 0 && (
        <button className="nexo-btn nexo-btn-danger" onClick={handleDeleteAll}>
          <Trash2 size={14} /> {t('مسح كل الذاكرة', 'Clear all memory')}
        </button>
      )}
    </div>
  );
}