import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Trash2, Paperclip, Check } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const BASE = `${API_BASE}/api`;

const SUPPORTED_KNOWLEDGE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function ProjectModal({ mode, project, lang, onClose, onSaved, onDeleted }) {
  const isEdit = mode === 'edit';
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [step, setStep] = useState(0);
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [instructions, setInstructions] = useState(project?.instructions || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [userFiles, setUserFiles] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [selectedNewFileIds, setSelectedNewFileIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/files`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setUserFiles(data.files || []))
      .catch((err) => console.error('Load files error:', err));

    if (isEdit && project) {
      fetch(`${BASE}/projects/${project.id}`, { headers: authHeaders() })
        .then((res) => res.json())
        .then((data) => setAttachedFiles(data.files || []))
        .catch((err) => console.error('Load project files error:', err));
    }
  }, []);

  const knowledgeFiles = userFiles.filter((f) => SUPPORTED_KNOWLEDGE_TYPES.includes(f.type));
  const attachedFileIds = new Set(attachedFiles.map((f) => f.file_id));
  const availableToAttach = knowledgeFiles.filter((f) => !attachedFileIds.has(f.id));

  const toggleSelectNewFile = (fileId) => {
    setSelectedNewFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError(t('اسم المشروع مطلوب', 'Project name is required')); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/projects`, {
        method: 'POST', headers: authHeadersJson(),
        body: JSON.stringify({ name: name.trim(), description: description.trim(), instructions: instructions.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); setSaving(false); return; }
      const newProject = data.project;

      for (const fileId of selectedNewFileIds) {
        await fetch(`${BASE}/projects/${newProject.id}/files`, {
          method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ fileId }),
        }).catch((err) => console.error('Attach file error:', err));
      }
      onSaved(newProject);
    } catch (err) {
      setError(t('خطأ بالاتصال', 'Connection error'));
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!name.trim()) { setError(t('اسم المشروع مطلوب', 'Project name is required')); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/projects/${project.id}`, {
        method: 'PATCH', headers: authHeadersJson(),
        body: JSON.stringify({ name: name.trim(), description: description.trim(), instructions: instructions.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); setSaving(false); return; }
      onSaved(data.project);
    } catch (err) {
      setError(t('خطأ بالاتصال', 'Connection error'));
      setSaving(false);
    }
  };

  const handleAttachExisting = (fileId) => {
    fetch(`${BASE}/projects/${project.id}/files`, {
      method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ fileId }),
    })
      .then(() => fetch(`${BASE}/projects/${project.id}`, { headers: authHeaders() }))
      .then((res) => res.json())
      .then((data) => setAttachedFiles(data.files || []))
      .catch((err) => console.error('Attach file error:', err));
  };

  const handleDetach = (fileId) => {
    fetch(`${BASE}/projects/${project.id}/files/${fileId}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setAttachedFiles((prev) => prev.filter((f) => f.file_id !== fileId)))
      .catch((err) => console.error('Detach file error:', err));
  };

  const handleDelete = () => {
    fetch(`${BASE}/projects/${project.id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => onDeleted(project.id))
      .catch((err) => console.error('Delete project error:', err));
  };

  const STEPS_CREATE = [
    { key: 'name', label: t('اسم المشروع', "Project's name") },
    { key: 'description', label: t('وصف قصير', 'Short description') },
    { key: 'instructions', label: t('شو سياق هذا المشروع؟', 'What is this project about?') },
    { key: 'files', label: t('ملفات (اختياري)', 'Files (optional)') },
  ];

  const canGoNext = () => (step === 0 ? name.trim().length > 0 : true);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" style={{ height: 'auto', maxHeight: '85vh', maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>{isEdit ? t('تعديل المشروع', 'Edit project') : t('مشروع جديد', 'New project')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
          {error && <p className="settings-hint" style={{ color: '#f87171', marginBottom: 12 }}>{error}</p>}

          {!isEdit ? (
            <>
              <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {STEPS_CREATE.map((s, i) => (
                  <div key={s.key} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= step ? 'var(--accent-2)' : 'var(--bg-input-2)' }} />
                ))}
              </div>

              <h4 className="settings-group-title" style={{ marginBottom: 10 }}>{STEPS_CREATE[step].label}</h4>

              {step === 0 && (
                <input type="text" className="settings-text-input" value={name} onChange={(e) => setName(e.target.value)}
                  maxLength={40} autoFocus placeholder={t('مثلاً: بحث السوق', 'e.g. Market research')} />
              )}
              {step === 1 && (
                <input type="text" className="settings-text-input" value={description} onChange={(e) => setDescription(e.target.value)}
                  maxLength={100} autoFocus placeholder={t('وصف مختصر يساعدك تتذكر الهدف', 'A short note about its goal')} />
              )}
              {step === 2 && (
                <textarea className="settings-textarea" rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)}
                  maxLength={2000} autoFocus placeholder={t('مثلاً: هذا المشروع خاص بتحليل السوق الفلسطيني...', 'e.g. This project is about analyzing the Palestinian market...')} />
              )}
              {step === 3 && (
                knowledgeFiles.length === 0 ? (
                  <p className="settings-hint">{t('لا يوجد ملفات PDF أو Word مرفوعة بعد.', 'No PDF or Word files uploaded yet.')}</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 220, overflowY: 'auto' }}>
                    {knowledgeFiles.map((f) => (
                      <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                        <input type="checkbox" checked={selectedNewFileIds.has(f.id)} onChange={() => toggleSelectNewFile(f.id)} />
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{f.name}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                {step > 0 && (
                  <button className="settings-btn" onClick={() => setStep((s) => s - 1)} style={{ flex: 1 }}>
                    <ChevronRight size={14} /> {t('رجوع', 'Back')}
                  </button>
                )}
                {step < STEPS_CREATE.length - 1 ? (
                  <button className="settings-btn" disabled={!canGoNext()} onClick={() => setStep((s) => s + 1)} style={{ flex: 1 }}>
                    {t('التالي', 'Next')} <ChevronLeft size={14} />
                  </button>
                ) : (
                  <button className="settings-btn" disabled={saving} onClick={handleCreate} style={{ flex: 1 }}>
                    <Check size={14} /> {saving ? t('جارِ الإنشاء...', 'Creating...') : t('إنشاء المشروع', 'Create project')}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <h4 className="settings-group-title">{t('الاسم', 'Name')}</h4>
                <input type="text" className="settings-text-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <h4 className="settings-group-title">{t('الوصف', 'Description')}</h4>
                <input type="text" className="settings-text-input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={100} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <h4 className="settings-group-title">{t('سياق المشروع', 'Project context')}</h4>
                <textarea className="settings-textarea" rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={2000} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <h4 className="settings-group-title">{t('الملفات المرتبطة', 'Attached files')} ({attachedFiles.length})</h4>
                {attachedFiles.length === 0 ? (
                  <p className="settings-hint" style={{ marginBottom: 8 }}>{t('لا يوجد ملفات مرتبطة.', 'No files attached.')}</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px' }}>
                    {attachedFiles.map((f) => (
                      <li key={f.file_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                        <Paperclip size={13} color="var(--text-secondary)" />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{f.files?.name}</span>
                        <button className="icon-btn" onClick={() => handleDetach(f.file_id)}><X size={13} /></button>
                      </li>
                    ))}
                  </ul>
                )}
                {availableToAttach.length > 0 && (
                  <select className="settings-select" defaultValue="" style={{ width: '100%' }}
                    onChange={(e) => { if (e.target.value) { handleAttachExisting(e.target.value); e.target.value = ''; } }}>
                    <option value="" disabled>{t('+ إضافة ملف موجود', '+ Attach an existing file')}</option>
                    {availableToAttach.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                )}
              </div>

              <button className="settings-btn" onClick={handleSaveEdit} disabled={saving} style={{ marginBottom: 20 }}>
                <Check size={14} /> {saving ? t('جارِ الحفظ...', 'Saving...') : t('حفظ التغييرات', 'Save changes')}
              </button>

              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                {!showDeleteConfirm ? (
                  <button className="settings-btn danger" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={14} /> {t('حذف المشروع', 'Delete project')}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="settings-btn danger" onClick={handleDelete} style={{ flex: 1 }}>{t('تأكيد الحذف', 'Confirm delete')}</button>
                    <button className="settings-btn" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>{t('إلغاء', 'Cancel')}</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}