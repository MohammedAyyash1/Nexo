import { useState, useEffect } from 'react';
import { ShieldAlert, Clock, Eye, Check, X, RotateCcw } from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const BASE = `${API_BASE}/api/v1/payments`;

const STATUS_LABEL = {
  pending: 'قيد الانتظار', submitted: 'تم إرسال الإثبات', under_review: 'قيد المراجعة',
  paid: 'مقبول', rejected: 'مرفوض', refunded: 'مسترجع',
};

function formatPrice(amountMinor, currency) {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

export function AdminPaymentsPage() {
  const [requests, setRequests] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // تفاصيل الطلب المفتوح حاليًا
  const [rejectNote, setRejectNote] = useState('');
  const [actionError, setActionError] = useState('');

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const loadList = () => {
    setLoading(true);
    fetch(`${BASE}/admin/requests`, { headers: authHeaders() })
      .then(async (res) => {
        if (res.status === 403) { setForbidden(true); return; }
        const body = await res.json();
        if (body.success) setRequests(body.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadList(); }, []);

  const openDetails = (id) => {
    setActionError('');
    setRejectNote('');
    fetch(`${BASE}/admin/requests/${id}`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((body) => { if (body.success) setSelected(body.data); })
      .catch(() => {});
  };

  const runAction = (url, body) => {
    setActionError('');
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body || {}),
    })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok || !result.success) {
          setActionError(result.error || 'حدث خطأ ما');
          return;
        }
        openDetails(selected.id); // تحديث التفاصيل من الـBackend مباشرة
        loadList();
      })
      .catch(() => setActionError('خطأ بالاتصال'));
  };

  if (forbidden) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-primary)' }}>
        <ShieldAlert size={40} style={{ marginBottom: 12 }} />
        <h2>غير مصرح لك بالوصول لهذه الصفحة</h2>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>جارِ التحميل...</div>;
  }

  return (
    <div style={{ padding: 40, color: 'var(--text-primary)' }}>
      <h1 style={{ marginBottom: 24 }}>طلبات الدفع</h1>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'right', borderBottom: '1px solid var(--border-color, #333)' }}>
            <th style={{ padding: 8 }}>المستخدم</th>
            <th style={{ padding: 8 }}>الخطة</th>
            <th style={{ padding: 8 }}>المبلغ</th>
            <th style={{ padding: 8 }}>طريقة الدفع</th>
            <th style={{ padding: 8 }}>الرقم المرجعي</th>
            <th style={{ padding: 8 }}>التاريخ</th>
            <th style={{ padding: 8 }}>الحالة</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color, #222)' }}>
              <td style={{ padding: 8 }}>{r.user_email || r.user_id}</td>
              <td style={{ padding: 8 }}>{r.plan_name}</td>
              <td style={{ padding: 8 }}>{formatPrice(r.amount_minor, r.currency)}</td>
              <td style={{ padding: 8 }}>{r.payment_method}</td>
              <td style={{ padding: 8 }}>{r.reference_number || '—'}</td>
              <td style={{ padding: 8, fontSize: 12 }}>{new Date(r.created_at).toLocaleString('ar')}</td>
              <td style={{ padding: 8 }}>{STATUS_LABEL[r.status]}</td>
              <td style={{ padding: 8 }}>
                <button className="icon-btn" onClick={() => openDetails(r.id)} title="عرض">
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#141420', borderRadius: 10, padding: 24, maxWidth: 440, width: '90%', color: 'var(--text-primary)' }}
          >
            <h3 style={{ marginBottom: 6 }}>{selected.user_email}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>
              {selected.plan_name} — {formatPrice(selected.amount_minor, selected.currency)} — {selected.payment_method}
            </p>
            <p style={{ marginBottom: 6 }}>الرقم المرجعي: {selected.reference_number || '—'}</p>
            <p style={{ marginBottom: 14 }}>الحالة الحالية: <strong>{STATUS_LABEL[selected.status]}</strong></p>

            {selected.proof_signed_url && (
              <a href={selected.proof_signed_url} target="_blank" rel="noreferrer" style={{ color: '#a78bfa', display: 'block', marginBottom: 14 }}>
                عرض إثبات الدفع
              </a>
            )}

            {actionError && <p style={{ color: '#f87171', marginBottom: 10 }}>{actionError}</p>}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selected.status === 'submitted' && (
                <button className="settings-btn" onClick={() => runAction(`${BASE}/admin/requests/${selected.id}/start-review`)}>
                  <Clock size={14} /> بدء المراجعة
                </button>
              )}

              {['submitted', 'under_review'].includes(selected.status) && (
                <button
                  className="settings-btn"
                  onClick={() => runAction(`${BASE}/requests/${selected.id}/review`, { decision: 'approve' })}
                >
                  <Check size={14} /> موافقة
                </button>
              )}

              {['submitted', 'under_review'].includes(selected.status) && (
                <>
                  <input
                    type="text"
                    className="settings-text-input"
                    placeholder="سبب الرفض (مطلوب)"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    style={{ width: '100%', marginTop: 8 }}
                  />
                  <button
                    className="settings-btn"
                    disabled={!rejectNote.trim()}
                    onClick={() => runAction(`${BASE}/requests/${selected.id}/review`, { decision: 'reject', adminNote: rejectNote.trim() })}
                  >
                    <X size={14} /> رفض
                  </button>
                </>
              )}

              {selected.status === 'paid' && (
                <button className="settings-btn" onClick={() => runAction(`${BASE}/requests/${selected.id}/refund`, { adminNote: 'استرجاع من لوحة الأدمن' })}>
                  <RotateCcw size={14} /> استرجاع
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}