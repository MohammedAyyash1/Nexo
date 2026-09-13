import { supabase } from './supabaseClient.js';
import { PaymentProvider } from './paymentProvider.js';

const VALID_PAYMENT_METHODS = ['bank_transfer', 'jawwal_pay', 'palpay'];

export class ManualPaymentProvider extends PaymentProvider {
  // إنشاء طلب دفع جديد - السعر والعملة يُجلبان من plans حصريًا، لا يُقبلان من الـFrontend أبدًا
  async createRequest(userId, planId, paymentMethod) {
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error('invalid_payment_method');
    }

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error('plan_not_found');
    }
    if (!plan.is_active) {
      throw new Error('plan_not_active');
    }

    // Snapshot: نأخذ السعر والعملة من plans وقت الإنشاء فقط
    const { data: request, error: insertError } = await supabase
      .from('payment_requests')
      .insert({
        user_id: userId,
        plan_id: planId,
        amount_minor: plan.price_amount_minor,
        currency: plan.currency,
        payment_method: paymentMethod,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('createRequest error:', insertError);
      throw new Error('failed_to_create_request');
    }

    await supabase.from('payment_request_events').insert({
      payment_request_id: request.id,
      event_type: 'created',
      from_status: null,
      to_status: 'pending',
      actor_type: 'user',
      actor_id: userId,
    });

    return request;
  }

  // إرسال إثبات الدفع (رقم مرجعي + رابط إثبات اختياري) - pending → submitted
  async submitProof(requestId, referenceNumber, proofUrl) {
    const { data, error } = await supabase.rpc('fn_submit_payment_proof', {
      p_request_id: requestId,
      p_reference_number: referenceNumber,
      p_proof_url: proofUrl || null,
    });

    if (error) {
      console.error('submitProof error:', error);
      throw new Error(error.message || 'failed_to_submit_proof');
    }

    return data;
  }

  // مراجعة الطلب (موافقة/رفض) - عملية ذرية بالكامل عبر RPC، idempotent
  async reviewRequest(requestId, decision, adminNote, actorId) {
    if (!['approve', 'reject'].includes(decision)) {
      throw new Error('invalid_decision');
    }

    const { data, error } = await supabase.rpc('fn_review_payment_request', {
      p_request_id: requestId,
      p_decision: decision,
      p_admin_note: adminNote || null,
      p_actor_id: actorId,
    });

    if (error) {
      console.error('reviewRequest error:', error);
      throw new Error(error.message || 'failed_to_review_request');
    }

    return data;
  }

  // استرجاع - paid → refunded، مع إلغاء الاشتراك المرتبط
  async refund(requestId, adminNote, actorId) {
    const { data, error } = await supabase.rpc('fn_refund_payment_request', {
      p_request_id: requestId,
      p_admin_note: adminNote || null,
      p_actor_id: actorId,
    });

    if (error) {
      console.error('refund error:', error);
      throw new Error(error.message || 'failed_to_refund_request');
    }

    return data;
  }
}