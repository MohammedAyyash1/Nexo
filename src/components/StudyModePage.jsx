import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertCircle, GraduationCap, ArrowRight, Upload, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function StudyModePage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const [inputMode, setInputMode] = useState('topic'); // topic | paste | file
  const [topic, setTopic] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/study/sessions`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.sessions || []))
      .catch((err) => { console.error('Load sessions error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const resetQuizState = () => { setQuizAnswers({}); setShowQuizResults(false); };

  const handleGenerate = () => {
    setError('');
    if (inputMode === 'topic' && !topic.trim()) { setError(t('الرجاء كتابة موضوع', 'Please enter a topic')); return; }
    if (inputMode === 'paste' && !pastedText.trim()) { setError(t('الرجاء لصق نص', 'Please paste text')); return; }
    if (inputMode === 'file' && !file) { setError(t('الرجاء رفع ملف', 'Please upload a file')); return; }

    setGenerating(true);
    resetQuizState();
    const formData = new FormData();
    formData.append('lang', lang);
    if (inputMode === 'topic') formData.append('topic', topic.trim());
    if (inputMode === 'paste') formData.append('pastedText', pastedText.trim());
    if (inputMode === 'file') formData.append('file', file);

    fetch(`${BASE}/study/generate`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setSession(data.session);
        setHistory((prev) => [data.session, ...prev]);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')))
      .finally(() => setGenerating(false));
  };

  const handleSelectAnswer = (qIndex, optionIndex) => {
    if (showQuizResults) return;
    setQuizAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleSubmitQuiz = () => setShowQuizResults(true);

  const score = session?.quiz?.length
    ? session.quiz.filter((q, i) => quizAnswers[i] === q.correctIndex).length
    : 0;

  const handleLoad = (item) => { setSession(item); resetQuizState(); };

  const handleDelete = (id) => {
    fetch(`${BASE}/study/sessions/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (session?.id === id) { setSession(null); resetQuizState(); }
      })
      .catch((err) => console.error('Delete session error:', err));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل الجلسات نهائيًا؟', 'Delete all sessions permanently?'))) return;
    fetch(`${BASE}/study/sessions`, { method: 'DELETE', headers: authHeaders() })
      .then(() => { setHistory([]); setSession(null); resetQuizState(); })
      .catch((err) => console.error('Delete all error:', err));
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setError(''); setFile(f); }
  };

  const INPUT_MODES = [
    { key: 'topic', labelAr: 'موضوع', labelEn: 'Topic' },
    { key: 'paste', labelAr: 'لصق نص', labelEn: 'Paste text' },
    { key: 'file', labelAr: 'رفع ملف', labelEn: 'Upload file' },
  ];

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><GraduationCap size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('وضع المذاكرة الذكي', 'AI Study Mode')}</h1>
          <p className="nexo-tool-page-desc">
            {t('أدخل موضوعًا، الصق نصًا، أو ارفع ملفًا، وسيولّد Nexo ملخصًا وأهم المفاهيم واختبارًا تفاعليًا.', 'Enter a topic, paste text, or upload a file, and Nexo will generate a summary, key concepts, and an interactive quiz.')}
          </p>
        </div>
      </div>

      {/* ===== منطقة الإدخال ===== */}
      <div className="nexo-card-luxe" style={{ marginBottom: 28 }}>
        <span className="nexo-glow-orb nexo-glow-orb-purple" style={{ width: 200, height: 200, top: -60, insetInlineEnd: -40 }} />

        <div className="nexo-tabs" style={{ marginBottom: 16 }}>
          {INPUT_MODES.map((mode) => (
            <button
              key={mode.key}
              className={`nexo-tab ${inputMode === mode.key ? 'active' : ''}`}
              onClick={() => setInputMode(mode.key)}
            >
              {lang === 'en' ? mode.labelEn : mode.labelAr}
            </button>
          ))}
        </div>

        {inputMode === 'topic' && (
          <input
            className="nexo-input" dir="auto"
            value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder={t('مثلاً: الثورة الصناعية، قواعد اللغة الإنجليزية...', 'e.g. The Industrial Revolution, English grammar rules...')}
          />
        )}
        {inputMode === 'paste' && (
          <textarea
            className="nexo-textarea" dir="auto" rows={6}
            value={pastedText} onChange={(e) => setPastedText(e.target.value)}
            placeholder={t('الصق نص المادة الدراسية هون...', 'Paste your study material here...')}
          />
        )}
        {inputMode === 'file' && (
          <label
            className={`nexo-dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          >
            <div className="nexo-dropzone-icon"><Upload size={22} /></div>
            {file ? (
              <>
                <span className="nexo-dropzone-text" dir="auto">{file.name}</span>
                <span className="nexo-dropzone-hint">{t('اضغط لاختيار ملف آخر', 'Click to choose a different file')}</span>
              </>
            ) : (
              <>
                <span className="nexo-dropzone-text">{t('اضغط لاختيار ملف، أو اسحبه وأفلته هون', 'Click to select a file, or drag and drop it here')}</span>
                <span className="nexo-dropzone-hint">PDF · DOCX</span>
              </>
            )}
            <input type="file" accept="application/pdf,.docx" onChange={(e) => { setError(''); setFile(e.target.files?.[0] || null); }} style={{ display: 'none' }} />
          </label>
        )}

        {error && (
          <div className="nexo-inline-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button className="nexo-btn nexo-btn-primary" onClick={handleGenerate} disabled={generating} style={{ marginTop: 18, minWidth: 200 }}>
          {generating && <Loader2 size={14} className="nexo-spin" />}
          {generating ? t('جارِ التوليد...', 'Generating...') : t('ابدأ المذاكرة', 'Start Studying')}
        </button>
      </div>

      {/* ===== الجلسة الحالية ===== */}
      {session && session.status === 'completed' && (
        <div style={{ marginBottom: 28 }}>
          <div className="nexo-card" style={{ marginBottom: 16 }}>
            <h4 className="nexo-card-row-title" dir="auto" style={{ marginBottom: 8 }}>{session.title}</h4>
            <p className="nexo-result-text" dir="auto" style={{ fontSize: 14 }}>{session.summary}</p>

            {session.key_concepts?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="nexo-section-title" style={{ marginBottom: 8, fontSize: 11 }}>{t('أهم المفاهيم', 'Key Concepts')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {session.key_concepts.map((c, i) => (
                    <span key={i} className="nexo-chip" dir="auto">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {session.quiz?.length > 0 && (
            <div className="nexo-card">
              <div className="nexo-card-row-header">
                <h4 className="nexo-card-row-title" style={{ margin: 0 }}>{t('اختبار سريع', 'Quick Quiz')}</h4>
                {showQuizResults && (
                  <span className="nexo-badge nexo-badge-accent" style={{ fontSize: 12.5, padding: '4px 12px' }}>{score}/{session.quiz.length}</span>
                )}
              </div>

              {session.quiz.map((q, qi) => (
                <div key={qi} style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }} dir="auto">{qi + 1}. {q.question}</p>
                  {q.options.map((opt, oi) => {
                    const isSelected = quizAnswers[qi] === oi;
                    const isCorrect = oi === q.correctIndex;
                    let stateClass = '';
                    if (showQuizResults) {
                      if (isCorrect) stateClass = 'correct';
                      else if (isSelected && !isCorrect) stateClass = 'incorrect';
                    } else if (isSelected) stateClass = 'selected';

                    return (
                      <div key={oi} className={`nexo-quiz-option ${stateClass}`} onClick={() => handleSelectAnswer(qi, oi)} dir="auto">
                        {showQuizResults && isCorrect && <CheckCircle2 size={14} color="var(--color-success)" />}
                        {showQuizResults && isSelected && !isCorrect && <XCircle size={14} color="var(--color-error)" />}
                        {opt}
                      </div>
                    );
                  })}
                  {showQuizResults && q.explanation && (
                    <p className="nexo-list-item-sub" dir="auto" style={{ marginTop: 6 }}>ℹ️ {q.explanation}</p>
                  )}
                </div>
              ))}

              {!showQuizResults && (
                <button className="nexo-btn nexo-btn-primary" onClick={handleSubmitQuiz}>
                  {t('عرض النتيجة', 'Show Results')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== الجلسات السابقة ===== */}
      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('جلسات سابقة', 'Previous Sessions')}</h3>
        {history.length > 0 && (
          <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>
            {t('مسح الكل', 'Clear all')}
          </button>
        )}
      </div>

      {loadingHistory ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />
          ))}
        </div>
      ) : historyError ? (
        <div className="nexo-card">
          <div className="nexo-state nexo-state-error">
            <div className="nexo-state-icon"><AlertCircle size={20} /></div>
            <div className="nexo-state-title">{t('تعذّر تحميل الجلسات', 'Could not load sessions')}</div>
            <div className="nexo-state-desc">{t('تأكد من اتصالك وحاول مرة أخرى.', 'Check your connection and try again.')}</div>
            <button className="nexo-btn nexo-btn-secondary nexo-btn-sm" onClick={loadHistory}>{t('إعادة المحاولة', 'Retry')}</button>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="nexo-card">
          <div className="nexo-state">
            <div className="nexo-state-icon"><Inbox size={20} /></div>
            <div className="nexo-state-title">{t('لا يوجد جلسات بعد', 'No sessions yet')}</div>
            <div className="nexo-state-desc">{t('ابدأ أول جلسة مذاكرة فوق.', 'Start your first study session above.')}</div>
          </div>
        </div>
      ) : (
        <ul className="nexo-list">
          {history.map((item) => (
            <li key={item.id} className="nexo-list-item">
              <div className="nexo-list-item-main" onClick={() => handleLoad(item)} style={{ cursor: 'pointer' }}>
                <div className="nexo-list-item-title" dir="auto">{item.title}</div>
              </div>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDelete(item.id)} title={t('حذف', 'Delete')}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
     </div>
    </div>
  );
}