import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, BookOpen, ArrowRight, Plus, Search } from 'lucide-react';
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
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [adding, setAdding] = useState(false);

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState('');

  const loadEntries = () => {
    fetch(`${BASE}/knowledge-base/entries`, { headers: authHeaders() })
      .then((res) => res.json()).then((data) => setEntries(data.entries || []))
      .catch((err) => console.error(err)).finally(() => setLoadingEntries(false));
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
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoKbSpin { to { transform: rotate(360deg); } } .nexo-kb-spin { animation: nexoKbSpin 1s linear infinite; }`}</style>
      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}><ArrowRight size={15} /> {t('رجوع', 'Back')}</button>
      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={20} /> {t('قاعدة معرفتي', 'My Knowledge Base')}</h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>{t('اجمع ملاحظاتك ومعلوماتك، واسأل Nexo عنها بأي وقت.', 'Collect your notes and information, and ask Nexo about them anytime.')}</p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h4 className="settings-group-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Search size={15} /> {t('اسأل قاعدة معرفتك', 'Ask your knowledge base')}</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="settings-text-input" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAsk()} placeholder={t('اكتب سؤالك هون...', 'Type your question here...')} />
          <button className="settings-btn" onClick={handleAsk} disabled={asking} style={{ maxWidth: 100 }}>{asking ? <Loader2 size={14} className="nexo-kb-spin" /> : t('اسأل', 'Ask')}</button>
        </div>
        {error && <p className="settings-hint" style={{ color: '#f87171', marginTop: 10 }}><AlertCircle size={13} style={{ display: 'inline', marginInlineEnd: 4 }} />{error}</p>}
        {answer && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--bg-input-2)' }}>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>{answer.answer}</p>
            {answer.sources?.length > 0 && (
              <p className="settings-hint" style={{ marginTop: 8, fontSize: 11.5 }}>{t('المصادر', 'Sources')}: {answer.sources.map((s) => s.title).join('، ')}</p>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('ملاحظاتك', 'Your Notes')}</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="settings-inline-btn" onClick={() => setShowAdd((s) => !s)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={13} /> {t('إضافة', 'Add')}</button>
          {entries.length > 0 && <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>{t('مسح الكل', 'Clear all')}</button>}
        </div>
      </div>

      {showAdd && (
        <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <input className="settings-text-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t('العنوان', 'Title')} style={{ marginBottom: 8 }} />
          <textarea className="settings-textarea" rows={4} value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder={t('المحتوى', 'Content')} />
          <button className="settings-btn" onClick={handleAdd} disabled={adding} style={{ marginTop: 10, maxWidth: 160 }}>{adding ? t('جارِ الحفظ...', 'Saving...') : t('حفظ الملاحظة', 'Save Note')}</button>
        </div>
      )}

      {loadingEntries ? <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p> : entries.length === 0 ? <p className="settings-hint">{t('لا يوجد ملاحظات بعد.', 'No notes yet.')}</p> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {entries.map((item) => (
            <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '12px 14px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{item.title}</span>
                <button className="icon-btn" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
              </div>
              <p className="settings-hint" style={{ margin: '4px 0 0', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}