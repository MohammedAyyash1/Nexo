import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Layers, ArrowRight, RotateCw, Inbox } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function FlashcardsPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [currentSet, setCurrentSet] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/flashcards`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.sets || []))
      .catch((err) => { console.error(err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };
  useEffect(() => { loadHistory(); }, []);

  const handleGenerate = () => {
    setError('');
    if (!topic.trim()) { setError(t('الرجاء إدخال موضوع', 'Please enter a topic')); return; }
    setGenerating(true);
    fetch(`${BASE}/flashcards/generate`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ topic: topic.trim(), lang }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setCurrentSet(data.set); setCardIndex(0); setFlipped(false);
        setHistory((prev) => [data.set, ...prev]);
        setTopic('');
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setGenerating(false));
  };

  const handleLoad = (item) => { setCurrentSet(item); setCardIndex(0); setFlipped(false); };
  const nextCard = () => { setFlipped(false); setCardIndex((i) => Math.min(i + 1, currentSet.cards.length - 1)); };
  const prevCard = () => { setFlipped(false); setCardIndex((i) => Math.max(i - 1, 0)); };

  const handleDelete = (id) => {
    fetch(`${BASE}/flashcards/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory((prev) => prev.filter((h) => h.id !== id)); if (currentSet?.id === id) setCurrentSet(null); })
      .catch((err) => console.error(err));
  };
  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل المجموعات نهائيًا؟', 'Delete all sets permanently?'))) return;
    fetch(`${BASE}/flashcards`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setCurrentSet(null); })
      .catch((err) => console.error(err));
  };

  const card = currentSet?.cards?.[cardIndex];

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner" style={{ maxWidth: 700 }}>
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Layers size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('البطاقات التعليمية', 'Flashcards')}</h1>
          <p className="nexo-tool-page-desc">{t('اكتب موضوعًا وسيولّد Nexo بطاقات تعليمية للمذاكرة.', 'Enter a topic and Nexo will generate study flashcards.')}</p>
        </div>
      </div>

      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />
        <input className="nexo-input" dir="auto" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('مثلاً: عناصر الجدول الدوري', 'e.g. Periodic table elements')} />
        {error && <div className="nexo-inline-error"><AlertCircle size={13} />{error}</div>}
        <button className="nexo-btn nexo-btn-primary" onClick={handleGenerate} disabled={generating} style={{ marginTop: 18, minWidth: 200 }}>
          {generating && <Loader2 size={14} className="nexo-spin" />} {generating ? t('جارِ التوليد...', 'Generating...') : t('توليد البطاقات', 'Generate Cards')}
        </button>
      </div>

      {card && (
        <div style={{ marginBottom: 28 }}>
          <div className={`nexo-flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((f) => !f)} dir="auto">
            <span className="nexo-flashcard-side-label">{flipped ? t('الجواب', 'Answer') : t('السؤال', 'Question')}</span>
            <div className="nexo-flashcard-text">{flipped ? card.back : card.front}</div>
            <span className="nexo-flashcard-hint"><RotateCw size={11} /> {t('اضغط للقلب', 'Tap to flip')}</span>
          </div>

          <p className="nexo-list-item-sub" style={{ textAlign: 'center', margin: '12px 0' }}>{cardIndex + 1} / {currentSet.cards.length}</p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="nexo-btn nexo-btn-secondary" onClick={prevCard} disabled={cardIndex === 0} style={{ flex: 1 }}>{t('السابق', 'Previous')}</button>
            <button className="nexo-btn nexo-btn-secondary" onClick={nextCard} disabled={cardIndex === currentSet.cards.length - 1} style={{ flex: 1 }}>{t('التالي', 'Next')}</button>
          </div>
        </div>
      )}

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('مجموعاتك', 'Your Sets')}</h3>
        {history.length > 0 && <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>

      {loadingHistory ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
        </div>
      ) : historyError ? (
        <div className="nexo-card">
          <div className="nexo-state nexo-state-error">
            <div className="nexo-state-icon"><AlertCircle size={20} /></div>
            <div className="nexo-state-title">{t('تعذّر تحميل المجموعات', 'Could not load sets')}</div>
            <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={loadHistory}>{t('إعادة المحاولة', 'Retry')}</button>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="nexo-card">
          <div className="nexo-state">
            <div className="nexo-state-icon"><Inbox size={20} /></div>
            <div className="nexo-state-title">{t('لا يوجد مجموعات بعد', 'No sets yet')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main" onClick={() => handleLoad(item)} style={{ cursor: 'pointer' }}>
                <div className="nexo-list-item-title" dir="auto">{item.title}</div>
                <span className="nexo-list-item-sub">{item.cards?.length || 0} {t('بطاقة', 'cards')}</span>
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