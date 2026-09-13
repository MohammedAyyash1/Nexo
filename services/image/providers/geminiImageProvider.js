import { config } from '../../../config/env.js';
import { ImageProvider } from '../imageProvider.js';

// يبقى موجود جاهز لدمج/تعديل الصور المدخلة - بس يحتاج فوترة Gemini مفعّلة
export class GeminiImageProvider extends ImageProvider {
  supportsImageInput() {
    return true;
  }

  async generateImage(prompt, options = {}) {
    const { inputImages = [] } = options;
    const parts = [{ text: prompt }];
    for (const img of inputImages) {
      parts.push({ inline_data: { mime_type: img.mimetype, data: img.buffer.toString('base64') } });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${config.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
      }
    );
    const data = await response.json();
    if (data.error) {
      const err = new Error(data.error.message || 'Gemini image generation failed');
      err.providerBody = data.error;
      throw err;
    }
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inline_data || p.inlineData);
    const imageData = imagePart?.inline_data || imagePart?.inlineData;
    if (!imageData) throw new Error('no_image_generated');
    return { buffer: Buffer.from(imageData.data, 'base64'), mimeType: imageData.mime_type || imageData.mimeType || 'image/png' };
  }
}