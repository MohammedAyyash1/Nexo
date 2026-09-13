import { config } from '../../config/env.js';

function isTransientStatus(status) {
  return status === 429 || status >= 500;
}

// يحوّل استجابة جزئية من Gemini إلى أحداث موحّدة (نص / تأريض بحث / طلب استدعاء أداة)
function eventsFromJson(json) {
  const events = [];
  const parts = json.candidates?.[0]?.content?.parts || [];
  const textPiece = parts.map((p) => p.text || '').join('');
  if (textPiece) events.push({ type: 'text', value: textPiece });

  if (json.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    events.push({ type: 'truncated', value: true });
  }
  const functionCallPart = parts.find((p) => p.functionCall);
  if (functionCallPart) {
    events.push({
      type: 'toolCall',
      value: {
        name: functionCallPart.functionCall.name,
        args: functionCallPart.functionCall.args || {},
        thoughtSignature: functionCallPart.thoughtSignature || null,
      },
    });
  }

  if (json.candidates?.[0]?.groundingMetadata) {
    events.push({ type: 'grounding', value: json.candidates[0].groundingMetadata });
  }
  return events;
}

export async function* streamGemini({ modelId, contents, systemPrompt, tools }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${config.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 8192, temperature: 0.9 },
        ...(tools?.length ? { tools } : {}),
      }),
    }
  );

  if (!response.ok || !response.body) {
    const errBody = await response.json().catch(() => null);
    const err = new Error('Gemini request failed');
    err.status = response.status;
    err.isTransient = isTransientStatus(response.status);
    err.providerBody = errBody;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const parseEvent = (event) => {
    const line = event.split('\n').find((l) => l.startsWith('data: '));
    if (!line) return null;
    try {
      return JSON.parse(line.slice(6));
    } catch (e) {
      return null;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop();
    for (const event of events) {
      const json = parseEvent(event);
      if (!json) continue;
      yield* eventsFromJson(json);
    }
  }
  if (buffer.trim()) {
    const json = parseEvent(buffer);
    if (json) yield* eventsFromJson(json);
  }
}