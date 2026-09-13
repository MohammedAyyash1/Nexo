import { config } from '../../config/env.js';

function isTransientStatus(status) {
  return status === 429 || status >= 500;
}

// نفس شكل مخرجات باقي المزودين (type: 'text'/'toolCall') لتوحيد الاستهلاك بالراوت الرئيسي
// ملاحظة: Groq لا يدعم صورًا/PDF - نصوص + أدوات فقط
export async function* streamGroq({ modelId, messages, systemPrompt, tools }) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 8000,
      ...(tools?.length ? { tools } : {}),
    }),
  });

  if (!response.ok || !response.body) {
    const errBody = await response.json().catch(() => null);
    const err = new Error('Groq request failed');
    err.status = response.status;
    err.isTransient = isTransientStatus(response.status);
    err.providerBody = errBody;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  // تجميع أجزاء استدعاء الأداة عبر عدة deltas متتالية (بروتوكول OpenAI/Groq يبعتها مجزّأة)
  const toolCallsAccumulator = {};

  function* flushToolCalls() {
    for (const key of Object.keys(toolCallsAccumulator)) {
      const call = toolCallsAccumulator[key];
      if (!call.name) continue;
      let args = {};
      try { args = call.argsText ? JSON.parse(call.argsText) : {}; } catch (e) { args = {}; }
      yield { type: 'toolCall', value: { id: call.id, name: call.name, args } };
    }
  }

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
        const delta = json.choices?.[0]?.delta || {};
        const textPiece = delta.content || '';
        if (textPiece) yield { type: 'text', value: textPiece };

        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const key = tc.index ?? 0;
            if (!toolCallsAccumulator[key]) toolCallsAccumulator[key] = { id: tc.id || `call_${key}`, name: '', argsText: '' };
            if (tc.id) toolCallsAccumulator[key].id = tc.id;
            if (tc.function?.name) toolCallsAccumulator[key].name = tc.function.name;
            if (tc.function?.arguments) toolCallsAccumulator[key].argsText += tc.function.arguments;
          }
        }

        if (json.choices?.[0]?.finish_reason === 'tool_calls') {
          yield* flushToolCalls();
        }
                if (json.choices?.[0]?.finish_reason === 'length') {
          yield { type: 'truncated', value: true };
        }
      } catch (e) {
        // تجاهل سطر غير مكتمل
      }
    }
  }
}