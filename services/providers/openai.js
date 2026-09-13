import { config } from '../../config/env.js';

function isTransientStatus(status) {
  return status === 429 || status >= 500;
}

// نفس شكل مخرجات باقي المزودين (type: 'text') لتوحيد الاستهلاك بالراوت الرئيسي
// ملاحظة: نصوص فقط حاليًا (بدون صور/PDF) — يمكن توسيعها لاحقًا لدعم الصور عبر GPT-4o
export async function* streamOpenAI({ modelId, messages, systemPrompt }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const errBody = await response.json().catch(() => null);
    const err = new Error('OpenAI request failed');
    err.status = response.status;
    err.isTransient = isTransientStatus(response.status);
    err.providerBody = errBody;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const textPiece = json.choices?.[0]?.delta?.content || '';
        if (textPiece) yield { type: 'text', value: textPiece };
      } catch (e) {
        // تجاهل سطر غير مكتمل
      }
    }
  }
}