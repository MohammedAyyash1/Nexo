import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, BookOpen, ArrowRight, Plus, Search, Inbox } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function KnowledgeBasePage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [adding, setAdding] = useState(false);

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState('');

  const loadEntries = () => {
    setLoadingEntries(true);
    setEntriesError(false);
    fetch(`${BASE}/knowledge-base/entries`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setEntries(data.entries || []))
      .catch((err) => { console.error(err); setEntriesError(true); }).finally(() => setLoadingEntries(false));
  };
  useEffect(() => { loadEntries(); }, []);

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setAdding(true);
    fetch(`${BASE}/knowledge-base/entries`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim() }) })
      .then((res) => res.json())
      .then((data) => { if (data.entry) { setEntries((prev) => [data.entry, ...prev]); setNewTitle(''); setNewContent(''); setShowAdd(false); } })
      .catch((err) => console.error(err))
      .finally(() => setAdding(false));
  };

  const handleAsk = () => {
    setError(''); setAnswer(null);
    if (!question.trim()) { setError(t('الرجاء كتابة سؤال', 'Please enter a question')); return; }
    setAsking(true);
    fetch(`${BASE}/knowledge-base/ask`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ question: question.trim(), lang }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setAnswer(data);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setAsking(false));
  };

  const handleDelete = (id) => {
    fetch(`${BASE}/knowledge-base/entries/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setEntries((prev) => prev.filter((e) => e.id !== id)))
      .catch((err) => console.error(err));
  };
  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل الملاحظات نهائيًا؟', 'Delete all notes permanently?'))) return;
    fetch(`${BASE}/knowledge-base/entries`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setEntries([])).catch((err) => console.error(err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><BookOpen size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('قاعدة معرفتي', 'My Knowledge Base')}</h1>
          <p className="nexo-tool-page-desc">{t('اجمع ملاحظاتك ومعلوماتك، واسأل Nexo عنها بأي وقت.', 'Collect your notes and information, and ask Nexo about them anytime.')}</p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 24 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />
        <h4 className="nexo-card-row-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Search size={15} /> {t('اسأل قاعدة معرفتك', 'Ask your knowledge base')}
        </h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="nexo-input" dir="auto" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAsk()} placeholder={t('اكتب سؤالك هون...', 'Type your question here...')} />
          <button className="nexo-btn nexo-btn-primary" onClick={handleAsk} disabled={asking} style={{ minWidth: 90 }}>
            {asking ? <Loader2 size={14} className="nexo-spin" /> : t('اسأل', 'Ask')}
          </button>
        </div>
        {error && <div className="nexo-inline-error"><AlertCircle size={13} />{error}</div>}
        {answer && (
          <div className="nexo-subcard" style={{ marginTop: 14, marginBottom: 0 }}>
            <p className="nexo-result-text" dir="auto" style={{ margin: 0 }}>{answer.answer}</p>
            {answer.sources?.length > 0 && (
              <p className="nexo-list-item-sub" style={{ marginTop: 10 }}>{t('المصادر', 'Sources')}: {answer.sources.map((s) => s.title).join('، ')}</p>
            )}
          </div>
        )}
      </div>

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('ملاحظاتك', 'Your Notes')}</h3>
        <div style={{ display: 'flex', gap: 8, marginInlineStart: 'auto' }}>
          <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={() => setShowAdd((s) => !s)}><Plus size={13} /> {t('إضافة', 'Add')}</button>
          {entries.length > 0 && <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)' }}>{t('مسح الكل', 'Clear all')}</button>}
        </div>
      </div>

      {showAdd && (
        <div className="nexo-card" style={{ marginBottom: 16 }}>
          <div className="nexo-field">
            <input className="nexo-input" dir="auto" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t('العنوان', 'Title')} />
          </div>
          <textarea className="nexo-textarea" dir="auto" rows={4} value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder={t('المحتوى', 'Content')} />
          <button className="nexo-btn nexo-btn-primary" onClick={handleAdd} disabled={adding} style={{ marginTop: 12 }}>
            {adding && <Loader2 size={14} className="nexo-spin" />}
            {adding ? t('جارِ الحفظ...', 'Saving...') : t('حفظ الملاحظة', 'Save Note')}
          </button>
        </div>
      )}

      {loadingEntries ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
        </div>
      ) : entriesError ? (
        <div className="nexo-card">
          <div className="nexo-state nexo-state-error">
            <div className="nexo-state-icon"><AlertCircle size={20} /></div>
            <div className="nexo-state-title">{t('تعذّر تحميل الملاحظات', 'Could not load notes')}</div>
            <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={loadEntries}>{t('إعادة المحاولة', 'Retry')}</button>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="nexo-card">
          <div className="nexo-state">
            <div className="nexo-state-icon"><Inbox size={20} /></div>
            <div className="nexo-state-title">{t('لا يوجد ملاحظات بعد', 'No notes yet')}</div>
            <div className="nexo-state-desc">{t('ضيف أول ملاحظة وابدأ تسأل Nexo عنها.', 'Add your first note and start asking Nexo about it.')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {entries.map((item) => (
            <li key={item.id} className="nexo-list-item nexo-list-item-stacked">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className="nexo-list-item-title" dir="auto" style={{ fontWeight: 600 }}>{item.title}</span>
                <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
              </div>
              <p className="nexo-list-item-sub" dir="auto" style={{ margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{item.content}</p>
            </li>
          ))}
        </ul>
      )}
     </div>
    </div>
  );
}