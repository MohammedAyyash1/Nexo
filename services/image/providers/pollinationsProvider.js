import { ImageProvider } from '../imageProvider.js';

const BASE_URL = 'https://image.pollinations.ai/prompt';

export class PollinationsImageProvider extends ImageProvider {
  supportsImageInput() {
    return false; // نسخة النص فقط - لا تدعم دمج/تعديل صور مدخلة
  }

  async generateImage(prompt, options = {}) {
    const { width = 1024, height = 1024 } = options;
    const url = `${BASE_URL}/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&safe=true`;

    const response = await fetch(url);
    if (!response.ok) {
      const err = new Error('Pollinations image generation failed');
      err.status = response.status;
      throw err;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, mimeType: 'image/jpeg' };
  }
}