import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, Layers, ArrowRight, RotateCw } from 'lucide-react';
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

  const loadHistory = () => {
    fetch(`${BASE}/flashcards`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.sets || []))
      .catch((err) => console.error(err))
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
    <div style={{ padding: '32px 40px', maxWidth: 700, margin: '0 auto', color: 'var(--text-primary)' }}>
      <style>{`@keyframes nexoFcSpin { to { transform: rotate(360deg); } } .nexo-fc-spin { animation: nexoFcSpin 1s linear infinite; }`}</style>
      <button className="settings-inline-btn" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>
      <h1 style={{ fontSize: 22, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Layers size={20} /> {t('البطاقات التعليمية', 'Flashcards')}</h1>
      <p className="settings-hint" style={{ marginBottom: 24 }}>{t('اكتب موضوعًا وسيولّد Nexo بطاقات تعليمية للمذاكرة.', 'Enter a topic and Nexo will generate study flashcards.')}</p>

      <div style={{ background: 'var(--bg-input-3)', borderRadius: 14, padding: 24, marginBottom: 32 }}>
        <input className="settings-text-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('مثلاً: عناصر الجدول الدوري', 'e.g. Periodic table elements')} />
        {error && <p className="settings-hint" style={{ color: '#f87171', marginTop: 12 }}><AlertCircle size={13} style={{ display: 'inline', marginInlineEnd: 4 }} />{error}</p>}
        <button className="settings-btn" onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, maxWidth: 200 }}>
          {generating && <Loader2 size={14} className="nexo-fc-spin" />} {generating ? t('جارِ التوليد...', 'Generating...') : t('توليد البطاقات', 'Generate Cards')}
        </button>
      </div>

      {card && (
        <div style={{ marginBottom: 32 }}>
          <div onClick={() => setFlipped((f) => !f)} style={{
            background: 'var(--bg-input-3)', borderRadius: 14, padding: 40, minHeight: 160,
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            cursor: 'pointer', fontSize: 16, fontWeight: 600, marginBottom: 10,
          }}>
            {flipped ? card.back : card.front}
          </div>
          <p className="settings-hint" style={{ textAlign: 'center', marginBottom: 12 }}>{t('اضغط للقلب', 'Tap to flip')} • {cardIndex + 1}/{currentSet.cards.length}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="settings-btn" onClick={prevCard} disabled={cardIndex === 0} style={{ flex: 1 }}>{t('السابق', 'Previous')}</button>
            <button className="settings-btn" onClick={nextCard} disabled={cardIndex === currentSet.cards.length - 1} style={{ flex: 1 }}>{t('التالي', 'Next')}</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="settings-group-title" style={{ margin: 0 }}>{t('مجموعاتك', 'Your Sets')}</h3>
        {history.length > 0 && <button className="settings-inline-btn" onClick={handleDeleteAll} style={{ color: '#f87171' }}>{t('مسح الكل', 'Clear all')}</button>}
      </div>
      {loadingHistory ? <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p> : history.length === 0 ? <p className="settings-hint">{t('لا يوجد مجموعات بعد.', 'No sets yet.')}</p> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((item) => (
            <li key={item.id} style={{ background: 'var(--bg-input-3)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span onClick={() => handleLoad(item)} style={{ cursor: 'pointer', fontSize: 13.5 }}>{item.title} ({item.cards?.length || 0})</span>
              <button className="icon-btn" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}