import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Code2, ArrowRight, Copy, Check } from 'lucide-react';
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

  const loadHistory = () => {
    fetch(`${BASE}/code-workspace`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setHistory(data.snippets || []))
      .catch((err) => console.error(err)).finally(() => setLoadingHistory(false));
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
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoCodeSpin { to { transform: rotate(360deg); } } .nexo-code-spin { animation: nexoCodeSpin 1s linear infinite; }`}</style>
      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}><ArrowRight size={15} /> {t('رجوع', 'Back')}</button>
      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Code2 size={20} /> {t('مساحة عمل الكود', 'Code Workspace')}</h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>{t('كتابة، شرح، تصحيح، أو تحويل كود بمساعدة الذكاء الاصطناعي.', 'Generate, explain, debug, or convert code with AI assistance.')}</p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {Object.entries(ACTIONS).map(([key, labels]) => (
            <button key={key} className={`settings-style-chip ${action === key ? 'active' : ''}`} onClick={() => setAction(key)} style={{ flex: 1, minWidth: 100 }}>{lang === 'en' ? labels.en : labels.ar}</button>
          ))}
        </div>
        {action !== 'generate' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {files.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  value={f.name} onChange={(e) => updateFileName(idx, e.target.value)}
                  onClick={() => setActiveFileIndex(idx)}
                  style={{
                    fontSize: 12, padding: '4px 8px', borderRadius: 6, width: 90,
                    background: activeFileIndex === idx ? 'rgba(var(--accent-rgb), 0.2)' : 'var(--bg-input-2)',
                    border: '1px solid var(--border-input)', color: 'var(--text-primary)',
                  }}
                />
                {files.length > 1 && <button className="icon-btn" style={{ width: 20, height: 20 }} onClick={() => removeFile(idx)}>×</button>}
              </div>
            ))}
            <button className="settings-inline-btn" onClick={addFile}>+ {t('ملف', 'file')}</button>
          </div>
        )}
        <textarea
          className="settings-textarea" rows={8}
          value={action === 'generate' ? files[0].content : files[activeFileIndex].content}
          onChange={(e) => updateFileContent(action === 'generate' ? 0 : activeFileIndex, e.target.value)}
          style={{ fontFamily: 'monospace' }}
          placeholder={action === 'generate' ? t('اكتب وصف الكود يلي بدك...', 'Describe the code you want...') : t(`الصق كود ملف "${files[activeFileIndex]?.name}" هون...`, `Paste "${files[activeFileIndex]?.name}" code here...`)}
        />
        {files.length > 1 && action !== 'generate' && (
          <p className="settings-hint" style={{ marginTop: 6, fontSize: 11.5 }}>
            {t('كل الملفات رح تُرسل مع بعض بنفس الطلب حتى يفهم Nexo السياق الكامل بينهم.', "All files will be sent together so Nexo understands the full context between them.")}
          </p>
        )}
        {error && <p className="settings-hint" style={{ color: '#f87171', marginTop: 12 }}><AlertCircle size={13} style={{ display: 'inline', marginInlineEnd: 4 }} />{error}</p>}
        <button className="settings-btn" onClick={handleRun} disabled={processing} style={{ marginTop: 16, maxWidth: 200 }}>
          {processing && <Loader2 size={14} className="nexo-code-spin" />} {processing ? t('جارِ المعالجة...', 'Processing...') : t('تشغيل', 'Run')}
        </button>
      </div>

      {result && result.status === 'completed' && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 className="settings-group-title" style={{ margin: 0 }}>{t('النتيجة', 'Result')}</h4>
            <button className="icon-btn" onClick={() => handleCopy(result.result_text)}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, fontFamily: 'monospace', background: 'var(--bg-input-2)', padding: 14, borderRadius: 8, overflow: 'auto' }}>{result.result_text}</pre>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>
      {loadingHistory ? <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p> : history.length === 0 ? <p className="settings-hint">{t('لا يوجد سجل بعد.', 'No history yet.')}</p> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((item) => (
            <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span onClick={() => setResult(item)} style={{ cursor: 'pointer', fontSize: 13.5 }}>{ACTIONS[item.action]?.[lang] || item.action} — {item.title}</span>
              <button className="icon-btn" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}