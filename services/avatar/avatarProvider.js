// AvatarProvider: الواجهة (Abstraction) اللي أي مزوّد توليد أفاتار لازم يطبّقها
// النسخة الوحيدة المطبّقة حاليًا: DidAvatarProvider
// مستقبلًا: HeyGenAvatarProvider أو غيره بيطبّق نفس الدوال بالضبط

export class AvatarProvider {
  async createJob(imageUrl, scriptText) {
    throw new Error('createJob not implemented');
  }
  async checkStatus(providerJobId) {
    throw new Error('checkStatus not implemented');
  }
}