import { config } from '../../../config/env.js';
import { TranslationProvider } from '../translationProvider.js';

const LANG_NAMES = { ar: 'Arabic', en: 'English' };
const UNCLEAR_TOKEN = '[[UNCLEAR]]';

export class GroqTranslationProvider extends TranslationProvider {
  async translateText(text, sourceLang, targetLang) {
    if (!text.trim()) return '';

    const prompt = `You are a real-time interpreter for a live voice call. Translate the following ${LANG_NAMES[sourceLang]} transcript segment to ${LANG_NAMES[targetLang]}.

Strict rules:
- Translate ONLY what is actually said. Never add, infer, or invent any information that is not explicitly present in the source text.
- Never paraphrase creatively or change the meaning, tone, or intent of the original sentence.
- Preserve names of people, places, organizations, numbers, dates, and technical terms exactly (transliterate names if needed, do not translate them into different names).
- If the source text is garbled, incomplete, just noise/filler sounds, or does not form a coherent sentence, respond with exactly: ${UNCLEAR_TOKEN}
- Do not answer questions, do not comment, do not add explanations, disclaimers, or quotation marks.
- Respond with ONLY the translated text (or the token above), nothing else.

Source (${LANG_NAMES[sourceLang]}):
${text.trim()}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });
    const data = await response.json();
    if (data.error) {
      const err = new Error(data.error.message || 'Translation failed');
      throw err;
    }

    const result = data.choices?.[0]?.message?.content?.trim() || '';
    // النموذج نفسه أعلن إن الكلام غير مفهوم/غير مكتمل — لا نُرجع أي نص بدل ما نخترع ترجمة
    if (!result || result.includes(UNCLEAR_TOKEN)) return '';
    return result;
  }
}