import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, Mic, MicOff, Video, VideoOff, Copy, Check, Radio, Languages, Users,
  ShieldCheck, MonitorUp, MonitorX, MessageSquare, Signal, SignalLow, SignalMedium, QrCode,
  Smile, CircleDot, Square, FileText, PhoneOff, Camera, Settings2, PlayCircle, Link2, Zap, MoreHorizontal, Loader2, Lock,
} from 'lucide-react';
import { API_BASE } from '../../config/api.js';

const TOKEN_KEY = 'nexo_token';
const LANG_KEY = 'nexo_lang';
const BASE = `${API_BASE}/api`;


const WS_BASE = API_BASE.replace(/^http/, 'ws') + '/live-translate-ws';
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const VAD_SAMPLE_RATE = 16000;
const LANG_META = { ar: { flag: '🇸🇦', code: 'AR' }, en: { flag: '🇬🇧', code: 'EN' } };
const REACTION_EMOJIS = ['👍', '❤️', '😂', '👏', '🎉', '😮'];

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function encodeWAV(float32Array, sampleRate) {
  const buffer = new ArrayBuffer(44 + float32Array.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + float32Array.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, float32Array.length * 2, true);
  let offset = 44;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function LiveWaveform({ stream, active, size = 'sm' }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const dims = size === 'lg' ? { w: 140, h: 34 } : { w: 80, h: 24 };

  useEffect(() => {
    if (!stream || !active) return undefined;
    const audioTrack = stream.getAudioTracks?.()[0];
    if (!audioTrack) return undefined;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx2d = canvas.getContext('2d');
      analyser.getByteFrequencyData(data);
      const w = canvas.width, h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      const barWidth = w / data.length;
      for (let i = 0; i < data.length; i++) {
        const barHeight = (data[i] / 255) * h;
        const gradient = ctx2d.createLinearGradient(0, h, 0, h - barHeight);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.95)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.85)');
        ctx2d.fillStyle = gradient;
        ctx2d.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [stream, active]);

  if (!active) return null;
  return <canvas ref={canvasRef} width={dims.w} height={dims.h} />;
}

function LangPill({ langCode, style }) {
  const meta = LANG_META[langCode] || { flag: '🌐', code: langCode?.toUpperCase() || '?' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600,
      ...style,
    }}>
      {meta.flag} {meta.code}
    </span>
  );
}

export function LiveTranslatePage({ user }) {
  const navigate = useNavigate();
  const { roomId: roomIdParam } = useParams();
  const lang = loadLang();
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });
  const myAvatarUrl = user?.avatar || user?.avatarUrl || user?.photoUrl || user?.picture || user?.avatar_url || null;

  const [name, setName] = useState(user?.name || '');
  const [speakLang, setSpeakLang] = useState('ar');
  const [listenLang, setListenLang] = useState('en');
  const [roomId, setRoomId] = useState(null);
  const [pendingJoinId] = useState(roomIdParam || null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [myId, setMyId] = useState(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakingIds, setSpeakingIds] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [lastTranslation, setLastTranslation] = useState('');
  const [lastTranslationFrom, setLastTranslationFrom] = useState('');
  const [myLastCaption, setMyLastCaption] = useState('');
  const [showLog, setShowLog] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [camBusy, setCamBusy] = useState(false);
  const [rightTab, setRightTab] = useState('translate'); // 'translate' | 'chat'
  const [chatThreads, setChatThreads] = useState({ group: [] }); // 'group' أو participantId -> [messages]
  const [chatSubTab, setChatSubTab] = useState('public'); // 'public' (الجميع) | 'private' (خاص)
  const [activeDmId, setActiveDmId] = useState(null); // محادثة خاصة مفتوحة حاليًا (id شخص) أو null = قائمة المحادثات
  const [unreadCounts, setUnreadCounts] = useState({}); // threadKey -> عدد الرسائل غير المقروءة
  const [dmToast, setDmToast] = useState(null); // { name, text } إشعار رسالة خاصة جديدة
  const [chatInput, setChatInput] = useState('');
  const [showParticipants, setShowParticipants] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [duration, setDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState({});
  const [reconnecting, setReconnecting] = useState(false);
  const [unclearHint, setUnclearHint] = useState(false);
  const [chatLog, setChatLog] = useState([]);

  // Lobby: أجهزة الإدخال
  const [cameraDevices, setCameraDevices] = useState([]);
  const [micDevices, setMicDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedMicId, setSelectedMicId] = useState('');
  const [testingAV, setTestingAV] = useState(false);
  const [micLevelStream, setMicLevelStream] = useState(null);

  const wsRef = useRef(null);
  const myIdRef = useRef(null);
  const roomIdRef = useRef(roomIdParam || null);
  const intentionalCloseRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const callStartRef = useRef(null);
  const participantsSeqRef = useRef(0);
  const listenLangRef = useRef(listenLang);
  const showLogRef = useRef(showLog);
  const rightTabRef = useRef(rightTab);
  const chatSubTabRef = useRef(chatSubTab);
  const activeDmIdRef = useRef(activeDmId);

  const micStreamRef = useRef(null);
  const camStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const vadRef = useRef(null);
  const unclearTimeoutRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const fullTranscriptRef = useRef([]);

  const peersRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const remoteVideoElsRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const localVideoRef = useRef(null);
  const [, forceRerender] = useState(0);

  useEffect(() => { listenLangRef.current = listenLang; }, [listenLang]);
  useEffect(() => { showLogRef.current = showLog; }, [showLog]);
  useEffect(() => { rightTabRef.current = rightTab; }, [rightTab]);
  useEffect(() => { chatSubTabRef.current = chatSubTab; }, [chatSubTab]);
  useEffect(() => { activeDmIdRef.current = activeDmId; }, [activeDmId]);

  // تصفير عداد غير المقروء فورًا لأي محادثة يفتحها المستخدم (عامة أو خاصة)
  useEffect(() => {
    if (rightTab !== 'chat' || !showLog) return;
    if (chatSubTab === 'public') markThreadRead('group');
    else if (chatSubTab === 'private' && activeDmId) markThreadRead(activeDmId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightTab, showLog, chatSubTab, activeDmId]);

  // تعداد أجهزة الكاميرا/المايك المتاحة فعليًا بجهاز المستخدم
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then((devices) => {
      setCameraDevices(devices.filter((d) => d.kind === 'videoinput'));
      setMicDevices(devices.filter((d) => d.kind === 'audioinput'));
    }).catch(() => {});
  }, []);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) { isPlayingRef.current = false; return; }
    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift();
    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); playNextInQueue(); };
    audio.onerror = () => { URL.revokeObjectURL(url); playNextInQueue(); };
    audio.play().catch(() => playNextInQueue());
  }, []);

  const playIncomingAudio = useCallback((arrayBuffer) => {
    audioQueueRef.current.push(arrayBuffer);
    if (!isPlayingRef.current) playNextInQueue();
  }, [playNextInQueue]);

  const sendSignal = (obj) => {
    if (wsRef.current?.readyState === 1) wsRef.current.send(JSON.stringify(obj));
  };

  const attachRemoteVideo = (participantId, stream) => {
    const el = remoteVideoElsRef.current.get(participantId);
    if (el) el.srcObject = stream;
    remoteStreamsRef.current.set(participantId, stream);
    forceRerender((n) => n + 1);
  };

  const getActiveVideoTrack = () => (screenStreamRef.current || camStreamRef.current)?.getVideoTracks()[0] || null;
  const getActiveAudioTrack = () => micStreamRef.current?.getAudioTracks()[0] || null;

  const createPeerConnection = (targetId) => {
    if (peersRef.current.has(targetId)) return peersRef.current.get(targetId).pc;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const polite = myIdRef.current > targetId;
    const entry = { pc, polite, makingOffer: false, ignoreOffer: false };
    peersRef.current.set(targetId, entry);

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: 'webrtc-ice-candidate', targetId, candidate: e.candidate });
    };
    pc.ontrack = (e) => attachRemoteVideo(targetId, e.streams[0]);
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        sendSignal({ type: 'webrtc-offer', targetId, sdp: pc.localDescription });
      } catch (err) {
        console.error('Negotiation error:', err);
      } finally {
        entry.makingOffer = false;
      }
    };

    const activeVideoTrack = getActiveVideoTrack();
    if (activeVideoTrack) pc.addTrack(activeVideoTrack, screenStreamRef.current || camStreamRef.current);

    const activeAudioTrack = getActiveAudioTrack();
    if (activeAudioTrack) pc.addTrack(activeAudioTrack, micStreamRef.current);

    return pc;
  };

  const handleWebrtcOffer = async (msg) => {
    createPeerConnection(msg.fromId);
    const entry = peersRef.current.get(msg.fromId);
    const { pc, polite } = entry;

    const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';
    entry.ignoreOffer = !polite && offerCollision;
    if (entry.ignoreOffer) return;

    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    const queued = pendingCandidatesRef.current.get(msg.fromId) || [];
    for (const c of queued) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    pendingCandidatesRef.current.delete(msg.fromId);

    await pc.setLocalDescription();
    sendSignal({ type: 'webrtc-answer', targetId: msg.fromId, sdp: pc.localDescription });
  };

  const handleWebrtcAnswer = async (msg) => {
    const entry = peersRef.current.get(msg.fromId);
    if (!entry) return;
    await entry.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    const queued = pendingCandidatesRef.current.get(msg.fromId) || [];
    for (const c of queued) await entry.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    pendingCandidatesRef.current.delete(msg.fromId);
  };

  const handleWebrtcIce = async (msg) => {
    const entry = peersRef.current.get(msg.fromId);
    try {
      if (entry?.pc?.remoteDescription) {
        await entry.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      } else {
        const list = pendingCandidatesRef.current.get(msg.fromId) || [];
        list.push(msg.candidate);
        pendingCandidatesRef.current.set(msg.fromId, list);
      }
    } catch (err) {
      if (!entry?.ignoreOffer) console.error('ICE candidate error:', err.message);
    }
  };

  const closePeer = (participantId) => {
    const entry = peersRef.current.get(participantId);
    if (entry) { entry.pc.close(); peersRef.current.delete(participantId); }
    remoteVideoElsRef.current.delete(participantId);
    remoteStreamsRef.current.delete(participantId);
  };

  useEffect(() => {
    if (!myIdRef.current) return;
    const currentIds = new Set(participants.map((p) => p.id));
    participants.forEach((p) => {
      if (p.id === myIdRef.current) return;
      if (!peersRef.current.has(p.id)) createPeerConnection(p.id);
    });
    for (const id of [...peersRef.current.keys()]) {
      if (!currentIds.has(id)) closePeer(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  useEffect(() => {
    participants.forEach((p) => {
      if (p.id === myIdRef.current) return;
      const el = remoteVideoElsRef.current.get(p.id);
      if (el) el.muted = p.speakLang !== listenLang;
    });
  }, [participants, listenLang]);

  useEffect(() => {
    const iv = setInterval(async () => {
      const results = {};
      for (const [id, entry] of peersRef.current) {
        try {
          const stats = await entry.pc.getStats();
          let rtt = null, lossRatio = 0;
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime != null) {
              rtt = report.currentRoundTripTime;
            }
            if (report.type === 'inbound-rtp' && report.kind === 'video' && report.packetsReceived) {
              lossRatio = (report.packetsLost || 0) / (report.packetsLost + report.packetsReceived);
            }
          });
          if (rtt == null) { results[id] = 'unknown'; continue; }
          if (rtt < 0.15 && lossRatio < 0.02) results[id] = 'good';
          else if (rtt < 0.4 && lossRatio < 0.08) results[id] = 'fair';
          else results[id] = 'poor';
        } catch (e) { /* تجاهل */ }
      }
      setConnectionQuality(results);
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!connected) return;
    if (!callStartRef.current) callStartRef.current = Date.now();
    const iv = setInterval(() => setDuration(Math.floor((Date.now() - callStartRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [connected]);

  const showUnclearHint = () => {
    setUnclearHint(true);
    if (unclearTimeoutRef.current) clearTimeout(unclearTimeoutRef.current);
    unclearTimeoutRef.current = setTimeout(() => setUnclearHint(false), 1800);
  };

  const spawnFloatingReaction = (emoji) => {
    const id = Math.random().toString(36).slice(2);
    const left = 10 + Math.random() * 80;
    setFloatingReactions((prev) => [...prev, { id, emoji, left }]);
    setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== id)), 2200);
  };

  const sendReaction = (emoji) => {
    sendSignal({ type: 'reaction', emoji });
    spawnFloatingReaction(emoji);
    setShowEmojiPicker(false);
  };

  const appendToThread = (threadKey, message) => {
    setChatThreads((prev) => ({ ...prev, [threadKey]: [...(prev[threadKey] || []), message] }));
  };

  // هل المستخدم شايف هالمحادثة بالضبط هلق؟ (اللوحة مفتوحة + التبويب الصحيح + نفس المحادثة إذا خاصة)
  const isThreadCurrentlyOpen = (threadKey) => {
    if (!showLogRef.current || rightTabRef.current !== 'chat') return false;
    if (threadKey === 'group') return chatSubTabRef.current === 'public';
    return chatSubTabRef.current === 'private' && activeDmIdRef.current === threadKey;
  };

  const markThreadRead = (threadKey) => {
    setUnreadCounts((prev) => (prev[threadKey] ? { ...prev, [threadKey]: 0 } : prev));
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    const text = chatInput.trim();
    const targetId = chatSubTab === 'private' ? activeDmId : null;
    const threadKey = targetId || 'group';
    appendToThread(threadKey, { fromId: myIdRef.current, fromName: name || t('أنت', 'You'), text, at: Date.now() });
    sendSignal({ type: 'chat-message', text, targetId: targetId || undefined });
    setChatInput('');
  };

  const connectSocket = (id) => {
    // تنظيف أي اتصالات WebRTC قديمة قبل أي اتصال جديد (أول مرة أو إعادة اتصال بعد انقطاع) —
    // اتصالات WebRTC مستقلة عن قناة الإشارة (WebSocket) وما بتنقفل تلقائيًا لمجرد ما هي انقطعت،
    // ومعرّفنا (myId) بيتغيّر بكل إعادة اتصال، فلازم نبلش نظيف حتى الـuseEffect يعيد بناء الاتصالات الصحيحة
    // فور وصول قائمة المشاركين الجديدة.
    peersRef.current.forEach((entry) => entry.pc.close());
    peersRef.current.clear();
    pendingCandidatesRef.current.clear();
    remoteVideoElsRef.current.clear();
    remoteStreamsRef.current.clear();

    const token = localStorage.getItem(TOKEN_KEY);
    const ws = new WebSocket(`${WS_BASE}?token=${token}`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setReconnecting(false);
      ws.send(JSON.stringify({ type: 'join', roomId: id, name: name || t('ضيف', 'Guest'), speakLang, listenLang, avatar: myAvatarUrl || undefined }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data);
        if (msg.type === 'joined') {
          setConnected(true);
          setError('');
          setMyId(msg.myId);
          myIdRef.current = msg.myId;
          reconnectAttemptsRef.current = 0;
        } else if (msg.type === 'participants') {
          if ((msg.seq ?? 0) < participantsSeqRef.current) return;
          participantsSeqRef.current = msg.seq ?? 0;
          setParticipants(msg.participants);
        } else if (msg.type === 'peer-left') {
          closePeer(msg.id);
        } else if (msg.type === 'peer-speaking') {
          setSpeakingIds((prev) => {
            const next = new Set(prev);
            if (msg.speaking) next.add(msg.id); else next.delete(msg.id);
            return next;
          });
        } else if (msg.type === 'translated-text') {
          setLastTranslation(msg.text);
          setLastTranslationFrom(msg.fromName || '');
          setChatLog((prev) => [...prev, { fromName: msg.fromName || '', text: msg.text, lang: msg.lang, at: msg.at || Date.now() }].slice(-100));
        } else if (msg.type === 'transcript') {
          fullTranscriptRef.current.push({ fromName: msg.fromName || '', lang: msg.lang, text: msg.text, at: msg.at || Date.now() });
          if (msg.fromName === (name || t('ضيف', 'Guest'))) setMyLastCaption(msg.text);
        } else if (msg.type === 'reaction') {
          spawnFloatingReaction(msg.emoji);
        } else if (msg.type === 'chat-message') {
          if (msg.fromId === myIdRef.current) return; // تجنب التكرار لو السيرفر رجّع الرسالة لنفس المُرسل
          const threadKey = msg.targetId ? msg.fromId : 'group'; // خاصة => نفس محادثة هذا الشخص، عامة => الجماعية
          appendToThread(threadKey, { fromId: msg.fromId, fromName: msg.fromName || t('مشارك', 'Participant'), text: msg.text, at: msg.at || Date.now() });

          if (!isThreadCurrentlyOpen(threadKey)) {
            setUnreadCounts((prev) => ({ ...prev, [threadKey]: (prev[threadKey] || 0) + 1 }));
            if (msg.targetId) {
              setDmToast({ name: msg.fromName || t('مشارك', 'Participant'), text: msg.text, fromId: msg.fromId });
              setTimeout(() => setDmToast((cur) => (cur?.fromId === msg.fromId && cur?.text === msg.text ? null : cur)), 4000);
            }
          }
        } else if (msg.type === 'speech-unclear') {
          showUnclearHint();
        } else if (msg.type === 'room-full') {
          setError(t('هذه الغرفة ممتلئة (6 مشاركين كحد أقصى).', 'This room is full (max 6 participants).'));
        } else if (msg.type === 'webrtc-offer') {
          handleWebrtcOffer(msg);
        } else if (msg.type === 'webrtc-answer') {
          handleWebrtcAnswer(msg);
        } else if (msg.type === 'webrtc-ice-candidate') {
          handleWebrtcIce(msg);
        }
      } else {
        playIncomingAudio(event.data);
      }
    };

    ws.onerror = () => setError(t('خطأ بالاتصال', 'Connection error'));
    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!intentionalCloseRef.current && roomIdRef.current) {
        setReconnecting(true);
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 10000);
        reconnectAttemptsRef.current += 1;
        setTimeout(() => {
          if (!intentionalCloseRef.current && roomIdRef.current) connectSocket(roomIdRef.current);
        }, delay);
      }
    };
    wsRef.current = ws;
  };

  const handleConfirmJoinViaLink = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setError(t('لازم تسجّل دخول أول عشان تنضم للغرفة.', 'You need to log in first to join the room.'));
      return;
    }
    setRoomId(pendingJoinId);
    roomIdRef.current = pendingJoinId;
    navigate(`/live-translate/${pendingJoinId}`, { replace: true });
    connectSocket(pendingJoinId);
  };

  const handleCreateCall = () => {
    fetch(`${BASE}/live-translate/sessions`, { method: 'POST', headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!data.session) { setError(t('فشل إنشاء الغرفة', 'Failed to create room')); return; }
        setRoomId(data.session.id);
        roomIdRef.current = data.session.id;
        navigate(`/live-translate/${data.session.id}`, { replace: true });
        connectSocket(data.session.id);
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')));
  };

  const handleJoinByCode = () => {
    if (!joinCode.trim()) return;
    fetch(`${BASE}/live-translate/sessions/by-code/${joinCode.trim()}`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!data.session) { setError(t('كود غير صحيح', 'Invalid code')); return; }
        navigate(`/live-translate/${data.session.id}`);
        connectSocket(data.session.id);
        setRoomId(data.session.id);
        roomIdRef.current = data.session.id;
      })
      .catch(() => setError(t('خطأ بالاتصال', 'Connection error')));
  };

  const saveTranscriptToMeetingNotes = () => {
    const entries = fullTranscriptRef.current;
    if (!entries.length) return Promise.resolve();
    const transcriptText = entries
      .map((e) => `[${e.fromName || t('مشارك', 'Participant')} - ${e.lang.toUpperCase()}] ${e.text}`)
      .join('\n');
    const formData = new FormData();
    formData.append('title', t('محضر مكالمة Live Translate', 'Live Translate Call Notes'));
    formData.append('pastedTranscript', transcriptText);
    formData.append('lang', lang);
    setSavingNotes(true);
    return fetch(`${BASE}/meeting-notes/generate`, { method: 'POST', headers: authHeaders(), body: formData })
      .then((res) => res.json())
      .catch((err) => console.error('Save transcript to meeting notes error:', err))
      .finally(() => setSavingNotes(false));
  };

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (unclearTimeoutRef.current) clearTimeout(unclearTimeoutRef.current);
      stopRecording();
      stopMic();
      stopCam();
      stopScreenShare();
      peersRef.current.forEach((entry) => entry.pc.close());
      peersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndCall = async () => {
    intentionalCloseRef.current = true;
    stopRecording();
    await saveTranscriptToMeetingNotes();
    navigate('/');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/live-translate/${roomId}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCodeShort);
    setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500);
  };

  const startRecording = () => {
    const tracks = [];
    if (micStreamRef.current) tracks.push(...micStreamRef.current.getAudioTracks());
    if (camStreamRef.current) tracks.push(...camStreamRef.current.getVideoTracks());
    if (!tracks.length) {
      setError(t('شغّل الكاميرا أو المايكروفون أول حتى تقدر تسجّل', 'Turn on your camera or microphone first to record'));
      return;
    }
    const combined = new MediaStream(tracks);
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(combined, { mimeType: 'video/webm' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexo-live-translate-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const toggleRecording = () => { if (isRecording) stopRecording(); else startRecording(); };

  const startMic = async () => {
    try {
      const constraints = selectedMicId ? { audio: { deviceId: { exact: selectedMicId } } } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        peersRef.current.forEach((entry) => {
          const alreadyHas = entry.pc.getSenders().some((s) => s.track && s.track.kind === 'audio');
          if (!alreadyHas) entry.pc.addTrack(audioTrack, stream);
        });
      }

      const myvad = await window.vad.MicVAD.new({
        baseAssetPath: 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/',
        onnxWASMBasePath: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/',
        getStream: async () => stream,
        onSpeechStart: () => { sendSignal({ type: 'speaking-start' }); },
        onSpeechEnd: (audio) => {
          sendSignal({ type: 'speaking-stop' });
          if (wsRef.current?.readyState === 1) {
            const wavBuffer = encodeWAV(audio, VAD_SAMPLE_RATE);
            wsRef.current.send(wavBuffer);
          }
        },
        onVADMisfire: () => { sendSignal({ type: 'speaking-stop' }); },
      });
      myvad.start();
      vadRef.current = myvad;

      sendSignal({ type: 'update-settings', micOn: true });
      setMicOn(true);
    } catch (err) {
      console.error('Start mic error:', err.message);
      setError(t('الرجاء السماح باستخدام المايكروفون', 'Please allow microphone access'));
    }
  };

  const stopMic = () => {
    if (vadRef.current) {
      try { vadRef.current.pause(); } catch (e) { /* تجاهل */ }
      vadRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    micStreamRef.current = null;
    sendSignal({ type: 'speaking-stop' });
    sendSignal({ type: 'update-settings', micOn: false });
    setMicOn(false);
  };

  const toggleMic = async () => {
    setMicBusy(true);
    try {
      if (micOn) stopMic(); else await startMic();
    } finally {
      setMicBusy(false);
    }
  };

  const startCam = async () => {
    try {
      const constraints = selectedCameraId ? { video: { deviceId: { exact: selectedCameraId } } } : { video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      camStreamRef.current = stream;
      if (!screenSharing) {
        peersRef.current.forEach((entry) => {
          stream.getVideoTracks().forEach((track) => entry.pc.addTrack(track, stream));
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }
      sendSignal({ type: 'update-settings', camOn: true });
      setCamOn(true);
    } catch (err) {
      setError(t('الرجاء السماح باستخدام الكاميرا', 'Please allow camera access'));
    }
  };

  const stopCam = () => {
    camStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    camStreamRef.current = null;
    if (!screenSharing && localVideoRef.current) localVideoRef.current.srcObject = null;
    sendSignal({ type: 'update-settings', camOn: false });
    setCamOn(false);
  };

  const toggleCam = async () => {
    setCamBusy(true);
    try {
      if (camOn) stopCam(); else await startCam();
    } finally {
      setCamBusy(false);
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      const screenTrack = stream.getVideoTracks()[0];
      peersRef.current.forEach((entry) => {
        const sender = entry.pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
        else entry.pc.addTrack(screenTrack, stream);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      screenTrack.onended = () => stopScreenShare();
      setScreenSharing(true);
    } catch (err) {
      console.error('Screen share error:', err.message);
    }
  };

  const stopScreenShare = () => {
    if (!screenStreamRef.current) return;
    screenStreamRef.current.getTracks().forEach((tr) => tr.stop());
    screenStreamRef.current = null;
    const camTrack = camStreamRef.current?.getVideoTracks()[0] || null;
    peersRef.current.forEach((entry) => {
      const sender = entry.pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(camTrack);
    });
    if (localVideoRef.current) localVideoRef.current.srcObject = camStreamRef.current || null;
    setScreenSharing(false);
  };

  const toggleScreenShare = () => { if (screenSharing) stopScreenShare(); else startScreenShare(); };

  // اختبار الصوت والصورة بالـLobby: يشغّل الكاميرا والمايك مؤقتًا للمعاينة فقط (بدون ما يكون داخل المكالمة بعد)
  const handleTestAV = async () => {
    setTestingAV(true);
    try {
      if (!camOn) await startCam();
      if (!micOn) await startMic();
      setMicLevelStream(micStreamRef.current);
    } finally {
      setTimeout(() => setTestingAV(false), 4000);
    }
  };

  const qualityIcon = (q) => {
    if (q === 'good') return <Signal size={12} color="#4ade80" />;
    if (q === 'fair') return <SignalMedium size={12} color="#facc15" />;
    if (q === 'poor') return <SignalLow size={12} color="#f87171" />;
    return null;
  };

  // ============================= LOBBY =============================
  if (!roomId) {
    const inviteHint = pendingJoinId ? `${window.location.origin}/live-translate/${pendingJoinId}` : '';
    return (
      <div style={{
        minHeight: '100vh', padding: '32px 24px', color: '#f3f0fa',
        background: 'radial-gradient(ellipse 1200px 700px at 15% -10%, rgba(168,85,247,0.16), transparent 60%), radial-gradient(ellipse 900px 600px at 100% 100%, rgba(236,72,153,0.08), transparent 55%), #0a0612',
      }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <button onClick={() => navigate('/')} className="lt-hover" style={{ background: 'none', border: 'none', color: '#c4b5fd', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, fontSize: 13.5 }}>
            <ArrowRight size={15} /> {t('رجوع', 'Back')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>N</div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.5 }}>NEXO</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '10px 0 4px', color: '#f3f0fa' }}>{t('الانضمام إلى الاجتماع', 'Join the Meeting')}</h1>
          <p style={{ color: '#a89fc2', margin: '0 0 22px', fontSize: 14.5 }}>
            {t('ابدأ مكالمة صوتية أو مرئية مع أي شخص — والترجمة الفورية بين اللغات متاحة كميزة أثناء المكالمة.', 'Start a voice or video call with anyone — instant translation between languages is available as a feature during the call.')}
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
            {[
              [ShieldCheck, t('آمن ومشفّر', 'Secure & encrypted')],
              [Zap, t('ترجمة فورية', 'Instant translation')],
              [Signal, t('دقة عالية', 'High quality')],
            ].map(([Icon, label], i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 14px', fontSize: 12.5, color: '#d8cff0' }}>
                <Icon size={13} color="#c084fc" /> {label}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
            {/* معاينة الفيديو */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22, padding: 18, backdropFilter: 'blur(12px)' }}>
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/10', background: '#150d22' }}>
                <video ref={localVideoRef} autoPlay playsInline muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: camOn ? 'block' : 'none' }} />
                {!camOn && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {myAvatarUrl ? (
                      <img src={myAvatarUrl} alt={name || 'Me'} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>
                        {(name || t('أنا', 'Me'))[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <span style={{ position: 'absolute', top: 10, insetInlineStart: 10, background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '3px 9px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Camera size={12} /> {t('معاينة الفيديو', 'Video preview')}
                </span>
                <div style={{ position: 'absolute', bottom: 10, insetInlineEnd: 10 }}>
                  <LiveWaveform stream={micLevelStream} active={testingAV && micOn} size="lg" />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11.5, color: '#a89fc2', display: 'block', marginBottom: 6 }}>{t('الكاميرا', 'Camera')}</label>
                <select value={selectedCameraId} onChange={(e) => setSelectedCameraId(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 13, marginBottom: 10, colorScheme: 'dark' }}>
                  <option value="" style={{ background: '#1a1424', color: '#fff' }}>{t('افتراضي', 'Default')}</option>
                  {cameraDevices.map((d) => <option key={d.deviceId} value={d.deviceId} style={{ background: '#1a1424', color: '#fff' }}>{d.label || t('كاميرا', 'Camera')}</option>)}
                </select>
                <label style={{ fontSize: 11.5, color: '#a89fc2', display: 'block', marginBottom: 6 }}>{t('المايكروفون', 'Microphone')}</label>
                <select value={selectedMicId} onChange={(e) => setSelectedMicId(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 13, marginBottom: 12, colorScheme: 'dark' }}>
                  <option value="" style={{ background: '#1a1424', color: '#fff' }}>{t('افتراضي', 'Default')}</option>
                  {micDevices.map((d) => <option key={d.deviceId} value={d.deviceId} style={{ background: '#1a1424', color: '#fff' }}>{d.label || t('مايكروفون', 'Microphone')}</option>)}
                </select>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={toggleCam} className="lt-hover" disabled={camBusy} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, border: 'none', cursor: camBusy ? 'wait' : 'pointer', fontSize: 12.5, background: camOn ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.06)', color: '#fff', opacity: camBusy ? 0.7 : 1 }}>
                    {camBusy ? <Loader2 size={15} className="lt-spin" /> : (camOn ? <Video size={15} /> : <VideoOff size={15} />)} {t('الكاميرا', 'Camera')}
                  </button>
                  <button onClick={toggleMic} className="lt-hover" disabled={micBusy} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, border: 'none', cursor: micBusy ? 'wait' : 'pointer', fontSize: 12.5, background: micOn ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.06)', color: '#fff', opacity: micBusy ? 0.7 : 1 }}>
                    {micBusy ? <Loader2 size={15} className="lt-spin" /> : (micOn ? <Mic size={15} /> : <MicOff size={15} />)} {t('المايك', 'Mic')}
                  </button>
                  <button onClick={handleTestAV} className="lt-hover" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, border: '1px solid rgba(168,85,247,0.4)', cursor: 'pointer', fontSize: 12.5, background: 'transparent', color: '#c4b5fd' }}>
                    <PlayCircle size={15} /> {t('اختبار', 'Test')}
                  </button>
                </div>
              </div>
            </div>

            {/* معلومات الاجتماع */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22, padding: 22, backdropFilter: 'blur(12px)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#e9e3f7' }}>{t('معلومات الاجتماع', 'Meeting Info')}</h3>

              <label style={{ fontSize: 11.5, color: '#a89fc2', display: 'block', marginBottom: 6 }}>{t('اسمك', 'Your name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('اكتب اسمك', 'Enter your name')}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 14, marginBottom: 14 }} />

              {!pendingJoinId && (
                <>
                  <label style={{ fontSize: 11.5, color: '#a89fc2', display: 'block', marginBottom: 6 }}>{t('رابط الاجتماع أو كود الغرفة (اختياري)', 'Meeting link or room code (optional)')}</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 12px' }}>
                      <Link2 size={14} color="#a89fc2" />
                      <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder={t('كود الغرفة', 'Room code')}
                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, padding: '10px 0' }} />
                    </div>
                    <button onClick={handleJoinByCode} className="lt-hover" style={{ padding: '0 16px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.4)', background: 'transparent', color: '#c4b5fd', cursor: 'pointer', fontSize: 12.5 }}>
                      {t('انضم بالكود', 'Join')}
                    </button>
                  </div>
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 11.5, color: '#a89fc2', display: 'block', marginBottom: 6 }}>{t('أتحدث بـ', 'Speak in')}</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['ar', 'en'].map((l) => (
                      <button key={l} onClick={() => setSpeakLang(l)} className="lt-hover" style={{
                        flex: 1, padding: '9px 6px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                        border: speakLang === l ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                        background: speakLang === l ? 'linear-gradient(135deg,rgba(124,58,237,0.35),rgba(236,72,153,0.2))' : 'rgba(255,255,255,0.04)', color: '#fff',
                      }}>{LANG_META[l].flag} {LANG_META[l].code}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11.5, color: '#a89fc2', display: 'block', marginBottom: 6 }}>{t('أسمع بـ', 'Hear in')}</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['en', 'ar'].map((l) => (
                      <button key={l} onClick={() => setListenLang(l)} className="lt-hover" style={{
                        flex: 1, padding: '9px 6px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                        border: listenLang === l ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                        background: listenLang === l ? 'linear-gradient(135deg,rgba(124,58,237,0.35),rgba(236,72,153,0.2))' : 'rgba(255,255,255,0.04)', color: '#fff',
                      }}>{LANG_META[l].flag} {LANG_META[l].code}</button>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p style={{ color: '#f87171', fontSize: 12.5, marginBottom: 12 }}>{error}</p>}

              <button
                onClick={pendingJoinId ? handleConfirmJoinViaLink : handleCreateCall}
                className="lt-hover lt-primary-btn"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700,
                  background: 'linear-gradient(135deg,#7c3aed,#ec4899)', color: '#fff', boxShadow: '0 10px 30px rgba(124,58,237,0.4)',
                }}
              >
                {pendingJoinId ? t('الانضمام الآن', 'Join Now') : t('إنشاء اجتماع', 'Create Meeting')} <ArrowRight size={16} style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />
              </button>

              <p style={{ textAlign: 'center', fontSize: 11, color: '#8a7fa8', marginTop: 14 }}>
                {t('الترجمة الصوتية تعمل تلقائيًا لحظة الحديث', 'Voice translation kicks in automatically as you speak')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================= IN-CALL =============================
  const otherParticipants = participants.filter((p) => p.id !== myId);
  const roomCodeShort = roomId.slice(0, 8).toUpperCase();
  const inviteLink = `${window.location.origin}/live-translate/${roomId}`;
  const myEntry = { id: myId, name, speakLang, listenLang, avatar: myAvatarUrl, micOn, camOn };

  const filteredParticipantsList = [myEntry, ...otherParticipants].filter((p) => {
    if (!participantSearch.trim()) return true;
    return (p.name || '').toLowerCase().includes(participantSearch.toLowerCase());
  });

  const groupMessages = chatThreads.group || [];
  const activeDmMessages = activeDmId ? (chatThreads[activeDmId] || []) : [];
  const activeDmParticipant = activeDmId ? otherParticipants.find((p) => p.id === activeDmId) : null;

  // قائمة المحادثات الخاصة: مشارك حالي بالغرفة + آخر رسالة (إن وجدت) + عدد غير مقروء
  const dmConversations = otherParticipants.map((p) => {
    const msgs = chatThreads[p.id] || [];
    const lastMsg = msgs[msgs.length - 1] || null;
    return { participant: p, lastMessage: lastMsg, unread: unreadCounts[p.id] || 0 };
  }).sort((a, b) => (b.lastMessage?.at || 0) - (a.lastMessage?.at || 0));

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="lt-callscreen">
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60 }}>
        {floatingReactions.map((r) => (
          <span key={r.id} style={{ position: 'absolute', bottom: 100, left: `${r.left}%`, fontSize: 34, animation: 'nexoFloatUp 2.2s ease-out forwards' }}>{r.emoji}</span>
        ))}
      </div>

      {dmToast && (
        <div
          className="lt-dm-toast"
          onClick={() => { setRightTab('chat'); setShowLog(true); setChatSubTab('private'); setActiveDmId(dmToast.fromId); setDmToast(null); }}
        >
          <div className="lt-dm-toast-icon"><Lock size={13} /></div>
          <div className="lt-dm-toast-texts">
            <div className="lt-dm-toast-title">{t(`رسالة خاصة من ${dmToast.name}`, `Private message from ${dmToast.name}`)}</div>
            <div className="lt-dm-toast-preview">{dmToast.text}</div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes nexoFloatUp { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-220px); opacity: 0; } }
        @keyframes nexoPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes nexoRecPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* ===== Top bar ===== */}
      <div className="lt-topbar">
        <div className="lt-topbar-left">
          <div className="lt-brand-dot">N</div>
          <div>
            <div className="lt-topbar-title">{t('اجتماع Nexo', 'Nexo Meeting')}</div>
            <div className="lt-topbar-sub">
              {isRecording ? t('محادثة قيد التسجيل', 'Recording in progress') : `${participants.length} ${t('مشاركين', 'participants')}`}
            </div>
          </div>
        </div>

        <div className="lt-topbar-center">
          <span className="lt-chip">
            <span className={`lt-dot ${connected ? 'good' : 'bad'}`} />
            {reconnecting ? t('إعادة اتصال...', 'Reconnecting...') : connected ? t('متصل', 'Connected') : t('اتصال...', 'Connecting')}
          </span>
          <span className="lt-chip">{formatDuration(duration)}</span>
          <span className="lt-chip">
            {t('كود', 'Code')}: <strong>{roomCodeShort}</strong>
            <button onClick={handleCopyCode} className="lt-chip-icon-btn" title={t('نسخ الكود', 'Copy code')}>
              {codeCopied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </span>
          <button onClick={handleCopyLink} className="lt-hover lt-chip lt-chip-btn">
            {copied ? <Check size={13} /> : <Copy size={13} />} {t('مشاركة الدعوة', 'Share invite')}
          </button>
          <button onClick={() => setShowQr((s) => !s)} className="lt-hover lt-chip lt-chip-btn">
            <QrCode size={13} /> QR
          </button>
        </div>

        <button onClick={handleEndCall} disabled={savingNotes} className="lt-hover lt-end-pill">
          <PhoneOff size={13} /> {savingNotes ? t('جارِ الحفظ...', 'Saving...') : t('إنهاء الاجتماع', 'End Meeting')}
        </button>
      </div>

      {error && <p style={{ color: '#f87171', fontSize: 12.5, padding: '10px 24px 0' }}>{error}</p>}

      {showQr && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ background: '#fff', padding: 10, borderRadius: 12 }}>
            <img alt="QR" width={130} height={130} src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(inviteLink)}`} />
          </div>
        </div>
      )}

      {/* ===== Body: 3 columns ===== */}
      <div className="lt-callbody">
        {/* Participants column */}
        {showParticipants && (
          <aside className="lt-col lt-participants-col">
            <div className="lt-col-header">{t('المشاركون', 'Participants')} ({participants.length})</div>
            <div className="lt-search-box">
              <Users size={13} />
              <input
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder={t('بحث عن مشارك...', 'Search participants...')}
              />
            </div>
            <div className="lt-participants-list">
              {filteredParticipantsList.map((p) => (
                <div key={p.id} className={`lt-participant-row ${speakingIds.has(p.id) ? 'speaking' : ''}`}>
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name || '?'} className="lt-participant-avatar-img" />
                  ) : (
                    <div className="lt-participant-avatar" style={{ background: p.id === myId ? 'linear-gradient(135deg,#7c3aed,#ec4899)' : '#6d28d9' }}>
                      {(p.name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="lt-participant-texts">
                    <div className="lt-participant-name">
                      {p.name}{p.id === myId ? ` (${t('أنت', 'You')})` : ''}
                    </div>
                    <div className="lt-participant-langs">
                      {LANG_META[p.speakLang]?.code} <ArrowRight size={9} style={{ transform: 'scaleX(-1)' }} /> {LANG_META[p.listenLang]?.code}
                    </div>
                  </div>
                  {p.camOn ? <Video size={13} className="lt-muted-icon-on" /> : <VideoOff size={13} className="lt-muted-icon-off" />}
                  {p.micOn ? <Mic size={13} className="lt-muted-icon-on" /> : <MicOff size={13} className="lt-muted-icon-off" />}
                  {p.id !== myId && (
                    <button
                      className="lt-participant-dm-btn"
                      title={t('محادثة خاصة', 'Private chat')}
                      onClick={() => { setRightTab('chat'); setShowLog(true); setChatSubTab('private'); setActiveDmId(p.id); }}
                    >
                      <MessageSquare size={13} />
                      {unreadCounts[p.id] > 0 && <span className="lt-participant-dm-dot" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="lt-hover lt-invite-btn" onClick={handleCopyLink}>
              <Users size={14} /> {t('دعوة مشاركين', 'Invite participants')}
            </button>
          </aside>
        )}

        {/* Video column */}
        <div className="lt-col lt-video-col">
          <div className="lt-video-grid">
            <div className={`lt-video-tile ${speakingIds.has(myId) ? 'speaking' : ''}`}>
              <video ref={localVideoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: screenSharing ? 'none' : 'scaleX(-1)', display: (camOn || screenSharing) ? 'block' : 'none' }} />
              {!camOn && !screenSharing && (
                <div className="lt-video-avatar-wrap">
                  {myAvatarUrl ? (
                    <img src={myAvatarUrl} alt={name || 'Me'} className="lt-video-avatar-img" />
                  ) : (
                    <div className="lt-video-avatar">{(name || t('أنا', 'Me'))[0].toUpperCase()}</div>
                  )}
                </div>
              )}
              <div className="lt-video-tag-topstart"><LangPill langCode={speakLang} /></div>
              <div className="lt-video-tag-bottomstart">
                {micOn ? <Mic size={12} /> : <MicOff size={12} />} {name || t('أنا', 'Me')} ({t('أنت', 'You')})
              </div>
              <div className="lt-video-tag-bottomend">
                <LiveWaveform stream={micStreamRef.current} active={micOn && speakingIds.has(myId)} />
              </div>
            </div>

            {otherParticipants.map((p) => {
              const isRawAudible = p.speakLang === listenLang;
              return (
                <div key={p.id} className={`lt-video-tile ${speakingIds.has(p.id) ? 'speaking' : ''}`}>
                  <video ref={(el) => { if (el) remoteVideoElsRef.current.set(p.id, el); }} autoPlay playsInline
                    muted={!isRawAudible}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: p.camOn ? 'block' : 'none' }} />
                  {!p.camOn && (
                    <div className="lt-video-avatar-wrap">
                      {(p.avatar || p.avatarUrl || p.photoUrl || p.picture) ? (
                        <img src={p.avatar || p.avatarUrl || p.photoUrl || p.picture} alt={p.name || '?'} className="lt-video-avatar-img" />
                      ) : (
                        <div className="lt-video-avatar" style={{ background: '#a855f7' }}>{(p.name || '?')[0].toUpperCase()}</div>
                      )}
                    </div>
                  )}
                  <div className="lt-video-tag-topstart" style={{ display: 'flex', gap: 4 }}>
                    <LangPill langCode={p.speakLang} />
                    {!isRawAudible && <span className="lt-translated-tag"><Languages size={10} /> {t('تُترجم', 'Translated')}</span>}
                  </div>
                  <div className="lt-video-tag-bottomstart">
                    {p.micOn ? <Mic size={12} /> : <MicOff size={12} />} {p.name}
                  </div>
                  {connectionQuality[p.id] && <div className="lt-video-tag-topend">{qualityIcon(connectionQuality[p.id])}</div>}
                  <div className="lt-video-tag-bottomend">
                    <LiveWaveform stream={remoteStreamsRef.current.get(p.id)} active={isRawAudible && speakingIds.has(p.id)} />
                    {!isRawAudible && speakingIds.has(p.id) && <Radio size={13} color="#c084fc" style={{ animation: 'nexoPulse 1s infinite' }} />}
                  </div>
                </div>
              );
            })}
          </div>

          {unclearHint && (
            <p style={{ textAlign: 'center', color: '#facc15', fontSize: 12, marginTop: 10 }}>
              {t('لم يتم فهم الكلام بوضوح — حاول التحدث بشكل أوضح', "Speech wasn't clear — try speaking more clearly")}
            </p>
          )}
        </div>

        {/* Right panel: Translation / Chat (tabbed) */}
        {showLog && (
          <aside className="lt-col lt-translate-col">
            <div className="lt-right-tabs">
              <button
                className={`lt-right-tab ${rightTab === 'translate' ? 'active' : ''}`}
                onClick={() => setRightTab('translate')}
              >
                <Languages size={13} /> {t('الترجمة', 'Translation')}
              </button>
              <button
                className={`lt-right-tab ${rightTab === 'chat' ? 'active' : ''}`}
                onClick={() => setRightTab('chat')}
              >
                <MessageSquare size={13} /> {t('المحادثة', 'Chat')}
                {totalUnread > 0 && <span className="lt-right-tab-badge">{totalUnread}</span>}
              </button>
            </div>

            {rightTab === 'translate' ? (
              <>
                <div className="lt-translate-feed">
                  {(myLastCaption || lastTranslation) && (
                    <>
                      {myLastCaption && (
                        <div className="lt-caption-card mine">
                          <div className="lt-caption-head">
                            <Mic size={11} /> {t('أنت', 'You')} <LangPill langCode={speakLang} style={{ fontSize: 9.5, padding: '1px 6px' }} />
                          </div>
                          <p>{myLastCaption}</p>
                        </div>
                      )}
                      {lastTranslation && (
                        <div className="lt-caption-card incoming">
                          <div className="lt-caption-head">
                            <Languages size={11} /> {lastTranslationFrom || t('مشارك', 'Participant')} <LangPill langCode={listenLang} style={{ fontSize: 9.5, padding: '1px 6px' }} />
                          </div>
                          <p>{lastTranslation}</p>
                        </div>
                      )}
                    </>
                  )}

                  {chatLog.length === 0 && !myLastCaption && !lastTranslation && (
                    <p className="lt-translate-empty">{t('الترجمة رح تظهر هون فور ما حد يحكي', 'Translations will appear here as soon as someone speaks')}</p>
                  )}

                  {[...chatLog].reverse().map((e, i) => (
                    <div key={i} className="lt-caption-card incoming subtle">
                      <div className="lt-caption-head">
                        <span>{e.fromName}</span> <LangPill langCode={e.lang} style={{ fontSize: 9.5, padding: '1px 6px' }} />
                      </div>
                      <p>{e.text}</p>
                    </div>
                  ))}
                </div>

                <div className="lt-translate-footer">
                  <label>{t('اللغة المستهدفة', 'Target language')}</label>
                  <select value={listenLang} onChange={(e) => setListenLang(e.target.value)} style={{ colorScheme: 'dark' }}>
                    {['ar', 'en'].map((l) => (
                      <option key={l} value={l} style={{ background: '#1a1424', color: '#fff' }}>{LANG_META[l].flag} {LANG_META[l].code}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* تبويبان: الجميع (عامة) / خاص (قائمة محادثات) */}
                <div className="lt-chat-subtabs">
                  <button
                    className={`lt-chat-subtab ${chatSubTab === 'public' ? 'active' : ''}`}
                    onClick={() => { setChatSubTab('public'); markThreadRead('group'); }}
                  >
                    <Users size={13} /> {t('الجميع', 'Everyone')}
                    {unreadCounts.group > 0 && <span className="lt-chat-subtab-badge">{unreadCounts.group}</span>}
                  </button>
                  <button
                    className={`lt-chat-subtab ${chatSubTab === 'private' ? 'active' : ''}`}
                    onClick={() => { setChatSubTab('private'); if (activeDmId) markThreadRead(activeDmId); }}
                  >
                    <Lock size={12} /> {t('خاص', 'Private')}
                    {(totalUnread - (unreadCounts.group || 0)) > 0 && (
                      <span className="lt-chat-subtab-badge">{totalUnread - (unreadCounts.group || 0)}</span>
                    )}
                  </button>
                </div>

                {chatSubTab === 'public' ? (
                  <>
                    <div className="lt-chat-scope-hint">
                      <Users size={11} /> {t('محادثة عامة — يراها كل المشاركين', 'Public chat — visible to everyone in the meeting')}
                    </div>
                    <div className="lt-chat-feed">
                      {groupMessages.length === 0 && (
                        <p className="lt-translate-empty">{t('لا يوجد رسائل بعد — ابدأ المحادثة', 'No messages yet — start the conversation')}</p>
                      )}
                      {groupMessages.map((m, i) => {
                        const isMine = m.fromId === myIdRef.current;
                        const sender = isMine ? myEntry : otherParticipants.find((p) => p.id === m.fromId);
                        return (
                          <div key={i} className={`lt-chat-bubble-row lt-msg-in ${isMine ? 'mine' : ''}`}>
                            {!isMine && (
                              sender?.avatar
                                ? <img src={sender.avatar} alt={m.fromName} className="lt-chat-bubble-avatar" />
                                : <div className="lt-chat-bubble-avatar-fallback">{(m.fromName || '?')[0].toUpperCase()}</div>
                            )}
                            <div className="lt-chat-bubble-col">
                              {!isMine && <div className="lt-chat-bubble-name">{m.fromName}</div>}
                              <div className="lt-chat-bubble">{m.text}</div>
                              <div className="lt-chat-bubble-time">{new Date(m.at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="lt-chat-input-row">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                        placeholder={t('اكتب رسالة...', 'Type a message...')}
                      />
                      <button onClick={sendChatMessage} disabled={!chatInput.trim()} title={t('إرسال', 'Send')}>
                        <ArrowRight size={15} style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />
                      </button>
                    </div>
                  </>
                ) : !activeDmId ? (
                  /* قائمة المحادثات الخاصة */
                  <div className="lt-dm-list">
                    {dmConversations.length === 0 && (
                      <p className="lt-translate-empty" style={{ padding: '16px 14px' }}>{t('لا يوجد مشاركين آخرين حاليًا', 'No other participants right now')}</p>
                    )}
                    {dmConversations.map(({ participant, lastMessage, unread }) => (
                      <div
                        key={participant.id}
                        className={`lt-dm-list-item ${unread > 0 ? 'unread' : ''}`}
                        onClick={() => { setActiveDmId(participant.id); markThreadRead(participant.id); }}
                      >
                        {participant.avatar
                          ? <img src={participant.avatar} alt={participant.name} className="lt-chat-bubble-avatar" style={{ width: 38, height: 38 }} />
                          : <div className="lt-chat-bubble-avatar-fallback" style={{ width: 38, height: 38, fontSize: 13 }}>{(participant.name || '?')[0].toUpperCase()}</div>}
                        <div className="lt-dm-list-texts">
                          <div className="lt-dm-list-top">
                            <span className="lt-dm-list-name">{participant.name}</span>
                            {lastMessage && (
                              <span className="lt-dm-list-time">{new Date(lastMessage.at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                          <div className="lt-dm-list-langs">
                            <span className="lt-dm-online-dot" /> {LANG_META[participant.speakLang]?.code} <ArrowRight size={9} style={{ transform: 'scaleX(-1)' }} /> {LANG_META[participant.listenLang]?.code}
                          </div>
                          <div className="lt-dm-list-preview">
                            {lastMessage ? lastMessage.text : t('ابدأ محادثة خاصة', 'Start a private chat')}
                          </div>
                        </div>
                        {unread > 0 && <span className="lt-dm-list-badge">{unread}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* محادثة خاصة مفتوحة */
                  <>
                    <div className="lt-dm-header">
                      <button className="lt-dm-back" onClick={() => setActiveDmId(null)} title={t('رجوع', 'Back')}>
                        <ArrowRight size={15} style={{ transform: lang === 'ar' ? 'none' : 'scaleX(-1)' }} />
                      </button>
                      <div className="lt-dm-header-texts">
                        <div className="lt-dm-header-name">
                          {activeDmParticipant?.name || t('مشارك', 'Participant')}
                          {activeDmParticipant && <span className="lt-dm-online-badge"><span className="lt-dm-online-dot" /> {t('متصل', 'Online')}</span>}
                        </div>
                        <div className="lt-dm-header-sub">
                          {activeDmParticipant && `${LANG_META[activeDmParticipant.speakLang]?.code} → ${LANG_META[activeDmParticipant.listenLang]?.code}`}
                          <span className="lt-dm-lock"><Lock size={10} /> {t('محادثة خاصة', 'Private chat')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="lt-chat-feed">
                      {activeDmMessages.length === 0 && (
                        <p className="lt-translate-empty">{t('لا يوجد رسائل بعد — ابدأ المحادثة', 'No messages yet — start the conversation')}</p>
                      )}
                      {activeDmMessages.map((m, i) => {
                        const isMine = m.fromId === myIdRef.current;
                        const sender = isMine ? myEntry : activeDmParticipant;
                        return (
                          <div key={i} className={`lt-chat-bubble-row lt-msg-in ${isMine ? 'mine' : ''}`}>
                            {!isMine && (
                              sender?.avatar
                                ? <img src={sender.avatar} alt={m.fromName} className="lt-chat-bubble-avatar" />
                                : <div className="lt-chat-bubble-avatar-fallback">{(m.fromName || '?')[0].toUpperCase()}</div>
                            )}
                            <div className="lt-chat-bubble-col">
                              <div className="lt-chat-bubble">{m.text}</div>
                              <div className="lt-chat-bubble-time">{new Date(m.at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="lt-chat-input-row">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                        placeholder={t('رسالة خاصة...', 'Private message...')}
                      />
                      <button onClick={sendChatMessage} disabled={!chatInput.trim()} title={t('إرسال', 'Send')}>
                        <ArrowRight size={15} style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </aside>
        )}
      </div>

      {/* ===== Bottom toolbar ===== */}
      <div className="lt-bottom-toolbar">
        <div className="lt-toolbar-more-wrap">
          <button className={`lt-hover lt-toolbar-btn ${moreMenuOpen ? 'active' : ''}`} onClick={() => setMoreMenuOpen((s) => !s)}>
            <MoreHorizontal size={17} />
            <span>{t('المزيد', 'More')}</span>
          </button>
          {moreMenuOpen && (
            <div className="lt-more-menu" onClick={(e) => e.stopPropagation()}>
              <div className="lt-more-item" onClick={() => { toggleRecording(); setMoreMenuOpen(false); }}>
                {isRecording ? <Square size={14} /> : <CircleDot size={14} />} {isRecording ? t('إيقاف التسجيل', 'Stop recording') : t('بدء التسجيل', 'Start recording')}
              </div>
              <div className="lt-more-item" onClick={() => { setShowQr((s) => !s); setMoreMenuOpen(false); }}>
                <QrCode size={14} /> {t('عرض QR', 'Show QR')}
              </div>
              <div className="lt-more-item" onClick={() => { setShowParticipants((s) => !s); setMoreMenuOpen(false); }}>
                <Users size={14} /> {showParticipants ? t('إخفاء المشاركين', 'Hide participants') : t('إظهار المشاركين', 'Show participants')}
              </div>
            </div>
          )}
        </div>

        <button
          className={`lt-hover lt-toolbar-btn ${showLog && rightTab === 'chat' ? 'active' : ''}`}
          onClick={() => { if (showLog && rightTab === 'chat') setShowLog(false); else { setRightTab('chat'); setShowLog(true); } }}
        >
          <MessageSquare size={17} />
          <span>{t('المحادثة', 'Chat')}</span>
          {totalUnread > 0 && <span className="lt-toolbar-badge">{totalUnread}</span>}
        </button>

        <button
          className={`lt-hover lt-toolbar-btn ${showLog && rightTab === 'translate' ? 'active' : ''}`}
          onClick={() => { if (showLog && rightTab === 'translate') setShowLog(false); else { setRightTab('translate'); setShowLog(true); } }}
        >
          <Languages size={17} />
          <span>{t('الترجمة', 'Translation')}</span>
        </button>

        <button className="lt-hover lt-toolbar-btn" onClick={toggleScreenShare}>
          {screenSharing ? <MonitorX size={17} /> : <MonitorUp size={17} />}
          <span>{t('مشاركة الشاشة', 'Screen share')}</span>
        </button>

        <div className="lt-toolbar-emoji-wrap">
          <button className="lt-hover lt-toolbar-btn" onClick={() => setShowEmojiPicker((s) => !s)}>
            <Smile size={17} />
            <span>{t('تفاعل', 'React')}</span>
          </button>
          {showEmojiPicker && (
            <div className="lt-emoji-popover" onClick={(e) => e.stopPropagation()}>
              {REACTION_EMOJIS.map((e) => <button key={e} onClick={() => sendReaction(e)} className="lt-hover lt-emoji-option">{e}</button>)}
            </div>
          )}
        </div>

        <button className={`lt-hover lt-toolbar-btn ${!micOn ? 'danger' : ''}`} onClick={toggleMic} disabled={micBusy}>
          {micBusy ? <Loader2 size={17} className="lt-spin" /> : (micOn ? <Mic size={17} /> : <MicOff size={17} />)}
          <span>{t('كتم الميكروفون', 'Mute mic')}</span>
        </button>

        <button className={`lt-hover lt-toolbar-btn ${!camOn ? 'danger' : ''}`} onClick={toggleCam} disabled={camBusy}>
          {camBusy ? <Loader2 size={17} className="lt-spin" /> : (camOn ? <Video size={17} /> : <VideoOff size={17} />)}
          <span>{t('إيقاف الكاميرا', 'Stop camera')}</span>
        </button>

        <button className="lt-hover lt-toolbar-btn end" onClick={handleEndCall} disabled={savingNotes}>
          <PhoneOff size={17} />
          <span>{t('إنهاء الاجتماع', 'End meeting')}</span>
        </button>
      </div>
    </div>
  );
}