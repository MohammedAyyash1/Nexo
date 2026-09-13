// ImageProvider: الواجهة (Abstraction) اللي أي مزوّد توليد صور لازم يطبّقها
// حاليًا: PollinationsImageProvider (مجاني، نص→صورة فقط) و GeminiImageProvider (يحتاج فوترة، يدعم دمج صور)
export class ImageProvider {
  async generateImage(prompt, options = {}) {
    throw new Error('generateImage not implemented');
  }
  supportsImageInput() {
    return false;
  }
}