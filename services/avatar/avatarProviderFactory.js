import { config } from '../../config/env.js';
import { DidAvatarProvider } from './providers/didProvider.js';

// نقطة التبديل الوحيدة بين المزودين - أي مزوّد جديد يُضاف هون بسطر واحد
const PROVIDERS = {
  did: () => new DidAvatarProvider(),
};

export function getAvatarProvider() {
  const key = config.avatarProvider || 'did';
  const factory = PROVIDERS[key];
  if (!factory) throw new Error(`Unknown avatar provider: ${key}`);
  return factory();
}