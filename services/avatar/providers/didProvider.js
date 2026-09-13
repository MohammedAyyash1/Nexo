import { config } from '../../../config/env.js';
import { AvatarProvider } from '../avatarProvider.js';

const DID_API_BASE = 'https://api.d-id.com';

function mapDidStatus(didStatus) {
  if (didStatus === 'created') return 'queued';
  if (didStatus === 'started') return 'processing';
  if (didStatus === 'done') return 'completed';
  if (didStatus === 'error' || didStatus === 'rejected') return 'failed';
  return 'processing';
}

export class DidAvatarProvider extends AvatarProvider {
  async createJob(imageUrl, scriptText) {
    const response = await fetch(`${DID_API_BASE}/talks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // مفتاح D-ID عادة يُستخدم مباشرة بصيغة Basic Auth كما يُعطى من لوحة التحكم
        Authorization: `Basic ${config.didApiKey}`,
      },
      body: JSON.stringify({
        source_url: imageUrl,
        script: {
          type: 'text',
          input: scriptText,
          provider: { type: 'microsoft', voice_id: 'ar-SA-HamedNeural' },
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data?.description || data?.message || 'D-ID create talk failed');
      err.status = response.status;
      err.providerBody = data;
      throw err;
    }

    return { providerJobId: data.id, status: mapDidStatus(data.status) };
  }

  async checkStatus(providerJobId) {
    const response = await fetch(`${DID_API_BASE}/talks/${providerJobId}`, {
      method: 'GET',
      headers: { Authorization: `Basic ${config.didApiKey}` },
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data?.description || data?.message || 'D-ID check status failed');
      err.status = response.status;
      err.providerBody = data;
      throw err;
    }

    return {
      status: mapDidStatus(data.status),
      resultUrl: data.result_url || null,
      errorMessage: data.status === 'error' ? (data.error?.description || data.error?.kind || 'generation_failed') : null,
    };
  }
}