import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Moon, Trash2, AlertCircle, Info, Plus, Minus, Inbox } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

const numField = (val) => (val === '' ? 0 : parseFloat(val) || 0);

function Stepper({ value, onChange, label, hint }) {
  return (
    <div className="nexo-settings-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>{label}</div>
        {hint && <div className="nexo-settings-desc" style={{ fontSize: 11.5, margin: 0 }}>{hint}</div>}
      </div>
      <div className="nexo-stepper">
        <button className="nexo-stepper-btn" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}><Minus size={14} /></button>
        <span className="nexo-stepper-value">{value}</span>
        <button className="nexo-stepper-btn" onClick={() => onChange(value + 1)}><Plus size={14} /></button>
      </div>
    </div>
  );
}

export function IslamicCalculatorPage() {
  const navigate = useNavigate();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const authHeadersJson = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

  const [tab, setTab] = useState('zakat');

  const [zForm, setZForm] = useState({ totalWealth: '', debts: '', nisabValue: '' });
  const [zResult, setZResult] = useState(null);
  const [zError, setZError] = useState('');

  const [iForm, setIForm] = useState({ estateValue: '', hasHusband: false, wivesCount: 0, sonsCount: 0, daughtersCount: 0, fatherAlive: false, motherAlive: false, fullBrothersCount: 0, fullSistersCount: 0 });
  const [iResult, setIResult] = useState(null);
  const [iError, setIError] = useState('');

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError(false);
    fetch(`${BASE}/islamic/history?type=${tab}`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.items || []))
      .catch((err) => { console.error('Load history error:', err); setHistoryError(true); })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { setLoadingHistory(true); loadHistory(); }, [tab]);

  const handleZakatCalculate = () => {
    setZError('');
    if (!zForm.totalWealth || numField(zForm.totalWealth) <= 0) {
      setZError(t('الرجاء إدخال إجمالي أموالك', 'Please enter your total wealth'));
      return;
    }
    const payload = {
      totalWealth: numField(zForm.totalWealth),
      debts: numField(zForm.debts),
      nisabValue: zForm.nisabValue === '' ? null : numField(zForm.nisabValue),
    };
    fetch(`${BASE}/islamic/zakat`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify(payload) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setZError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setZResult(data.calculation.result);
        setHistory((prev) => [data.calculation, ...prev]);
      })
      .catch(() => setZError(t('خطأ بالاتصال', 'Connection error')));
  };

  const handleInheritanceCalculate = () => {
    setIError('');
    if (!iForm.estateValue || numField(iForm.estateValue) <= 0) {
      setIError(t('قيمة التركة مطلوبة', 'Estate value is required'));
      return;
    }
    fetch(`${BASE}/islamic/inheritance`, { method: 'POST', headers: authHeadersJson(), body: JSON.stringify({ ...iForm, estateValue: numField(iForm.estateValue) }) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setIError(data.error || t('حدث خطأ ما', 'Something went wrong')); return; }
        setIResult(data.calculation.result);
        setHistory((prev) => [data.calculation, ...prev]);
      })
      .catch(() => setIError(t('خطأ بالاتصال', 'Connection error')));
  };

  const handleDeleteAll = () => {
    if (!window.confirm(t('حذف كل سجل هذا القسم؟', 'Delete all history in this section?'))) return;
    fetch(`${BASE}/islamic/history?type=${tab}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setHistory([]))
      .catch((err) => console.error('Delete all error:', err));
  };

  const handleDeleteOne = (id) => {
    fetch(`${BASE}/islamic/history/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => setHistory((prev) => prev.filter((h) => h.id !== id)))
      .catch((err) => console.error('Delete error:', err));
  };

  return (
    <div className="nexo-tool-page">
     <div className="nexo-tool-page-inner">
      <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowRight size={15} /> {t('رجوع', 'Back')}
      </button>

      <div className="nexo-tool-page-header">
        <div className="nexo-tool-icon-hero"><Moon size={24} /></div>
        <div>
          <h1 className="nexo-tool-page-title">{t('حاسبة الزكاة والمواريث', 'Zakat & Inheritance Calculator')}</h1>
          <p className="nexo-tool-page-desc">
            {t('أداة مجانية بالكامل. الأداة بسيطة: أدخل المبالغ الأساسية بس، والباقي عليها.', "A fully free tool. Just enter the basic amounts — we'll handle the rest.")}
          </p>
        </div>
      </div>

      <div className="nexo-tabs" style={{ marginBottom: 20, maxWidth: 320 }}>
        <button className={`nexo-tab ${tab === 'zakat' ? 'active' : ''}`} onClick={() => setTab('zakat')}>
          {t('الزكاة', 'Zakat')}
        </button>
        <button className={`nexo-tab ${tab === 'inheritance' ? 'active' : ''}`} onClick={() => setTab('inheritance')}>
          {t('المواريث', 'Inheritance')}
        </button>
      </div>

      {tab === 'zakat' ? (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <p className="nexo-settings-desc" style={{ marginBottom: 16 }}>
            {t('أدخل 3 أرقام فقط، وسنحسب لك زكاتك.', "Just enter 3 numbers, and we'll calculate your zakat.")}
          </p>

          <div className="nexo-field">
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('1) إجمالي أموالك (نقد + ذهب وفضة وأي استثمارات، بقيمتها اليوم بالسوق)', "1) Your total wealth (cash + gold/silver + any investments, at today's market value)")}
            </label>
            <input type="number" className="nexo-input" value={zForm.totalWealth} onChange={(e) => setZForm({ ...zForm, totalWealth: e.target.value })} placeholder={t('مثلاً: 15000', 'e.g. 15000')} />
          </div>

          <div className="nexo-field">
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('2) ديون عليك (إن وُجدت، تُخصم قبل الحساب)', '2) Debts you owe (if any, deducted before calculation)')}
            </label>
            <input type="number" className="nexo-input" value={zForm.debts} onChange={(e) => setZForm({ ...zForm, debts: e.target.value })} placeholder="0" />
          </div>

          <div className="nexo-field" style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('3) قيمة نصاب الزكاة الحالية بعملتك (اختياري)', "3) Current zakat nisab threshold in your currency (optional)")}
            </label>
            <input type="number" className="nexo-input" value={zForm.nisabValue} onChange={(e) => setZForm({ ...zForm, nisabValue: e.target.value })} placeholder={t('اتركه فاضي إذا ما تعرفه', "Leave empty if you don't know it")} />
            <p className="nexo-settings-desc" style={{ fontSize: 11, marginTop: 4 }}>
              {t('لا تعرف القيمة؟ ابحث بجوجل عن "سعر نصاب الزكاة اليوم" وحطه هون. إذا تركته فاضي، رح نعرضلك فقط مقدار 2.5% من أموالك، وأنت تقرر إذا بلغت النصاب.', 'Don\'t know it? Search "today\'s zakat nisab value" and enter it. If left empty, we\'ll just show you 2.5% of your wealth, and you decide if you\'ve reached the nisab.')}
            </p>
          </div>

          {zError && <div className="nexo-inline-error" style={{ marginTop: 0 }}><AlertCircle size={13} />{zError}</div>}

          <button className="nexo-btn nexo-btn-primary" onClick={handleZakatCalculate} style={{ marginTop: 16, minWidth: 200 }}>
            {t('احسب الزكاة', 'Calculate Zakat')}
          </button>

          {zResult && (
            <div className="nexo-subcard" style={{ marginTop: 20, marginBottom: 0 }}>
              <div className="nexo-settings-row"><span className="nexo-settings-row-label">{t('الصافي بعد الديون', 'Net after debts')}</span><span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{zResult.netWealth}</span></div>
              {zResult.hasNisabInfo && (
                <div className="nexo-settings-row" style={{ marginTop: 8 }}><span className="nexo-settings-row-label">{t('قيمة النصاب', 'Nisab value')}</span><span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{zResult.nisabValue}</span></div>
              )}
              <div className="nexo-settings-row" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                  {zResult.hasNisabInfo ? (zResult.isDue ? t('الزكاة الواجبة', 'Zakat due') : t('لا تجب الزكاة (أقل من النصاب)', 'No zakat due (below nisab)')) : t('2.5% من أموالك (تحقق أنت من بلوغ النصاب)', '2.5% of your wealth (verify nisab yourself)')}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--accent-2)', fontSize: 18 }}>
                  {zResult.hasNisabInfo && !zResult.isDue ? '—' : zResult.zakatAmount}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="nexo-card" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 8, padding: 10, borderRadius: 8, background: 'rgba(var(--accent-rgb), 0.1)', marginBottom: 16, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{t('للاسترشاد فقط. أدخل فقط من هو على قيد الحياة من الورثة. راجع شيخًا أو محكمة شرعية قبل أي توزيع فعلي.', 'For guidance only. Enter only heirs who are alive. Consult a scholar or Sharia court before actual distribution.')}</span>
          </div>

          <div className="nexo-field">
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('قيمة التركة الإجمالية', 'Total estate value')}</label>
            <input type="number" className="nexo-input" value={iForm.estateValue} onChange={(e) => setIForm({ ...iForm, estateValue: e.target.value })} placeholder={t('مثلاً: 100000', 'e.g. 100000')} />
          </div>

          <h4 className="nexo-card-row-title" style={{ fontSize: 13, marginBottom: 4 }}>{t('الزوج/الزوجة', 'Spouse')}</h4>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, padding: '8px 0', color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={iForm.hasHusband} onChange={(e) => setIForm({ ...iForm, hasHusband: e.target.checked })} /> {t('يوجد زوج للمتوفاة', 'Husband exists (if deceased was female)')}
          </label>
          <Stepper value={iForm.wivesCount} onChange={(v) => setIForm({ ...iForm, wivesCount: v })} label={t('عدد الزوجات (للمتوفى)', 'Number of wives (if deceased was male)')} />

          <h4 className="nexo-card-row-title" style={{ fontSize: 13, marginTop: 16, marginBottom: 4 }}>{t('الأبناء', 'Children')}</h4>
          <Stepper value={iForm.sonsCount} onChange={(v) => setIForm({ ...iForm, sonsCount: v })} label={t('عدد الأبناء (ذكور)', 'Number of sons')} />
          <Stepper value={iForm.daughtersCount} onChange={(v) => setIForm({ ...iForm, daughtersCount: v })} label={t('عدد البنات', 'Number of daughters')} />

          <h4 className="nexo-card-row-title" style={{ fontSize: 13, marginTop: 16, marginBottom: 4 }}>{t('الوالدان', 'Parents')}</h4>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, padding: '8px 0', color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={iForm.fatherAlive} onChange={(e) => setIForm({ ...iForm, fatherAlive: e.target.checked })} /> {t('الأب على قيد الحياة', 'Father is alive')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, padding: '8px 0', color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={iForm.motherAlive} onChange={(e) => setIForm({ ...iForm, motherAlive: e.target.checked })} /> {t('الأم على قيد الحياة', 'Mother is alive')}
          </label>

          <h4 className="nexo-card-row-title" style={{ fontSize: 13, marginTop: 16, marginBottom: 4 }}>{t('الإخوة الأشقاء', 'Full siblings')}</h4>
          <p className="nexo-settings-desc" style={{ fontSize: 11.5, marginBottom: 4 }}>{t('يُحسبون فقط إن لم يوجد أب أو ابن للمتوفى', 'Only counted if there is no father or son')}</p>
          <Stepper value={iForm.fullBrothersCount} onChange={(v) => setIForm({ ...iForm, fullBrothersCount: v })} label={t('عدد الإخوة الأشقاء (ذكور)', 'Number of full brothers')} />
          <Stepper value={iForm.fullSistersCount} onChange={(v) => setIForm({ ...iForm, fullSistersCount: v })} label={t('عدد الأخوات الشقيقات', 'Number of full sisters')} />

          {iError && <div className="nexo-inline-error"><AlertCircle size={13} />{iError}</div>}

          <button className="nexo-btn nexo-btn-primary" onClick={handleInheritanceCalculate} style={{ marginTop: 16, minWidth: 200 }}>
            {t('احسب المواريث', 'Calculate Inheritance')}
          </button>

          {iResult && (
            <div className="nexo-subcard" style={{ marginTop: 20, marginBottom: 0 }}>
              {Object.values(iResult.shares).map((s, i) => (
                <div key={i} className="nexo-settings-row" style={{ marginBottom: 6 }}>
                  <span className="nexo-settings-row-label">{s.label}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{(s.fraction * 100).toFixed(2)}% — {s.amount}</span>
                </div>
              ))}
              {iResult.notes?.map((n, i) => (
                <p key={i} className="nexo-settings-desc" style={{ marginTop: 8, fontSize: 12 }}>ℹ️ {n}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="nexo-tool-page-header" style={{ marginBottom: 14 }}>
        <h3 className="nexo-section-title" style={{ margin: 0 }}>{t('السجل', 'History')}</h3>
        {history.length > 0 && (
          <button className="nexo-btn nexo-btn-ghost nexo-btn-sm" onClick={handleDeleteAll} style={{ color: 'var(--color-error)', marginInlineStart: 'auto' }}>{t('مسح الكل', 'Clear all')}</button>
        )}
      </div>
      {loadingHistory ? (
        <div className="nexo-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1].map((i) => <div key={i} className="nexo-skeleton nexo-skeleton-line w-60" />)}
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
              <span className="nexo-list-item-sub">{new Date(item.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'ar-EG')}</span>
              <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={() => handleDeleteOne(item.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
     </div>
    </div>
  );
}