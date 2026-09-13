import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from './config/env.js';
import { getTranslationProvider } from './services/translate/translationProviderFactory.js';
import { updateSessionStatus } from './services/liveTranslateService.js';

// roomId -> Map<socket, participant>
// participant: { id, name, speakLang, listenLang, avatar, micOn, camOn, lastTranscript }
const rooms = new Map();

const TTS_VOICES = {
  ar: { model: 'canopylabs/orpheus-arabic-saudi', voice: 'fahad' },
  en: { model: 'canopylabs/orpheus-v1-english', voice: 'troy' },
};

const TTS_MAX_CHARS = 190; // حد Groq الفعلي 200 حرف — نسيب هامش أمان

// عتبات منع الهلوسة — مبنية على إشارات ثقة Whisper الفعلية (مو تخمين)
const NO_SPEECH_PROB_THRESHOLD = 0.35; // كان 0.5 — نصير أكثر تشددًا
const AVG_LOGPROB_THRESHOLD = -1.0; // ثقة منخفضة جدًا بالنص المستخرج نفسه
const COMPRESSION_RATIO_THRESHOLD = 2.4; // نمط تكرار شائع بهلوسات Whisper
const MIN_TRANSCRIPT_LENGTH = 2;

// حد أمان لحجم الصورة الشخصية المرسلة عبر الـWebSocket (Base64) — يحمي من رسائل ضخمة بالغلط
const MAX_AVATAR_LENGTH = 300000;
// حد أمان لطول رسالة المحادثة النصية
const MAX_CHAT_MESSAGE_LENGTH = 2000;

// النتيجة: { transcript, unclear } — unclear=true يعني "الصوت كان فيه كلام محتمل لكن ما قدرنا نفهمه بثقة"
// بينما transcript='' مع unclear=false يعني ببساطة ما كان فيه كلام أصلًا (صمت/ضجيج بحت)
async function transcribeChunk(buffer, language) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'audio/wav' }), 'chunk.wav');
  form.append('model', 'whisper-large-v3');
  form.append('response_format', 'verbose_json'); // يرجّع مؤشرات الثقة لكل مقطع، مو بس نص
  if (language) form.append('language', language);
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.groqApiKey}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'STT failed');

  const text = (data.text || '').trim();
  if (!text) return { transcript: '', unclear: false };

  const segments = data.segments || [];
  if (segments.length > 0) {
    const avgNoSpeechProb = segments.reduce((sum, s) => sum + (s.no_speech_prob ?? 0), 0) / segments.length;
    const avgLogprob = segments.reduce((sum, s) => sum + (s.avg_logprob ?? 0), 0) / segments.length;
    const maxCompressionRatio = Math.max(...segments.map((s) => s.compression_ratio ?? 0));

    if (avgNoSpeechProb > NO_SPEECH_PROB_THRESHOLD) return { transcript: '', unclear: false }; // ضجيج/صمت بحت، مو كلام أصلًا
    if (avgLogprob < AVG_LOGPROB_THRESHOLD) return { transcript: '', unclear: true }; // فيه كلام لكن غير مفهوم بثقة
    if (maxCompressionRatio > COMPRESSION_RATIO_THRESHOLD) return { transcript: '', unclear: true }; // نمط تكرار مشبوه (هلوسة معروفة)
  }

  if (text.length < MIN_TRANSCRIPT_LENGTH) return { transcript: '', unclear: false };

  return { transcript: text, unclear: false };
}

async function synthesizeSpeech(text, targetLang) {
  const voiceConfig = TTS_VOICES[targetLang] || TTS_VOICES.en;
  const safeText = text.length > TTS_MAX_CHARS ? text.slice(0, TTS_MAX_CHARS) : text;

  const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.groqApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: voiceConfig.model, input: safeText, voice: voiceConfig.voice, response_format: 'wav' }),
  });

  if (!response.ok) {
    let detail = '';
    try { detail = JSON.stringify(await response.json()); } catch (e) { detail = await response.text().catch(() => ''); }
    throw new Error(`TTS failed (${response.status}): ${detail}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function participantsList(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.values()].map((p) => ({
    id: p.id, name: p.name, speakLang: p.speakLang, listenLang: p.listenLang, avatar: p.avatar || null, micOn: p.micOn, camOn: p.camOn,
  }));
}

function broadcast(roomId, obj, excludeSocket = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [sock] of room) {
    if (sock !== excludeSocket && sock.readyState === 1) sock.send(JSON.stringify(obj));
  }
}

function sendTo(roomId, targetId, obj) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [sock, p] of room) {
    if (p.id === targetId && sock.readyState === 1) { sock.send(JSON.stringify(obj)); return; }
  }
}

let participantsSeqCounter = 0;
function sendParticipantsUpdate(roomId) {
  participantsSeqCounter++;
  broadcast(roomId, { type: 'participants', participants: participantsList(roomId), seq: participantsSeqCounter });
}

// Smart Routing: نترجم/نولّد صوت فقط للمستمعين اللي لغتهم مختلفة عن لغة المتحدث.
// المستمعين اللي بنفس لغة المتحدث ما يمرّون بهذا المسار إطلاقًا — يسمعون الصوت الخام مباشرة عبر WebRTC (بالفرونت-إند).
async function translateAndDeliver(roomId, senderSocket, transcript, sourceLang) {
  const room = rooms.get(roomId);
  if (!room) return;

  const targetsByLang = new Map(); // lang -> [socket, ...]
  for (const [sock, p] of room) {
    if (sock === senderSocket) continue;
    const lang = p.listenLang;
    if (lang === sourceLang) continue; // نفس اللغة — تخطّي تام، بلا ترجمة ولا TTS إطلاقًا لهذا المستمع
    if (!targetsByLang.has(lang)) targetsByLang.set(lang, []);
    targetsByLang.get(lang).push(sock);
  }

  for (const [targetLang, sockets] of targetsByLang) {
    try {
      const provider = getTranslationProvider('groq');
      const translated = await provider.translateText(transcript, sourceLang, targetLang);
      if (!translated) continue; // النموذج نفسه اعتبر النص غير مفهوم/غير قابل للترجمة بثقة

      broadcast(roomId, { type: 'translated-text', text: translated, lang: targetLang, fromName: room.get(senderSocket)?.name || '', at: Date.now() }, null);

      const audioOut = await synthesizeSpeech(translated, targetLang);
      for (const sock of sockets) {
        if (sock.readyState === 1) sock.send(audioOut, { binary: true });
      }
    } catch (err) {
      console.error(`Live translate pipeline error (${sourceLang}->${targetLang}):`, err.message);
    }
  }
}

export function setupLiveTranslateSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/live-translate-ws' });

  // Heartbeat: يكشف الاتصالات "الشبح" (Wifi انقطع، الجهاز نام، تبويب اتقفل بشكل غير نظيف)
  // التي TCP وحده ما بيبلّغ عنها بسرعة — بدونها يضل المشارك القديم بالغرفة لحد ما حد يحاول يبعتله رسالة ويفشل.
  const HEARTBEAT_INTERVAL_MS = 20000;
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        socket.terminate(); // بيطلق حدث 'close' فيتنظف المشارك تلقائيًا بنفس المسار الموجود أصلًا
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => clearInterval(heartbeatInterval));

  wss.on('connection', (socket, req) => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    let currentRoomId = null;
    let myId = null;
    let isGuest = false;
    let guestRoomId = null;

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const decoded = jwt.verify(token, config.jwtSecret);
      if (decoded.guest) { isGuest = true; guestRoomId = decoded.roomId; }
    } catch (err) {
      socket.close(4001, 'unauthorized');
      return;
    }

    socket.on('message', async (data, isBinary) => {
      try {
        if (!isBinary) {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'join') {
            if (isGuest && msg.roomId !== guestRoomId) {
              socket.send(JSON.stringify({ type: 'error', message: 'unauthorized' }));
              socket.close();
              return;
            }
            currentRoomId = msg.roomId;
            const room = getRoom(currentRoomId);

            if (room.size >= 6) {
              socket.send(JSON.stringify({ type: 'room-full' }));
              socket.close();
              return;
            }

            myId = randomUUID();
            const existingIds = [...room.values()].map((p) => p.id);

            room.set(socket, {
              id: myId,
              name: (msg.name || 'مستخدم').slice(0, 30),
              speakLang: msg.speakLang === 'en' ? 'en' : 'ar',
              listenLang: msg.listenLang === 'ar' ? 'ar' : 'en',
              avatar: (typeof msg.avatar === 'string' && msg.avatar.length <= MAX_AVATAR_LENGTH) ? msg.avatar : null,
              micOn: false,
              camOn: false,
              lastTranscript: '',
            });

            await updateSessionStatus(currentRoomId, room.size >= 2 ? 'active' : 'waiting', room.size);

            socket.send(JSON.stringify({ type: 'joined', myId, existingParticipantIds: existingIds }));
            sendParticipantsUpdate(currentRoomId);
            return;
          }

          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          const me = room?.get(socket);
          if (!me) return;

          if (msg.type === 'update-settings') {
            if (msg.speakLang) me.speakLang = msg.speakLang === 'en' ? 'en' : 'ar';
            if (msg.listenLang) me.listenLang = msg.listenLang === 'ar' ? 'ar' : 'en';
            if (typeof msg.micOn === 'boolean') me.micOn = msg.micOn;
            if (typeof msg.camOn === 'boolean') me.camOn = msg.camOn;
            if (typeof msg.avatar === 'string' && msg.avatar.length <= MAX_AVATAR_LENGTH) me.avatar = msg.avatar;
            sendParticipantsUpdate(currentRoomId);
            return;
          }

          if (msg.type === 'speaking-start') { broadcast(currentRoomId, { type: 'peer-speaking', id: me.id, speaking: true }, socket); return; }
          if (msg.type === 'speaking-stop') { broadcast(currentRoomId, { type: 'peer-speaking', id: me.id, speaking: false }, socket); return; }

          // تفاعلات الإيموجي — كانت غير مُمرَّرة إطلاقًا بين المشاركين، نضيفها بنفس نمط peer-speaking
          if (msg.type === 'reaction') {
            if (typeof msg.emoji !== 'string' || !msg.emoji) return;
            broadcast(currentRoomId, { type: 'reaction', emoji: msg.emoji, fromId: me.id }, socket);
            return;
          }

          // رسائل المحادثة النصية — جماعية إذا بدون targetId، أو خاصة لشخص محدد إذا فيه targetId (بنفس آلية sendTo المستخدمة لإشارات WebRTC)
          if (msg.type === 'chat-message') {
            if (typeof msg.text !== 'string' || !msg.text.trim()) return;
            const payload = {
              type: 'chat-message',
              fromId: me.id,
              fromName: me.name,
              text: msg.text.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH),
              at: Date.now(),
              targetId: msg.targetId || null,
            };
            if (msg.targetId) {
              sendTo(currentRoomId, msg.targetId, payload);
            } else {
              broadcast(currentRoomId, payload, socket);
            }
            return;
          }

          // إشارات WebRTC (فيديو + صوت خام مباشر Peer-to-Peer) — نمررها فقط للشخص المستهدف
          if (msg.type === 'webrtc-offer' || msg.type === 'webrtc-answer' || msg.type === 'webrtc-ice-candidate') {
            sendTo(currentRoomId, msg.targetId, { ...msg, fromId: me.id });
            return;
          }
          return;
        }

        // بيانات ثنائية = مقطع صوت (WAV) جاهز من VAD بالفرونت-إند — نهاية جملة/كلام طبيعية، مو تقطيع زمني ثابت
        if (!currentRoomId) return;
        const room = rooms.get(currentRoomId);
        const me = room?.get(socket);
        if (!me) return;

        const audioBuffer = Buffer.from(data);
        let sttResult;
        try {
          sttResult = await transcribeChunk(audioBuffer, me.speakLang);
        } catch (err) {
          console.error('Live translate STT error:', err.message);
          return;
        }

        if (sttResult.unclear) {
          // فيه كلام لكن الثقة منخفضة جدًا — ما نخترع ترجمة، بس نعلم المتحدث نفسه بوضوح
          if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'speech-unclear' }));
          return;
        }

        const transcript = sttResult.transcript;
        if (!transcript) return;

        // منع تكرار نفس الجملة (حماية إضافية من ازدواجية عرضية)
        const normalized = transcript.trim().toLowerCase().replace(/[؟?.!,]/g, '');
        if (normalized === me.lastTranscript) return;
        me.lastTranscript = normalized;

        await translateAndDeliver(currentRoomId, socket, transcript, me.speakLang);
      } catch (err) {
        console.error('Live translate socket message error:', err.message);
      }
    });

    socket.on('close', async () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId);
        const me = room.get(socket);
        room.delete(socket);
        if (me) broadcast(currentRoomId, { type: 'peer-left', id: me.id }, socket);
        sendParticipantsUpdate(currentRoomId);
        if (room.size === 0) {
          rooms.delete(currentRoomId);
          await updateSessionStatus(currentRoomId, 'ended', 0);
        } else {
          await updateSessionStatus(currentRoomId, 'waiting', room.size);
        }
      }
    });
  });

  console.log('✅ Live Translate WebSocket ready on /live-translate-ws');
}