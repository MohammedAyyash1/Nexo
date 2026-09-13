import { useState, useEffect } from 'react';
import {
  Building2, Wallet, Copy, Check, ArrowRight,
  Upload, X, Clock, CheckCircle2, XCircle, RotateCcw,
} from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const PLAN_ID = 'pro_monthly';

const PAYMENT_ACCOUNTS = {
  bank_transfer: '0597264238',
  palpay: '0597264238',
};

function formatPrice(amountMinor, currency) {
  return `${(amountMinor / 100).toFixed(2)} ₪`.replace('₪', currency === 'ILS' ? '₪' : currency);
}

const INTERVAL_LABEL = { ar: { monthly: 'شهريًا', yearly: 'سنويًا' }, en: { monthly: 'monthly', yearly: 'yearly' } };

const METHODS = [
  { id: 'bank_transfer', icon: Building2, labelAr: 'بنك فلسطين', labelEn: 'Bank of Palestine', descAr: 'تحويل بنكي', descEn: 'Bank transfer' },
  { id: 'palpay', icon: Wallet, labelAr: 'PalPay', labelEn: 'PalPay', descAr: 'محفظة إلكترونية', descEn: 'E-wallet' },
];

const STATUS_META = {
  pending: { labelAr: 'قيد الانتظار', labelEn: 'Pending', color: '#facc15', Icon: Clock },
  submitted: { labelAr: 'قيد المراجعة', labelEn: 'Under review', color: '#facc15', Icon: Clock },
  under_review: { labelAr: 'قيد المراجعة', labelEn: 'Under review', color: '#facc15', Icon: Clock },
  paid: { labelAr: 'مقبول', labelEn: 'Approved', color: '#4ade80', Icon: CheckCircle2 },
  rejected: { labelAr: 'مرفوض', labelEn: 'Rejected', color: '#f87171', Icon: XCircle },
  refunded: { labelAr: 'مسترجع', labelEn: 'Refunded', color: '#94a3b8', Icon: RotateCcw },
  canceled: { labelAr: 'تم الإلغاء', labelEn: 'Canceled', color: '#94a3b8', Icon: XCircle },
};

export function SubscribeFlow({ lang, showToast }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRequest, setMyRequest] = useState(null);
  const [step, setStep] = useState('method');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [copied, setCopied] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const notify = (msg) => (showToast ? showToast(msg) : null);

  const loadMyRequests = () => {
    fetch(`${API_BASE}/api/v1/payments/requests`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data.length > 0) {
          const active = body.data.find((r) => ['pending', 'submitted', 'under_review', 'paid'].includes(r.status));
          setMyRequest(active || body.data[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/payments/plans/${PLAN_ID}`)
      .then((res) => res.json())
      .then((body) => { if (body.success) setPlan(body.data); })
      .catch(() => setError(t('خطأ بالاتصال.', 'Connection error.')))
      .finally(() => setLoading(false));

    loadMyRequests();
  }, []);

  const handleSelectMethod = (methodId) => {
    setSelectedMethod(methodId);
    setStep('instructions');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(PAYMENT_ACCOUNTS[selectedMethod]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateRequest = () => {
    setError('');
    setBusy(true);
    fetch(`${API_BASE}/api/v1/payments/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ planId: PLAN_ID, paymentMethod: selectedMethod }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) { setError(body.error || t('حدث خطأ ما.', 'Something went wrong.')); return; }
        setMyRequest(body.data);
        setStep('confirm');
      })
      .catch(() => setError(t('خطأ بالاتصال.', 'Connection error.')))
      .finally(() => setBusy(false));
  };

  const handleSubmitProof = () => {
    if (!referenceNumber.trim()) { setError(t('رقم العملية مطلوب.', 'Transaction number is required.')); return; }
    setError('');
    setBusy(true);

    const formData = new FormData();
    formData.append('referenceNumber', referenceNumber.trim());
    if (proofFile) formData.append('file', proofFile);

    fetch(`${API_BASE}/api/v1/payments/requests/${myRequest.id}/proof`, {
      method: 'POST', headers: authHeaders(), body: formData,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) { setError(body.error || t('حدث خطأ ما.', 'Something went wrong.')); return; }
        notify(t('تم إرسال إثبات الدفع', 'Payment proof submitted'));
        loadMyRequests();
      })
      .catch(() => setError(t('خطأ بالاتصال.', 'Connection error.')))
      .finally(() => setBusy(false));
  };

  const handleChangeMethod = () => {
    if (!window.confirm(t('لم ترسل إثبات الدفع بعد. هل تريد تغيير طريقة الدفع؟', "You haven't submitted proof yet. Change payment method?"))) return;
    setBusy(true);
    fetch(`${API_BASE}/api/v1/payments/requests/${myRequest.id}/cancel`, { method: 'POST', headers: authHeaders() })
      .then((res) => res.json())
      .then((body) => {
        if (body.success) {
          setMyRequest(null);
          setSelectedMethod(null);
          setReferenceNumber('');
          setProofFile(null);
          setStep('method');
        }
      })
      .catch(() => setError(t('خطأ بالاتصال.', 'Connection error.')))
      .finally(() => setBusy(false));
  };

  if (loading) {
    return <p className="settings-hint">{t('جارِ التحميل...', 'Loading...')}</p>;
  }

  if (!plan) {
    return <p className="settings-hint" style={{ color: '#f87171' }}>{t('الخطة غير متاحة', 'Plan unavailable')}</p>;
  }

  if (myRequest && myRequest.status !== 'canceled' && myRequest.status !== 'rejected') {
    if (myRequest.status === 'pending' && step !== 'confirm') {
      if (step === 'method') { setSelectedMethod(myRequest.payment_method); setStep('confirm'); }
    }

    if (myRequest.status !== 'pending') {
      const meta = STATUS_META[myRequest.status];
      const Icon = meta.Icon;
      return (
        <div className="settings-section-body">
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: `${meta.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <Icon size={26} color={meta.color} />
            </div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: 17, marginBottom: 6 }}>
              {t('تم استلام طلب الدفع', 'Payment request received')}
            </h4>
            <p className="settings-hint" style={{ maxWidth: 320, margin: '0 auto 20px', lineHeight: 1.7 }}>
              {t('سنراجع العملية ونفعّل اشتراكك بعد التأكد من وصول المبلغ.', "We'll review it and activate your subscription once confirmed.")}
            </p>
            <div style={{
              background: 'var(--bg-input)', borderRadius: 10, padding: 16, textAlign: lang === 'en' ? 'left' : 'right', maxWidth: 320, margin: '0 auto',
            }}>
              <Row label={t('الخطة', 'Plan')} value={plan.name} />
              <Row label={t('المبلغ', 'Amount')} value={formatPrice(myRequest.amount_minor, myRequest.currency)} />
              <Row label={t('طريقة الدفع', 'Method')} value={METHODS.find((m) => m.id === myRequest.payment_method)?.[lang === 'en' ? 'labelEn' : 'labelAr']} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('الحالة', 'Status')}</span>
                <span style={{ background: `${meta.color}22`, color: meta.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {lang === 'en' ? meta.labelEn : meta.labelAr}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (step === 'method') {
    return (
      <div className="settings-section-body">
        <div style={{
          background: 'linear-gradient(135deg, rgba(var(--accent-1-rgb), 0.15), rgba(var(--accent-1-rgb), 0.03))',
          border: '1px solid rgba(var(--accent-1-rgb), 0.25)', borderRadius: 12, padding: 18, marginBottom: 20,
        }}>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 4 }}>{plan.name}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatPrice(plan.price_amount_minor, plan.currency)}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}> / {INTERVAL_LABEL[lang][plan.billing_interval]}</span>
          </div>
        </div>

        <h4 className="settings-group-title">{t('كيف تريد الدفع؟', 'How would you like to pay?')}</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {METHODS.map((m) => {
            const Icon = m.icon;
            const available = !!PAYMENT_ACCOUNTS[m.id];
            return (
              <button
                key={m.id}
                disabled={!available}
                onClick={() => available && handleSelectMethod(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)', cursor: available ? 'pointer' : 'not-allowed',
                  opacity: available ? 1 : 0.45, textAlign: lang === 'en' ? 'left' : 'right', width: '100%',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 8, background: 'rgba(139,92,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={18} color="var(--accent-2)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
                    {lang === 'en' ? m.labelEn : m.labelAr}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {available ? (lang === 'en' ? m.descEn : m.descAr) : t('غير متاح حاليًا', 'Not available yet')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="settings-hint" style={{ marginTop: 14, lineHeight: 1.7 }}>
          {t('ملاحظة: يمكنك أيضًا استخدام تطبيق جوال باي للتحويل إلى أي من الحسابين أعلاه.', 'Note: you can also use the Jawwal Pay app to transfer to either account above.')}
        </p>
      </div>
    );
  }

  if (step === 'instructions') {
    const method = METHODS.find((m) => m.id === selectedMethod);
    const Icon = method.icon;
    return (
      <div className="settings-section-body">
        <button onClick={() => setStep('method')} className="settings-inline-btn" style={{ marginBottom: 14, padding: 0 }}>
          <ArrowRight size={13} style={{ transform: lang === 'en' ? 'none' : 'rotate(180deg)' }} /> {t('رجوع', 'Back')}
        </button>

        <h4 className="settings-group-title">{t('ادفع', 'Pay')} {formatPrice(plan.price_amount_minor, plan.currency)}</h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px', color: 'var(--text-secondary)', fontSize: 13 }}>
          <Icon size={15} /> {lang === 'en' ? method.labelEn : method.labelAr}
        </div>

        <p className="settings-hint" style={{ marginBottom: 10 }}>{t('حوّل المبلغ إلى الحساب التالي:', 'Transfer the amount to the following account:')}</p>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          background: 'var(--bg-input-2)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 1, direction: 'ltr' }}>
            {PAYMENT_ACCOUNTS[selectedMethod]}
          </span>
          <button onClick={handleCopy} className="settings-btn" style={{ padding: '6px 12px', fontSize: 12 }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? t('تم النسخ', 'Copied') : t('نسخ', 'Copy')}
          </button>
        </div>

        {error && <p className="settings-hint" style={{ color: '#f87171', marginBottom: 10 }}>{error}</p>}

        <button className="settings-btn" onClick={handleCreateRequest} disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? t('جارِ المتابعة...', 'Processing...') : t('لقد حوّلت المبلغ →', "I've made the transfer →")}
        </button>
      </div>
    );
  }

  if (step === 'confirm' && myRequest && myRequest.status === 'pending') {
    const method = METHODS.find((m) => m.id === myRequest.payment_method);
    return (
      <div className="settings-section-body">
        <button onClick={handleChangeMethod} className="settings-inline-btn" style={{ marginBottom: 14, padding: 0 }} disabled={busy}>
          <ArrowRight size={13} style={{ transform: lang === 'en' ? 'none' : 'rotate(180deg)' }} /> {t('تغيير طريقة الدفع', 'Change payment method')}
        </button>

        <h4 className="settings-group-title">{t('أكّد عملية الدفع', 'Confirm your payment')}</h4>
        <p className="settings-hint" style={{ marginBottom: 16 }}>
          {formatPrice(myRequest.amount_minor, myRequest.currency)} — {method && (lang === 'en' ? method.labelEn : method.labelAr)}
        </p>

        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {t('رقم العملية', 'Transaction number')}
        </label>
        <input
          type="text" className="settings-text-input"
          placeholder={t('أدخل رقم العملية الموجود في إشعار التحويل', 'Enter the number from your transfer receipt')}
          value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label htmlFor="proof-upload" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          border: '1.5px dashed rgba(255,255,255,0.15)', borderRadius: 10, padding: '20px 12px',
          cursor: 'pointer', marginBottom: 16, textAlign: 'center',
        }}>
          {proofFile ? (
            <>
              <Upload size={20} color="#a78bfa" />
              <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{proofFile.name}</span>
              <button type="button" onClick={(e) => { e.preventDefault(); setProofFile(null); }} className="settings-inline-btn" style={{ padding: 0, fontSize: 12 }}>
                <X size={12} /> {t('إزالة', 'Remove')}
              </button>
            </>
          ) : (
            <>
              <Upload size={20} color="var(--text-secondary)" />
              <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{t('إرفاق صورة الإيصال', 'Attach receipt image')}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('اضغط لاختيار صورة (اختياري)', 'Tap to choose an image (optional)')}</span>
            </>
          )}
          <input id="proof-upload" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }} onChange={(e) => setProofFile(e.target.files[0] || null)} />
        </label>

        {error && <p className="settings-hint" style={{ color: '#f87171', marginBottom: 10 }}>{error}</p>}

        <button className="settings-btn" onClick={handleSubmitProof} disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? t('جارِ الإرسال...', 'Submitting...') : t('تأكيد الدفع', 'Confirm payment')}
        </button>
      </div>
    );
  }

  return null;
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}