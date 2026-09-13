import { GroqTranslationProvider } from './providers/groqTranslationProvider.js';

const PROVIDERS = { groq: () => new GroqTranslationProvider() };

export function getTranslationProvider(key) {
  const factory = PROVIDERS[key || 'groq'];
  if (!factory) throw new Error(`Unknown translation provider: ${key}`);
  return factory();
}