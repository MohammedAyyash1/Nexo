import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Workflow, ArrowRight, Plus, X, Play, Inbox } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function WorkflowsPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [workflows, setWorkflows] = useState([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSteps, setNewSteps] = useState(['']);
  const [creating, setCreating] = useState(false);

  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [inputText, setInputText] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [currentRun, setCurrentRun] = useState(null);
  const [runHistory, setRunHistory] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  const loadWorkflows = () => {
    fetch(`${BASE}/workflows`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setWorkflows(data.workflows || []))
      .catch((err) => console.error(err)).finally(() => setLoadingWorkflows(false));
  };
  const loadRuns = () => {
    fetch(`${BASE}/workflows/runs/history`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setRunHistory(data.runs || []))
      .catch((err) => console.error(err)).finally(() => setLoadingRuns(false));
  };
  useEffect(() => { loadWorkflows(); loadRuns(); }, []);

  const addStepField = () => setNewSteps((s) => [...s, '']);
  const updateStepField = (i, val) => setNewSteps((s) => s.map((x, idx) => (idx === i ? val : x)));
  const removeStepField = (i) => setNewSteps((s) => s.filter((_, idx) => idx !== i));

  const handleCreate = () => {
    const steps = newSteps.filter((s) => s.trim()).map((instruction) => ({ instruction: instruction.trim() }));
    if (!newName.trim() || !steps.length) return;
    setCreating(true);
    fetch(`${BASE}/workflows`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ name: newName.trim(), steps }) })
      .then((res) => res.json())
      .then((data) => { if (data.workflow) { setWorkflows((prev) => [data.workflow, ...prev]); setNewName(''); setNewSteps(['']); setShowCreate(false); } })
      .catch((err) => console.error(err))
      .finally(() => setCreating(false));
  };

  const handleRun = () => {
    setError(''); setCurrentRun(null);
    if (!selectedWorkflow) { setError(t('اختر سير عمل أول', 'Select a workflow first')); return; }
    if (!inputText.trim()) { setError(t('الرجاء إدخال نص البداية', 'Please enter the starting text')); return; }
    setRunning(true);
    fetch(`${BASE}/workflows/${selectedWorkflow.id}/run`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ inputText: inputText.trim() }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentRun(data.run);
        setRunHistory((prev) => [data.run, ...prev]);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setRunning(false));
  };

  const handleDeleteWorkflow = (id) => {
    fetch(`${BASE}/workflows/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setWorkflows((prev) => prev.filter((w) => w.id !== id)); if (selectedWorkflow?.id === id) setSelectedWorkflow(null); })
      .catch((err) => console.error(err));
  };

  const handleDeleteAllRuns = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/workflows/runs/history`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setRunHistory([]); setCurrentRun(null); }).catch((err) => console.error(err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Workflow size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('سلاسل العمل الآلية', 'Workflow Automation')}</h1>
          <p className="nexo-tool-page-desc">{t('ابنِ سلسلة خطوات ذكاء اصطناعي تشتغل بالتتابع على نص واحد، وشغّلها بضغطة زر.', 'Build a chain of AI steps that run sequentially on one input, and run it with one click.')}</p>
        </div>
      </div>

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('سلاسلك', 'Your Workflows')}</h3>
        <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={() => setShowCreate((s) => !s)} style={{ marginInlineStart: 'auto' }}>
          <Plus size={13} /> {t('سلسلة جديدة', 'New Workflow')}
        </button>
      </div>

      {showCreate && (
        <div className="nexo-card" style={{ marginBottom: 20 }}>
          <div className="nexo-field">
            <input className="nexo-input" dir="auto" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('اسم السلسلة (مثلاً: ترجمة ثم تلخيص)', 'Workflow name (e.g. Translate then Summarize)')} />
          </div>
          {newSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
              <span className="nexo-step-number">{i + 1}</span>
              <input className="nexo-input" dir="auto" value={step} onChange={(e) => updateStepField(i, e.target.value)} placeholder={t(`تعليمات الخطوة ${i + 1}`, `Step ${i + 1} instruction`)} />
              {newSteps.length > 1 && <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => removeStepField(i)}><X size={14} /></button>}
            </div>
          ))}
          <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={addStepField} style={{ marginBottom: 12 }}><Plus size={12} /> {t('إضافة خطوة', 'Add step')}</button>
          <button className="nexo-btn nexo-btn-primary" onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 size={14} className="nexo-spin" />}
            {creating ? t('جارِ الحفظ...', 'Saving...') : t('حفظ السلسلة', 'Save Workflow')}
          </button>
        </div>
      )}

      {loadingWorkflows ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[0, 1].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
        </div>
      ) : workflows.length === 0 ? (
        <div className="nexo-card" style={{ marginBottom: 24 }}>
          <div className="nexo-state">
            <div className="nexo-state-icon"><Inbox size={20} /></div>
            <div className="nexo-state-title">{t('لا يوجد سلاسل بعد', 'No workflows yet')}</div>
            <div className="nexo-state-desc">{t('أنشئ أول سلسلة وابدأ بأتمتة مهامك.', 'Create your first workflow and start automating.')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list" style={{ marginBottom: 24 }}>
          {workflows.map((wf) => (
            <li key={wf.id} className={`nexo-list-item ${selectedWorkflow?.id === wf.id ? 'selected' : ''}`} onClick={() => setSelectedWorkflow(wf)} style={{ cursor: 'pointer' }}>
              <div className="nexo-list-item-main">
                <div className="nexo-list-item-title" dir="auto">{wf.name}</div>
                <span className="nexo-list-item-sub">{wf.steps.length} {t('خطوات', 'steps')}</span>
              </div>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf.id); }}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}

      {selectedWorkflow && (
        <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
          <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 180, height: 180, top: -50, insetInlineEnd: -40 }} />
          <h4 className="nexo-card-row-title" dir="auto" style={{ marginBottom: 12 }}>{t('تشغيل', 'Run')}: {selectedWorkflow.name}</h4>
          <textarea className="nexo-textarea" dir="auto" rows={5} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={t('النص يلي بدك تبدأ فيه السلسلة...', 'The text to start the workflow with...')} />
          {error && <div className="nexo-inline-error"><AlertCircle size={13} />{error}</div>}
          <button className="nexo-btn nexo-btn-primary" onClick={handleRun} disabled={running} style={{ marginTop: 16, minWidth: 160 }}>
            {running ? <Loader2 size={14} className="nexo-spin" /> : <Play size={14} />} {running ? t('جارِ التشغيل...', 'Running...') : t('تشغيل', 'Run')}
          </button>
        </div>
      )}

      {currentRun && currentRun.status === 'completed' && (
        <div style={{ marginBottom: 28 }}>
          {currentRun.step_results.map((sr, i) => (
            <div key={i} className="nexo-card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="nexo-step-number">{i + 1}</span>
                <span className="nexo-list-item-sub" dir="auto">{sr.instruction}</span>
              </div>
              <p className="nexo-result-text" dir="auto" style={{ margin: 0, fontSize: 13.5 }}>{sr.output}</p>
            </div>
          ))}
        </div>
      )}

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('سجل التشغيلات', 'Run History')}</h3>
        {runHistory.length > 0 && <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAllRuns} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>

      {loadingRuns ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
        </div>
      ) : runHistory.length === 0 ? (
        <div className="nexo-card">
          <div className="nexo-state">
            <div className="nexo-state-icon"><Inbox size={20} /></div>
            <div className="nexo-state-title">{t('لا يوجد تشغيلات بعد', 'No runs yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {runHistory.map((item) => (
            <li key={item.id} className="nexo-list-item" onClick={() => setCurrentRun(item)} style={{ cursor: 'pointer' }}>
              <div className="nexo-list-item-main">
                <div className="nexo-list-item-title" dir="auto">{item.workflow_name}</div>
                <span className="nexo-list-item-sub">{new Date(item.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'ar-EG')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
     </div>
    </div>
  );
}