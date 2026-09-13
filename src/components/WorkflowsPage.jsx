import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Workflow, ArrowRight, Plus, X, Play } from 'lucide-react';
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
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoWfSpin { to { transform: rotate(360deg); } } .nexo-wf-spin { animation: nexoWfSpin 1s linear infinite; }`}</style>
      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}><ArrowRight size={15} /> {t('رجوع', 'Back')}</button>
      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Workflow size={20} /> {t('سلاسل العمل الآلية', 'Workflow Automation')}</h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>{t('ابنِ سلسلة خطوات ذكاء اصطناعي تشتغل بالتتابع على نص واحد، وشغّلها بضغطة زر.', 'Build a chain of AI steps that run sequentially on one input, and run it with one click.')}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('سلاسلك', 'Your Workflows')}</h3>
        <button className="settings-inline-btn" onClick={() => setShowCreate((s) => !s)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={13} /> {t('سلسلة جديدة', 'New Workflow')}</button>
      </div>

      {showCreate && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <input className="settings-text-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('اسم السلسلة (مثلاً: ترجمة ثم تلخيص)', 'Workflow name (e.g. Translate then Summarize)')} style={{ marginBottom: 10 }} />
          {newSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input className="settings-text-input" value={step} onChange={(e) => updateStepField(i, e.target.value)} placeholder={t(`تعليمات الخطوة ${i + 1}`, `Step ${i + 1} instruction`)} />
              {newSteps.length > 1 && <button className="icon-btn" onClick={() => removeStepField(i)}><X size={14} /></button>}
            </div>
          ))}
          <button className="settings-inline-btn" onClick={addStepField} style={{ marginBottom: 10 }}>+ {t('إضافة خطوة', 'Add step')}</button>
          <button className="settings-btn" onClick={handleCreate} disabled={creating} style={{ maxWidth: 160 }}>{creating ? t('جارِ الحفظ...', 'Saving...') : t('حفظ السلسلة', 'Save Workflow')}</button>
        </div>
      )}

      {loadingWorkflows ? <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p> : workflows.length === 0 ? <p className="settings-hint">{t('لا يوجد سلاسل بعد.', 'No workflows yet.')}</p> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
          {workflows.map((wf) => (
            <li key={wf.id} onClick={() => setSelectedWorkflow(wf)} style={{
              background: selectedWorkflow?.id === wf.id ? 'rgba(var(--accent-rgb), 0.15)' : 'var(--bg-input-3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 6, cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13.5 }}>{wf.name} ({wf.steps.length} {t('خطوات', 'steps')})</span>
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf.id); }}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}

      {selectedWorkflow && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32 }}>
          <h4 className="settings-group-title">{t('تشغيل', 'Run')}: {selectedWorkflow.name}</h4>
          <textarea className="settings-textarea" rows={5} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={t('النص يلي بدك تبدأ فيه السلسلة...', 'The text to start the workflow with...')} />
          {error && <p className="settings-hint" style={{ color: '#f87171', marginTop: 12 }}><AlertCircle size={13} style={{ display: 'inline', marginInlineEnd: 4 }} />{error}</p>}
          <button className="settings-btn" onClick={handleRun} disabled={running} style={{ marginTop: 16, maxWidth: 160 }}>
            {running ? <Loader2 size={14} className="nexo-wf-spin" /> : <Play size={14} />} {running ? t('جارِ التشغيل...', 'Running...') : t('تشغيل', 'Run')}
          </button>
        </div>
      )}

      {currentRun && currentRun.status === 'completed' && (
        <div style={{ marginBottom: 32 }}>
          {currentRun.step_results.map((sr, i) => (
            <div key={i} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: 16, marginBottom: 10 }}>
              <p className="settings-hint" style={{ marginBottom: 6 }}>{t('خطوة', 'Step')} {i + 1}: {sr.instruction}</p>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{sr.output}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('سجل التشغيلات', 'Run History')}</h3>
        {runHistory.length > 0 && <button className="settings-inline-btn" onClick={handleDeleteAllRuns} style={{ color: '#f87171' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>
      {loadingRuns ? <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p> : runHistory.length === 0 ? <p className="settings-hint">{t('لا يوجد تشغيلات بعد.', 'No runs yet.')}</p> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {runHistory.map((item) => (
            <li key={item.id} onClick={() => setCurrentRun(item)} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, cursor: 'pointer', fontSize: 13.5 }}>
              {item.workflow_name} — {new Date(item.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'ar-EG')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}