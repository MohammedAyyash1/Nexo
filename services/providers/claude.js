import { config } from '../../config/env.js';

function isTransientStatus(status) {
  return status === 429 || status >= 500;
}

// شكل رد Claude مختلف قليلًا عن OpenAI/Groq — نوحّده لنفس الصيغة (type: 'text')
export async function* streamClaude({ modelId, messages, systemPrompt }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      system: systemPrompt,
      messages,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const errBody = await response.json().catch(() => null);
    const err = new Error('Claude request failed');
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
    const events = buffer.split('\n\n');
    buffer = events.pop();
    for (const event of events) {
      const line = event.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      try {
        const json = JSON.parse(line.slice(6));
        if (json.type === 'content_block_delta' && json.delta?.text) {
          yield { type: 'text', value: json.delta.text };
        }
      } catch (e) {
        // تجاهل سطر غير مكتمل
      }
    }
  }
}