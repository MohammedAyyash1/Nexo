// PaymentProvider: الواجهة (Abstraction) اللي أي طريقة دفع لازم تطبّقها
// النسخة الوحيدة المطبّقة حاليًا: ManualPaymentProvider
// مستقبلًا: JawwalPayProvider أو BankOfPalestineProvider بيطبّقوا نفس الدوال بالضبط

export class PaymentProvider {
  async createRequest(userId, planId, paymentMethod) {
    throw new Error('createRequest not implemented');
  }
  async submitProof(requestId, referenceNumber, proofUrl) {
    throw new Error('submitProof not implemented');
  }
  async reviewRequest(requestId, decision, adminNote, actorId) {
    throw new Error('reviewRequest not implemented');
  }
  async refund(requestId, adminNote, actorId) {
    throw new Error('refund not implemented');
  }
}