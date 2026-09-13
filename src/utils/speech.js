// إدارة قراءة النص بصوت عالٍ عبر Web Speech API (مجاني بالكامل، بدون Backend)

let currentUtterance = null;
let onEndCallback = null;

export function getAvailableVoices() {
  return window.speechSynthesis.getVoices();
}

export function speak(text, { onEnd, voiceName, rate, pitch, lang } = {}) {
  stopSpeaking();

  const cleanText = text
    .replace(/[#*_`~>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  onEndCallback = onEnd;

  let matchedVoice = null;
  if (voiceName) {
    matchedVoice = getAvailableVoices().find((v) => v.name === voiceName);
    if (matchedVoice) utterance.voice = matchedVoice;
  }

  // لازم نحدد "لغة" الـ utterance صراحة، وإلا بعض المتصفحات بتنطق النص
  // بلغة افتراضية (عادة إنجليزي) حتى لو اخترت صوت عربي
  if (matchedVoice) {
    utterance.lang = matchedVoice.lang;
  } else {
    utterance.lang = lang === 'en' ? 'en-US' : 'ar-SA';
  }

  utterance.rate = rate || 1.0;
  utterance.pitch = pitch || 1.0;

  utterance.onend = () => {
    currentUtterance = null;
    if (onEndCallback) onEndCallback();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    if (onEndCallback) onEndCallback();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}