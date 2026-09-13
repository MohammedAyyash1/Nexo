import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  MessageSquare, Search, Image as ImageIcon, Video,
  FileStack, Mic, Brain, FolderKanban, FileUser, Moon,
  PlayCircle, ShieldCheck, Languages, GraduationCap, ScanText,
  BarChart3, Users, Mail, Layers, Code2, BookOpen, Workflow, Megaphone,
} from 'lucide-react';

const NexoCoreScene = lazy(() =>
  import('./NexoCore3D.jsx').then((m) => ({ default: m.NexoCoreScene }))
);

// الحلقة الداخلية: الأدوات الأساسية الأكثر استخدامًا
const INNER_RING = [
  { label: 'محادثة', icon: MessageSquare, ready: true, radius: 1.5, depthOffset: 0.08, speed: 0.05 },
  { label: 'بحث الويب', icon: Search, ready: true, radius: 1.65, depthOffset: -0.15, speed: 0.045 },
  { label: 'المستندات', icon: FileStack, ready: true, radius: 1.6, depthOffset: 0.18, speed: 0.04 },
  { label: 'الصوت', icon: Mic, ready: true, radius: 1.7, depthOffset: -0.08, speed: 0.05 },
  { label: 'الذاكرة', icon: Brain, ready: true, radius: 1.55, depthOffset: -0.25, speed: 0.038 },
  { label: 'المشاريع', icon: FolderKanban, ready: true, radius: 1.62, depthOffset: 0.1, speed: 0.055 },
];

// الحلقة الخارجية: باقي أدوات Nexo (بعضها قريبًا)
const OUTER_RING = [
  { label: 'الصور', icon: ImageIcon, ready: false, radius: 2.35, depthOffset: 0.3, speed: -0.028 },
  { label: 'الفيديو', icon: Video, ready: false, radius: 2.5, depthOffset: -0.35, speed: -0.024 },
  { label: 'أفاتار', icon: FileUser, ready: false, radius: 2.4, depthOffset: 0.2, speed: -0.03 },
  { label: 'السيرة الذاتية', icon: FileUser, ready: true, radius: 2.3, depthOffset: -0.1, speed: -0.026 },
  { label: 'ملخّص يوتيوب', icon: PlayCircle, ready: true, radius: 2.45, depthOffset: 0.28, speed: -0.032 },
  { label: 'كاشف الأخبار', icon: ShieldCheck, ready: true, radius: 2.38, depthOffset: -0.22, speed: -0.027 },
  { label: 'العامية والفصحى', icon: Languages, ready: true, radius: 2.42, depthOffset: 0.12, speed: -0.029 },
  { label: 'وضع المذاكرة', icon: GraduationCap, ready: true, radius: 2.33, depthOffset: -0.3, speed: -0.031 },
  { label: 'استخراج نص', icon: ScanText, ready: true, radius: 2.48, depthOffset: 0.05, speed: -0.025 },
  { label: 'محلل البيانات', icon: BarChart3, ready: true, radius: 2.36, depthOffset: -0.18, speed: -0.033 },
  { label: 'محاضر الاجتماعات', icon: Users, ready: true, radius: 2.44, depthOffset: 0.22, speed: -0.028 },
  { label: 'الإيميلات', icon: Mail, ready: true, radius: 2.3, depthOffset: -0.05, speed: -0.03 },
  { label: 'البطاقات التعليمية', icon: Layers, ready: true, radius: 2.4, depthOffset: 0.15, speed: -0.026 },
  { label: 'مساحة الكود', icon: Code2, ready: true, radius: 2.5, depthOffset: -0.28, speed: -0.024 },
  { label: 'قاعدة المعرفة', icon: BookOpen, ready: true, radius: 2.32, depthOffset: 0.08, speed: -0.032 },
  { label: 'سلاسل العمل', icon: Workflow, ready: true, radius: 2.46, depthOffset: -0.12, speed: -0.027 },
  { label: 'مولّد الإعلانات', icon: Megaphone, ready: true, radius: 2.34, depthOffset: 0.25, speed: -0.029 },
  { label: 'الزكاة والمواريث', icon: Moon, ready: true, radius: 2.28, depthOffset: -0.2, speed: -0.031 },
];

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// معيار واقعي: بس الأجهزة الضعيفة فعليًا (نواة وحدة أو اتنين) تعتبر "ضعيفة"
function detectWeakDevice() {
  const cores = navigator.hardwareConcurrency || 4;
  return cores <= 2;
}

export function HeroVisual({ onStart }) {
  const [status, setStatus] = useState('checking'); // checking | full | reduced | fallback

  useEffect(() => {
    const supportsWebGL = detectWebGL();
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isWeak = detectWeakDevice();

    if (!supportsWebGL) { setStatus('fallback'); return; }
    if (prefersReduced || isWeak) { setStatus('reduced'); return; }
    setStatus('full');
  }, []);

  const capabilities = useMemo(() => {
    const all = [...INNER_RING, ...OUTER_RING];
    const innerStep = (Math.PI * 2) / INNER_RING.length;
    const outerStep = (Math.PI * 2) / OUTER_RING.length;
    return all.map((c, i) => {
      const isInner = i < INNER_RING.length;
      const idx = isInner ? i : i - INNER_RING.length;
      const step = isInner ? innerStep : outerStep;
      const offset = isInner ? 0 : outerStep / 2;
      return { ...c, angle: step * idx + offset };
    });
  }, []);

  if (status === 'checking' || status === 'fallback') {
    return (
      <div className="hero-3d-fallback">
        <div className="hero-3d-fallback-orb" />
      </div>
    );
  }

  const isReduced = status === 'reduced';
  // بوضع reduced نعرض الحلقة الداخلية بس، حتى نخفف العبء على الجهاز
  const visibleCapabilities = isReduced ? capabilities.slice(0, INNER_RING.length) : capabilities;

  return (
    <Suspense fallback={<div className="hero-3d-fallback"><div className="hero-3d-fallback-orb" /></div>}>
      <div className="hero-3d-canvas-wrap hero-3d-canvas-contained">
        <NexoCoreScene
          capabilities={visibleCapabilities}
          particleCount={isReduced ? 22 : 70}
          reducedMotion={isReduced}
          dpr={isReduced ? [1, 1] : [1, 1.5]}
          onNodeClick={onStart}
        />
      </div>
    </Suspense>
  );
}