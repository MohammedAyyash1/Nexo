import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { translations } from '../translations.js';
import { Logo } from './Logo.jsx';
import { Sidebar, TOOL_GROUPS } from './Sidebar.jsx';
import { RightToolsPanel } from './RightToolsPanel.jsx';
import { QuickActions } from './QuickActions.jsx';
import '../styles/premium-theme.css';
import '../styles/nexo-premium-v4.css';
import { TopBar } from './TopBar.jsx';
import { InputBar } from './InputBar.jsx';
import { Message } from './Message.jsx';
import { speak, stopSpeaking } from '../utils/speech.js';
import { Settings } from './Settings.jsx';
import { SettingsModal } from './settings/SettingsModal.jsx';
import { AssistantModal } from './AssistantModal.jsx';
import { ProjectModal } from './ProjectModal.jsx';
import { API_BASE } from '../../config/api.js';
const LANG_KEY = 'nexo_lang';
const TOKEN_KEY = 'nexo_token';

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

export function ChatApp({ user, onLogout, onGoHome, onUserUpdate }) {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [lang, setLang] = useState(loadLang());
  const [attachment, setAttachment] = useState(null);
  const [fileError, setFileError] = useState('');
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showBrandMenu, setShowBrandMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 640
  );
  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredChats = chats.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    if (c.title.toLowerCase().includes(q)) return true;
    return c.messages.some((m) => m.content?.toLowerCase().includes(q));
  });
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState('general');
  const [autoRename, setAutoRename] = useState(true);
  const [assistants, setAssistants] = useState([]);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [toolsPanelCollapsed, setToolsPanelCollapsed] = useState(
      () => typeof window !== 'undefined' && window.innerWidth <= 1024
    );
    const t = translations[lang];
  const activeChat = chats.find((c) => c.id === activeChatId);
  const hasMessages = activeChat && activeChat.messages.length > 0;
  const activeAssistant = activeChat?.assistant_id ? assistants.find((a) => a.id === activeChat.assistant_id) : null;
  const activeProject = activeChat?.project_id ? projects.find((p) => p.id === activeChat.project_id) : null;
  const chatsByProject = chats.reduce((acc, c) => {
    if (c.project_id) { (acc[c.project_id] = acc[c.project_id] || []).push(c); }
    return acc;
  }, {});

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  });


  // تحميل المحادثات من Supabase عند فتح الشات
  // تحميل المحادثات من Supabase عند فتح الشات
  useEffect(() => {
    fetch(`${API_BASE}/api/chats`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.chats && data.chats.length) {
          setChats(data.chats);
          setActiveChatId(data.chats[0].id);
        } else {
          const newId = Date.now().toString();
          const freshChat = { id: newId, title: t.newChat, messages: [] };
          setChats([freshChat]);
          setActiveChatId(newId);
          fetch(`${API_BASE}/api/chats`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify({ id: newId, title: t.newChat }),
          });
        }
      })
      .catch((err) => console.error('Load chats error:', err))
      .finally(() => setChatsLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetChatId = params.get('chat');
    if (targetChatId && chats.some((c) => c.id === targetChatId)) {
      setActiveChatId(targetChatId);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [chats]);

useEffect(() => {
    fetch(`${API_BASE}/api/settings/chat`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setAutoRename(data.data?.auto_rename ?? true))
      .catch((err) => console.error('Load chat settings error:', err));
  }, []);
  useEffect(() => {
    fetch(`${API_BASE}/api/assistants`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setAssistants(data.assistants || []))
      .catch((err) => console.error('Load assistants error:', err));
  }, []);
  useEffect(() => {
    fetch(`${API_BASE}/api/projects`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []))
      .catch((err) => console.error('Load projects error:', err));
  }, []);
    useEffect(() => {
    fetch(`${API_BASE}/api/favorites/ids`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setFavoriteIds(new Set(data.ids || [])))
      .catch((err) => console.error('Load favorite ids error:', err));
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, loading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [activeChatId]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.dir = t.dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const updateChatMessages = (chatId, newMessages, newTitle) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, messages: newMessages, title: newTitle || c.title } : c)));
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const freshChat = { id: newId, title: t.newChat, messages: [] };
    setChats((prev) => [freshChat, ...prev]);
    setActiveChatId(newId);
    setInput('');
    fetch(`${API_BASE}/api/chats`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ id: newId, title: t.newChat }),
    }).catch((err) => console.error('Create chat error:', err));
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    setChats((prev) => {
      const filtered = prev.filter((c) => c.id !== chatId);
      if (filtered.length === 0) {
        const newId = Date.now().toString();
        const fresh = [{ id: newId, title: t.newChat, messages: [] }];
        setActiveChatId(newId);
        fetch(`${API_BASE}/api/chats`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify({ id: newId, title: t.newChat }),
        });
        return fresh;
      }
      if (chatId === activeChatId) setActiveChatId(filtered[0].id);
      return filtered;
    });
    fetch(`${API_BASE}/api/chats/${chatId}`, { method: 'DELETE', headers: authHeaders() })
      .catch((err) => console.error('Delete chat error:', err));
  };
const handleSelectAssistant = (assistant) => {
    const existing = chats.find((c) => c.assistant_id === assistant.id);
    if (existing) { setActiveChatId(existing.id); return; }
    const newId = Date.now().toString();
    const freshChat = { id: newId, title: assistant.name, messages: [], assistant_id: assistant.id };
    setChats((prev) => [freshChat, ...prev]);
    setActiveChatId(newId);
    setInput('');
    fetch(`${API_BASE}/api/chats`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ id: newId, title: assistant.name, assistantId: assistant.id }),
    }).catch((err) => console.error('Create assistant chat error:', err));
  };

  const handleAssistantSaved = (savedAssistant) => {
    setAssistants((prev) => {
      const exists = prev.some((a) => a.id === savedAssistant.id);
      return exists ? prev.map((a) => (a.id === savedAssistant.id ? savedAssistant : a)) : [savedAssistant, ...prev];
    });
    setAssistantModalOpen(false);
    setEditingAssistant(null);
  };

  const handleAssistantDeleted = (assistantId) => {
    setAssistants((prev) => prev.filter((a) => a.id !== assistantId));
    if (activeChat?.assistant_id === assistantId) handleNewChat();
    setAssistantModalOpen(false);
    setEditingAssistant(null);
  };
 const handleNewChatInProject = (project) => {
    const newId = Date.now().toString();
    const freshChat = { id: newId, title: project.name, messages: [], project_id: project.id };
    setChats((prev) => [freshChat, ...prev]);
    setActiveChatId(newId);
    setInput('');
    fetch(`${API_BASE}/api/chats`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ id: newId, title: project.name, projectId: project.id }),
    }).catch((err) => console.error('Create project chat error:', err));
  };

  const handleProjectSaved = (savedProject) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === savedProject.id);
      return exists ? prev.map((p) => (p.id === savedProject.id ? savedProject : p)) : [savedProject, ...prev];
    });
    setProjectModalOpen(false);
    setEditingProject(null);
  };

  const handleProjectDeleted = (projectId) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setChats((prev) => prev.map((c) => (c.project_id === projectId ? { ...c, project_id: null } : c)));
    setProjectModalOpen(false);
    setEditingProject(null);
  };
  const handleQuickDeleteProject = (project) => {
    if (!window.confirm(lang === 'en' ? `Delete project "${project.name}"?` : `حذف مشروع "${project.name}"؟`)) return;
    fetch(`${API_BASE}/api/projects/${project.id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => handleProjectDeleted(project.id))
      .catch((err) => console.error('Quick delete project error:', err));
  };

  const handleQuickDeleteAssistant = (assistant) => {
    if (!window.confirm(lang === 'en' ? `Delete assistant "${assistant.name}"?` : `حذف مساعد "${assistant.name}"؟`)) return;
    fetch(`${API_BASE}/api/assistants/${assistant.id}`, { method: 'DELETE', headers: authHeaders() })
      .then(() => handleAssistantDeleted(assistant.id))
      .catch((err) => console.error('Quick delete assistant error:', err));
  };
  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setFileError('');

    // حفظ الملف بالتخزين الدائم بالخلفية (لا يؤثر على تجربة الإرفاق اللحظية)
    if (activeChatId) persistFile(activeChatId, null, file);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDocx =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setAttachment({ kind: 'image', name: file.name, dataUrl: reader.result });
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = () => setAttachment({ kind: 'text', name: file.name, text: reader.result });
      reader.readAsText(file);
    } else if (isPdf && file.size < 15 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => setAttachment({ kind: 'pdf', name: file.name, dataUrl: reader.result });
      reader.readAsDataURL(file);
    } else if (isPdf || isDocx) {
      setAttachment({ kind: 'loading', name: file.name });
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem(TOKEN_KEY);
      fetch(`${API_BASE}/api/extract-file`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.text) setAttachment({ kind: 'text', name: file.name, text: data.text });
          else { setFileError(t.unsupportedFile); setAttachment(null); }
        })
        .catch(() => { setFileError(t.connectionError); setAttachment(null); });
    } else {
      setFileError(t.unsupportedFile);
    }
  };

  const removeAttachment = () => setAttachment(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        const token = localStorage.getItem(TOKEN_KEY);
        try {
          const res = await fetch(`${API_BASE}/api/transcribe`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
          });
          const data = await res.json();
          if (data.text) setInput((prev) => (prev ? prev + ' ' + data.text : data.text));
        } catch (err) { console.error('Transcription failed:', err); }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setFileError(lang === 'en' ? 'Microphone access is required.' : 'يجب السماح باستخدام المايكروفون.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => { if (isRecording) stopRecording(); else startRecording(); };

  const persistMessage = (chatId, role, content) => {
    return fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ role, content }),
    })
      .then((res) => res.json())
      .then((data) => data.message)
      .catch((err) => { console.error('Persist message error:', err); return null; });
  };
const persistFile = (chatId, file, fileObj) => {
    const formData = new FormData();
    formData.append('file', fileObj);
    formData.append('chatId', chatId);
    const token = localStorage.getItem(TOKEN_KEY);
    fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).catch((err) => console.error('Persist file error:', err));
  };
  const streamAssistantReply = (chatIdAtSend, apiMessages, baseDisplayMessages) => {
    setLoading(true);
    const token = localStorage.getItem(TOKEN_KEY);
    const chat = chats.find((c) => c.id === chatIdAtSend);

    fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ messages: apiMessages, lang, assistantId: chat?.assistant_id || null, projectId: chat?.project_id || null }),
    })
      .then(async (res) => {
        if (res.status === 401) { onLogout(); return; }
        if (!res.ok || !res.body) {
          let errorMessage = t.genericError;
          if (res.status === 429 || res.status === 503) {
            const errData = await res.json().catch(() => null);
            if (errData?.error) errorMessage = errData.error;
          }
          updateChatMessages(chatIdAtSend, [...baseDisplayMessages, { role: 'assistant', content: errorMessage }]);
          setLoading(false);
          return;
        }
let streamedText = '';
        let displayedLength = 0;
        let finished = false;
        let rafId = null;
        let lastTickTime = null;

        const MIN_CHARS_PER_SEC = 60;   // سرعة كشف أساسية ثابتة، قريبة من إحساس Claude
        const CATCHUP_SECONDS = 1.2;    // لو تراكم نص كثير جدًا (توليد سريع جدًا)، نسرّع الكشف حتى يلحق خلال هالمدة بالضبط

        updateChatMessages(chatIdAtSend, [...baseDisplayMessages, { role: 'assistant', content: '' }]);
        setLoading(false);

        const getLiveDisplayText = () => streamedText.split('\n\n__META__')[0];

        const revealTick = (now) => {
          if (finished) { rafId = null; return; }
          if (lastTickTime === null) lastTickTime = now;
          const dt = now - lastTickTime;
          lastTickTime = now;

          const fullDisplay = getLiveDisplayText();
          const remaining = fullDisplay.length - displayedLength;

          if (remaining > 0) {
            const effectiveCps = Math.max(MIN_CHARS_PER_SEC, remaining / CATCHUP_SECONDS);
            const step = Math.max(1, Math.round((effectiveCps * dt) / 1000));
            displayedLength = Math.min(fullDisplay.length, displayedLength + step);
            updateChatMessages(chatIdAtSend, [...baseDisplayMessages, { role: 'assistant', content: fullDisplay.slice(0, displayedLength) }]);
          }
          rafId = requestAnimationFrame(revealTick);
        };
        rafId = requestAnimationFrame(revealTick);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamedText += decoder.decode(value, { stream: true });
        }

        finished = true;
        if (rafId) cancelAnimationFrame(rafId);

        let finalText = streamedText;
        let usedSearch = false;
        let sources = [];
        let meta = null;
        const metaMarkerIndex = streamedText.indexOf('\n\n__META__');
        if (metaMarkerIndex !== -1) {
          finalText = streamedText.slice(0, metaMarkerIndex);
          const rawMetaJson = streamedText.slice(metaMarkerIndex + '\n\n__META__'.length);
          try {
            meta = JSON.parse(rawMetaJson);
            usedSearch = !!meta.usedSearch;
            sources = meta.sources || [];
          } catch (e) {
            console.error('Failed to parse meta JSON:', e);
          }
        }

        updateChatMessages(chatIdAtSend, [...baseDisplayMessages, { role: 'assistant', content: finalText, usedSearch, sources, truncated: !!meta?.truncated }]);
        if (finalText) {
          persistMessage(chatIdAtSend, 'assistant', finalText).then((saved) => {
            if (!saved) return;
            setChats((prev) => prev.map((c) => {
              if (c.id !== chatIdAtSend) return c;
              const msgs = [...c.messages];
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], id: saved.id };
              return { ...c, messages: msgs };
            }));
          });
        }
      })
      .catch(() => {
        updateChatMessages(chatIdAtSend, [...baseDisplayMessages, { role: 'assistant', content: t.connectionError }]);
        setLoading(false);
      });
  };

  const sendMessage = (text) => {
    if ((!text.trim() && !attachment) || loading || !activeChat) return;

    let finalText = text;
    let imagePayload = null;
    let pdfPayload = null;
    let displayImage = null;

    if (attachment?.kind === 'image') {
      imagePayload = attachment.dataUrl;
      displayImage = attachment.dataUrl;
      if (!finalText.trim()) finalText = lang === 'en' ? 'Describe this image.' : 'صف هذه الصورة.';
    } else if (attachment?.kind === 'pdf') {
      pdfPayload = attachment.dataUrl;
      if (!finalText.trim()) finalText = lang === 'en' ? 'Summarize this document.' : 'لخّص لي هذا الملف.';
    } else if (attachment?.kind === 'text') {
      finalText = `${text}\n\n[${attachment.name}]\n${attachment.text}`;
    }

    const attachmentLabel = attachment?.kind === 'pdf' ? ` 📎 ${attachment.name}` : '';
    const userMsg = { role: 'user', content: finalText + attachmentLabel, image: displayImage };
    const updatedMessages = [...activeChat.messages, userMsg];
    const isFirstMessage = activeChat.messages.length === 0;
    const newTitle = isFirstMessage && autoRename ? (text.slice(0, 30) || attachment?.name) : null;

    updateChatMessages(activeChatId, updatedMessages, newTitle);
    persistMessage(activeChatId, 'user', userMsg.content).then((saved) => {
      if (!saved) return;
      setChats((prev) => prev.map((c) => {
        if (c.id !== activeChatId) return c;
        const msgs = [...c.messages];
        const lastIdx = msgs.length - 1;
        if (msgs[lastIdx]?.role === 'user') msgs[lastIdx] = { ...msgs[lastIdx], id: saved.id };
        return { ...c, messages: msgs };
      }));
    });
    if (newTitle) {
      fetch(`${API_BASE}/api/chats/${activeChatId}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ title: newTitle }),
      }).catch((err) => console.error('Update title error:', err));
    }

    setInput('');
    setAttachment(null);

    const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }));
    const chatIdAtSend = activeChatId;

    if (imagePayload || pdfPayload) {
      setLoading(true);
      const token = localStorage.getItem(TOKEN_KEY);
      fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: apiMessages, lang, image: imagePayload, pdfFile: pdfPayload, assistantId: activeChat?.assistant_id || null, projectId: activeChat?.project_id || null }),
      })
        .then(async (res) => {
          if (res.status === 401) { onLogout(); return; }
          if (!res.ok || !res.body) {
            let errorMessage = t.genericError;
            if (res.status === 429 || res.status === 503) {
              const errData = await res.json().catch(() => null);
              if (errData?.error) errorMessage = errData.error;
            }
            updateChatMessages(chatIdAtSend, [...updatedMessages, { role: 'assistant', content: errorMessage }]);
            setLoading(false);
            return;
          }
          let streamedText = '';
          updateChatMessages(chatIdAtSend, [...updatedMessages, { role: 'assistant', content: '' }]);
          setLoading(false);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            streamedText += decoder.decode(value, { stream: true });
            const liveDisplayText = streamedText.split('\n\n__META__')[0];
            updateChatMessages(chatIdAtSend, [...updatedMessages, { role: 'assistant', content: liveDisplayText }]);
          }
          let finalText = streamedText;
          let usedSearch = false; let sources = []; let meta = null;
          const metaMarkerIndex = streamedText.indexOf('\n\n__META__');
          if (metaMarkerIndex !== -1) {
            finalText = streamedText.slice(0, metaMarkerIndex);
            try { meta = JSON.parse(streamedText.slice(metaMarkerIndex + '\n\n__META__'.length)); usedSearch = !!meta.usedSearch; sources = meta.sources || []; } catch (e) {}
          }
          updateChatMessages(chatIdAtSend, [...updatedMessages, { role: 'assistant', content: finalText, usedSearch, sources, truncated: !!meta?.truncated }]);
          if (finalText) persistMessage(chatIdAtSend, 'assistant', finalText);
        })
        .catch(() => { updateChatMessages(chatIdAtSend, [...updatedMessages, { role: 'assistant', content: t.connectionError }]); setLoading(false); });
    } else {
      streamAssistantReply(chatIdAtSend, apiMessages, updatedMessages);
    }
  };

  const handleContinue = () => {
    sendMessage(lang === 'en' ? 'Continue exactly where you left off, without repeating anything.' : 'أكمل من حيث توقفت بالضبط، بدون ما تعيد أي شي.');
  };

  const handleEditMessage = (index, newContent) => {
    if (!activeChat || loading) return;
    const msg = activeChat.messages[index];
    if (!msg?.id) return; // لسا ما اترفعت لقاعدة البيانات، ننتظر

    const truncated = activeChat.messages.slice(0, index);
    const editedMsg = { ...msg, content: newContent };
    const newMessages = [...truncated, editedMsg];
    updateChatMessages(activeChatId, newMessages);

    fetch(`${API_BASE}/api/chats/${activeChatId}/messages/${msg.id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ content: newContent }),
    }).catch((err) => console.error('Update message error:', err));

    fetch(`${API_BASE}/api/chats/${activeChatId}/messages/${msg.id}/after`, {
      method: 'DELETE', headers: authHeaders(),
    }).catch((err) => console.error('Delete after error:', err));

    const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));
    streamAssistantReply(activeChatId, apiMessages, newMessages);
  };
  const handleToggleFavorite = (message) => {
    if (favoriteIds.has(message.id)) {
      fetch(`${API_BASE}/api/favorites/by-message/${message.id}`, { method: 'DELETE', headers: authHeaders() })
        .then(() => setFavoriteIds((prev) => { const next = new Set(prev); next.delete(message.id); return next; }))
        .catch((err) => console.error('Remove favorite error:', err));
    } else {
      fetch(`${API_BASE}/api/favorites`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ chatId: activeChatId, messageId: message.id, chatTitle: activeChat?.title, content: message.content }),
      })
        .then((res) => res.json())
        .then((data) => { if (data.favorite) setFavoriteIds((prev) => new Set(prev).add(message.id)); })
        .catch((err) => console.error('Add favorite error:', err));
    }
  };
  const handleRegenerate = (index) => {
    if (!activeChat || loading) return;
    const msg = activeChat.messages[index];
    if (msg.role !== 'assistant') return;

    const truncated = activeChat.messages.slice(0, index);
    const lastUserMsg = truncated[truncated.length - 1];
    updateChatMessages(activeChatId, truncated);

    if (lastUserMsg?.id) {
      fetch(`${API_BASE}/api/chats/${activeChatId}/messages/${lastUserMsg.id}/after`, {
        method: 'DELETE', headers: authHeaders(),
      }).catch((err) => console.error('Delete after error:', err));
    }

    const apiMessages = truncated.map((m) => ({ role: m.role, content: m.content }));
    streamAssistantReply(activeChatId, apiMessages, truncated);
  };
  const handleSend = () => sendMessage(input);
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };
const handleToggleSpeak = (text, index) => {
    if (speakingIndex === index) {
      stopSpeaking();
      setSpeakingIndex(null);
      return;
    }
    fetch(`${API_BASE}/api/settings/voice`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => res.json())
      .then((res) => {
        speak(text, {
          voiceName: res.data?.voice_name,
          rate: res.data?.rate,
          pitch: res.data?.pitch,
          lang,
          onEnd: () => setSpeakingIndex(null),
        });
      })
      .catch(() => speak(text, { lang, onEnd: () => setSpeakingIndex(null) }));
    setSpeakingIndex(index);
  };
  const handleTogglePin = () => {
    if (!activeChat) return;
    const newPinned = !activeChat.pinned;
    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, pinned: newPinned } : c)));
    setMoreMenuOpen(false);
    fetch(`${API_BASE}/api/chats/${activeChatId}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ pinned: newPinned }),
    }).catch((err) => console.error('Toggle pin error:', err));
  };

  const handleToggleArchive = () => {
    if (!activeChat) return;
    const newArchived = !activeChat.archived;
    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, archived: newArchived } : c)));
    setMoreMenuOpen(false);
    fetch(`${API_BASE}/api/chats/${activeChatId}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ archived: newArchived }),
    }).catch((err) => console.error('Toggle archive error:', err));
  };

  const handleRenameChat = () => {
    if (!activeChat) return;
    const newTitle = prompt(lang === 'en' ? 'New chat name:' : 'اسم جديد للمحادثة:', activeChat.title);
    if (newTitle && newTitle.trim()) {
      updateChatMessages(activeChatId, activeChat.messages, newTitle.trim());
      showToast(lang === 'en' ? 'Chat renamed' : 'تمت إعادة تسمية المحادثة');
      fetch(`${API_BASE}/api/chats/${activeChatId}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ title: newTitle.trim() }),
      }).catch((err) => console.error('Rename chat error:', err));
    }
    setMoreMenuOpen(false);
  };

  const handleDeleteCurrentChat = () => {
    if (!activeChat) return;
    handleDeleteChat({ stopPropagation: () => {} }, activeChatId);
    setMoreMenuOpen(false);
  };

  const handleShare = () => {
    if (!activeChat || activeChat.messages.length === 0) return;
    const shareUrl = `${window.location.origin}/chat/${activeChatId}`;
    navigator.clipboard.writeText(shareUrl);
    showToast(lang === 'en' ? 'Link copied to clipboard' : 'تم نسخ الرابط العام إلى الحافظة');
  };
  const toolHandlers = {
    onOpenAvatar: () => navigate('/avatar'), onOpenSTT: () => navigate('/speech-to-text'), onOpenTTS: () => navigate('/text-to-speech'),
    onOpenImageStudio: () => navigate('/image-studio'), onOpenOcr: () => navigate('/ocr'), onOpenAdGenerator: () => navigate('/ad-generator'),
    onOpenDocuments: () => navigate('/ai-documents'), onOpenDataAnalyzer: () => navigate('/data-analyzer'), onOpenMeetingNotes: () => navigate('/meeting-notes'),
    onOpenCV: () => navigate('/cv-builder'), onOpenEmail: () => navigate('/email-assistant'), onOpenStudy: () => navigate('/study-mode'),
    onOpenFlashcards: () => navigate('/flashcards'), onOpenKnowledgeBase: () => navigate('/knowledge-base'), onOpenWorkflows: () => navigate('/workflows'),
    onOpenIslamic: () => navigate('/islamic-calculator'), onOpenYoutube: () => navigate('/youtube-summary'), onOpenNewsCheck: () => navigate('/news-check'),
    onOpenDialect: () => navigate('/dialect-converter'), onOpenCodeWorkspace: () => navigate('/code-workspace'), onOpenResearcher: () => navigate('/researcher'),
    onOpenVideoAnalysis: () => navigate('/video-analysis'), onOpenLiveTranslate: () => navigate('/live-translate'),
  };

  const handleQuickAction = (action) => {
    if (action.route) { navigate(action.route); return; }
    if (action.action === 'openTools') { setToolsPanelCollapsed(false); return; }
    if (action.action === 'attach') { fileInputRef.current?.click(); return; }
    if (action.prompt) { setInput(action.prompt); }
  };

  const inputBarProps = {
    attachment, fileError, input, setInput, handleKeyDown, handleSend, loading, t, fileInputRef, removeAttachment,
    isRecording, toggleRecording,
  };

  if (chatsLoading) {
    return (
      <div className="layout">
        <div className="welcome-screen" style={{ width: '100%' }}>
          <Logo size={48} />
          <h1>{lang === 'en' ? 'Loading your chats...' : 'جارِ تحميل محادثاتك...'}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="layout" style={{ display: 'flex' }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,.txt,.pdf,.docx" onChange={handleFileSelected} />

      <Sidebar
        t={t} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} toggleLang={toggleLang}
        searchOpen={searchOpen} setSearchOpen={setSearchOpen} showBrandMenu={showBrandMenu} setShowBrandMenu={setShowBrandMenu}
        onGoHome={onGoHome} onLogout={onLogout} handleNewChat={handleNewChat}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredChats={filteredChats}
        activeChatId={activeChatId} setActiveChatId={setActiveChatId} handleDeleteChat={handleDeleteChat} user={user}
        onOpenSettings={() => { setSettingsInitialSection('general'); setSettingsOpen(true); }}
        onOpenLibrary={() => navigate('/library')}
        onOpenAvatar={() => navigate('/avatar')}
        onOpenSTT={() => navigate('/speech-to-text')}
        onOpenTTS={() => navigate('/text-to-speech')}
        onOpenDocuments={() => navigate('/ai-documents')}
        onOpenImageStudio={() => navigate('/image-studio')}
       onOpenIslamic={() => navigate('/islamic-calculator')}
       onOpenCV={() => navigate('/cv-builder')}
       onOpenYoutube={() => navigate('/youtube-summary')}
       onOpenNewsCheck={() => navigate('/news-check')}
       onOpenDialect={() => navigate('/dialect-converter')}
       onOpenStudy={() => navigate('/study-mode')}
       onOpenOcr={() => navigate('/ocr')}
       onOpenDataAnalyzer={() => navigate('/data-analyzer')}
              onOpenMeetingNotes={() => navigate('/meeting-notes')}
                      onOpenEmail={() => navigate('/email-assistant')}
       lang={lang} assistants={assistants} activeAssistantId={activeChat?.assistant_id}
        onSelectAssistant={handleSelectAssistant}
        onCreateAssistant={() => { setEditingAssistant(null); setAssistantModalOpen(true); }}
        projects={projects} chatsByProject={chatsByProject}
        onCreateProject={() => { setEditingProject(null); setProjectModalOpen(true); }}
        onNewChatInProject={handleNewChatInProject}
        onDeleteProject={handleQuickDeleteProject}
        onDeleteAssistant={handleQuickDeleteAssistant}
                onOpenFlashcards={() => navigate('/flashcards')}
        onOpenCodeWorkspace={() => navigate('/code-workspace')}
        onOpenKnowledgeBase={() => navigate('/knowledge-base')}
        onOpenResearcher={() => navigate('/researcher')}
        onOpenWorkflows={() => navigate('/workflows')}
              onOpenAdGenerator={() => navigate('/ad-generator')}
             onOpenVideoAnalysis={() => navigate('/video-analysis')}
                     onOpenLiveTranslate={() => navigate('/live-translate')}
                             onOpenFavorites={() => navigate('/favorites')}
        onToggleToolsPanel={() => setToolsPanelCollapsed((c) => !c)}
      />

      {assistantModalOpen && (
        <AssistantModal
          mode={editingAssistant ? 'edit' : 'create'}
          assistant={editingAssistant}
          lang={lang}
          onClose={() => { setAssistantModalOpen(false); setEditingAssistant(null); }}
          onSaved={handleAssistantSaved}
          onDeleted={handleAssistantDeleted}
        />
      )}

      {projectModalOpen && (
        <ProjectModal
          mode={editingProject ? 'edit' : 'create'}
          project={editingProject}
          lang={lang}
          onClose={() => { setProjectModalOpen(false); setEditingProject(null); }}
          onSaved={handleProjectSaved}
          onDeleted={handleProjectDeleted}
        />
      )}

    {settingsOpen && (
        <SettingsModal
          user={user} lang={lang} toggleLang={toggleLang} onLogout={onLogout}
          onClose={() => setSettingsOpen(false)} showToast={showToast}
          onChatsCleared={() => { setChats([]); setActiveChatId(null); handleNewChat(); }}
          onAutoRenameChange={setAutoRename}
          initialSection={settingsInitialSection}
          onUserUpdate={onUserUpdate}
        />
      )}

      <main className="chat-main">
        <TopBar
          t={t} lang={lang} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar}
          handleShare={handleShare} hasMessages={hasMessages} moreMenuOpen={moreMenuOpen} setMoreMenuOpen={setMoreMenuOpen}
          activeChat={activeChat} handleTogglePin={handleTogglePin} handleToggleArchive={handleToggleArchive}
          handleRenameChat={handleRenameChat} handleDeleteCurrentChat={handleDeleteCurrentChat}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredChats={filteredChats} setActiveChatId={setActiveChatId}
        />

        {activeAssistant && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            background: 'rgba(var(--accent-rgb), 0.1)', borderBottom: '1px solid var(--border-subtle)',
            fontSize: 13, color: 'var(--text-primary)',
          }}>
            <span>🤖</span>
            <span>{lang === 'en' ? `Chatting with: ${activeAssistant.name}` : `تتحدث مع: ${activeAssistant.name}`}</span>
          </div>
        )}
        {!activeAssistant && activeProject && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            background: 'rgba(var(--accent-rgb), 0.1)', borderBottom: '1px solid var(--border-subtle)',
            fontSize: 13, color: 'var(--text-primary)',
          }}>
            <span>📁</span>
            <span>{lang === 'en' ? `Project: ${activeProject.name}` : `مشروع: ${activeProject.name}`}</span>
          </div>
        )}

        {!hasMessages ? (
          <div className="welcome-v3">
            <div className="welcome-v3-greeting">
              <div className="welcome-v3-badge"><Logo size={22} /></div>
              <h1 style={{ marginTop: 14 }}>
                {lang === 'en' ? <>Welcome to <span className="gradient-text">Nexo</span> 👋</> : <>مرحباً بك في <span className="gradient-text">Nexo</span> 👋</>}
              </h1>
              <p className="welcome-v3-sub">{t.welcomeHeading}</p>
            </div>
            <InputBar welcome {...inputBarProps} />
            <QuickActions lang={lang} onAction={handleQuickAction} />
          </div>
        ) : (
          <>
            <div className="chat-window">
              {activeChat.messages.map((m, i) => (
                <Message key={m.id || i} m={m} i={i} t={t} copiedIndex={copiedIndex} handleCopy={handleCopy}
                  speakingIndex={speakingIndex} handleToggleSpeak={handleToggleSpeak} lang={lang}
                  isLast={i === activeChat.messages.length - 1} onContinue={handleContinue} loading={loading}
                  onEdit={handleEditMessage} onRegenerate={handleRegenerate}
                  isFavorited={favoriteIds.has(m.id)} onToggleFavorite={handleToggleFavorite} user={user} />
              ))}
              {loading && (
                <div className="msg-row-v3 assistant">
                  <div className="msg-avatar">N</div>
                  <div className="msg-content-col">
                    <div className="bubble assistant typing"><span className="dot" /><span className="dot" /><span className="dot" /></div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="disclaimer">{t.disclaimer}</div>
            <InputBar {...inputBarProps} />
          </>
        )}
      </main>

      <RightToolsPanel
  lang={lang} toolGroups={TOOL_GROUPS} toolHandlers={toolHandlers}
  collapsed={toolsPanelCollapsed} onToggleCollapse={() => setToolsPanelCollapsed((c) => !c)}
  isMobileDrawer={window.innerWidth <= 1024}
  projects={projects}
  chatsByProject={chatsByProject}
  onCreateProject={() => { setEditingProject(null); setProjectModalOpen(true); }}
  onOpenProject={(p) => { const chats = chatsByProject[p.id] || []; if (chats.length) setActiveChatId(chats[0].id); else handleNewChatInProject(p); }}
/>

      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}