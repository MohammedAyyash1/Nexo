import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Code2, ArrowRight, Copy, Check, X, Plus, Inbox } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const ACTIONS = { generate: { ar: 'كتابة كود', en: 'Generate' }, explain: { ar: 'شرح كود', en: 'Explain' }, debug: { ar: 'تصحيح أخطاء', en: 'Debug' }, convert: { ar: 'تحويل لغة', en: 'Convert' } };

export function CodeWorkspacePage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [action, setAction] = useState('generate');
  const [files, setFiles] = useState([{ name: 'file1', content: '' }]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  const addFile = () => setFiles((f) => [...f, { name: `file${f.length + 1}`, content: '' }]);
  const removeFile = (idx) => { setFiles((f) => f.filter((_, i) => i !== idx)); setActiveFileIndex(0); };
  const updateFileName = (idx, name) => setFiles((f) => f.map((x, i) => (i === idx ? { ...x, name } : x)));
  const updateFileContent = (idx, content) => setFiles((f) => f.map((x, i) => (i === idx ? { ...x, content } : x)));

  const code = files.map((f) => `--- ${f.name} ---\n${f.content}`).join('\n\n');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/code-workspace`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setHistory(data.snippets || []))
      .catch((err) => { console.error(err); setHistoryError(true); }).finally(() => setLoadingHistory(false));
  };
  useEffect(() => { loadHistory(); }, []);

  const handleRun = () => {
    setError('');
    if (!code.trim()) { setError(t('الرجاء إدخال نص', 'Please enter text')); return; }
    setProcessing(true);
    fetch(`${BASE}/code-workspace/run`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ action, code: code.trim(), lang }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setResult(data.snippet);
        setHistory((prev) => [data.snippet, ...prev]);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setProcessing(false));
  };

  const handleCopy = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const handleDelete = (id) => {
    fetch(`${BASE}/code-workspace/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory((prev) => prev.filter((h) => h.id !== id)); if (result?.id === id) setResult(null); })
      .catch((err) => console.error(err));
  };
  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل السجل نهائيًا؟', 'Delete all history permanently?'))) return;
    fetch(`${BASE}/code-workspace`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setResult(null); }).catch((err) => console.error(err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Code2 size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('مساحة عمل الكود', 'Code Workspace')}</h1>
          <p className="nexo-tool-page-desc">{t('كتابة، شرح، تصحيح، أو تحويل كود بمساعدة الذكاء الاصطناعي.', 'Generate, explain, debug, or convert code with AI assistance.')}</p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />

        <div className="nexo-tabs" style={{ marginBottom: 14 }}>
          {Object.entries(ACTIONS).map(([key, labels]) => (
            <button key={key} className={`nexo-tab ${action === key ? 'active' : ''}`} onClick={() => setAction(key)}>
              {lang === 'en' ? labels.en : labels.ar}
            </button>
          ))}
        </div>

        {action !== 'generate' && (
          <div className="nexo-file-tabs">
            {files.map((f, idx) => (
              <div key={idx} className={`nexo-file-tab ${activeFileIndex === idx ? 'active' : ''}`}>
                <input
                  value={f.name} onChange={(e) => updateFileName(idx, e.target.value)}
                  onClick={() => setActiveFileIndex(idx)}
                  dir="ltr"
                />
                {files.length > 1 && (
                  <button className="nexo-file-tab-close" onClick={() => removeFile(idx)}><X size={11} /></button>
                )}
              </div>
            ))}
            <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={addFile}><Plus size={12} /> {t('ملف', 'file')}</button>
          </div>
        )}

        <textarea
          className="nexo-textarea nexo-code-input" dir="ltr" rows={8}
          value={action === 'generate' ? files[0].content : files[activeFileIndex].content}
          onChange={(e) => updateFileContent(action === 'generate' ? 0 : activeFileIndex, e.target.value)}
          placeholder={action === 'generate' ? t('اكتب وصف الكود يلي بدك...', 'Describe the code you want...') : t(`الصق كود ملف "${files[activeFileIndex]?.name}" هون...`, `Paste "${files[activeFileIndex]?.name}" code here...`)}
        />

        {files.length > 1 && action !== 'generate' && (
          <p className="nexo-list-item-sub" style={{ marginTop: 8 }}>
            {t('كل الملفات رح تُرسل مع بعض بنفس الطلب حتى يفهم Nexo السياق الكامل بينهم.', 'All files will be sent together so Nexo understands the full context between them.')}
          </p>
        )}

        {error && <div className="nexo-inline-error"><AlertCircle size={13} />{error}</div>}

        <button className="nexo-btn nexo-btn-primary" onClick={handleRun} disabled={processing} style={{ marginTop: 18, minWidth: 200 }}>
          {processing && <Loader2 size={14} className="nexo-spin" />} {processing ? t('جارِ المعالجة...', 'Processing...') : t('تشغيل', 'Run')}
        </button>
      </div>

      {result && result.status === 'completed' && (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div className="nexo-card-row-header">
            <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('النتيجة', 'Result')}</h4>
            <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleCopy(result.result_text)}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>
          <pre className="nexo-code-block" dir="auto">{result.result_text}</pre>
        </div>
      )}

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>

      {loadingHistory ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
        </div>
      ) : historyError ? (
        <div className="nexo-card">
          <div className="nexo-state nexo-state-error">
            <div className="nexo-state-icon"><AlertCircle size={20} /></div>
            <div className="nexo-state-title">{t('تعذّر تحميل السجل', 'Could not load history')}</div>
            <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={loadHistory}>{t('إعادة المحاولة', 'Retry')}</button>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="nexo-card">
          <div className="nexo-state">
            <div className="nexo-state-icon"><Inbox size={20} /></div>
            <div className="nexo-state-title">{t('لا يوجد سجل بعد', 'No history yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main" onClick={() => setResult(item)} style={{ cursor: 'pointer' }}>
                <div className="nexo-list-item-title" dir="auto">{item.title}</div>
                <span className="nexo-list-item-sub">{ACTIONS[item.action]?.[lang] || item.action}</span>
              </div>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
     </div>
    </div>
  );
}