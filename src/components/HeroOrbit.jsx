import { useEffect, useRef } from 'react';
import {
  MessageSquare, Search, Image as ImageIcon, Video, FileStack, Mic, Brain,
  FolderKanban, FileUser, Moon, PlayCircle, ShieldCheck, Languages,
  GraduationCap, ScanText, BarChart3, Users, Mail, Layers, Code2,
  BookOpen, Workflow, Megaphone,
} from 'lucide-react';

const CAPABILITIES = [
  { label: 'محادثة', icon: MessageSquare, ready: true },
  { label: 'بحث الويب', icon: Search, ready: true },
  { label: 'المستندات', icon: FileStack, ready: true },
  { label: 'الصوت', icon: Mic, ready: true },
  { label: 'الذاكرة', icon: Brain, ready: true },
  { label: 'المشاريع', icon: FolderKanban, ready: true },
  { label: 'الصور', icon: ImageIcon, ready: false },
  { label: 'الفيديو', icon: Video, ready: false },
  { label: 'أفاتار', icon: FileUser, ready: false },
  { label: 'السيرة الذاتية', icon: FileUser, ready: true },
  { label: 'ملخّص يوتيوب', icon: PlayCircle, ready: true },
  { label: 'كاشف الأخبار', icon: ShieldCheck, ready: true },
  { label: 'العامية والفصحى', icon: Languages, ready: true },
  { label: 'وضع المذاكرة', icon: GraduationCap, ready: true },
  { label: 'استخراج نص', icon: ScanText, ready: true },
  { label: 'محلل البيانات', icon: BarChart3, ready: true },
  { label: 'محاضر الاجتماعات', icon: Users, ready: true },
  { label: 'الإيميلات', icon: Mail, ready: true },
  { label: 'البطاقات التعليمية', icon: Layers, ready: true },
  { label: 'مساحة الكود', icon: Code2, ready: true },
  { label: 'قاعدة المعرفة', icon: BookOpen, ready: true },
  { label: 'سلاسل العمل', icon: Workflow, ready: true },
  { label: 'مولّد الإعلانات', icon: Megaphone, ready: true },
  { label: 'الزكاة والمواريث', icon: Moon, ready: true },
];

export function HeroOrbit({ onStart }) {
  const stageRef = useRef(null);
  const step = 360 / CAPABILITIES.length;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const handleMove = (e) => {
      const rect = stage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty('--tilt-x', `${y * -8}deg`);
      stage.style.setProperty('--tilt-y', `${x * 10}deg`);
    };
    const handleLeave = () => {
      stage.style.setProperty('--tilt-x', '0deg');
      stage.style.setProperty('--tilt-y', '0deg');
    };

    stage.addEventListener('mousemove', handleMove);
    stage.addEventListener('mouseleave', handleLeave);
    return () => {
      stage.removeEventListener('mousemove', handleMove);
      stage.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <div className="orbit-stage" ref={stageRef}>
      <div className="orbit-tilt-wrap">
        <div className="orbit-halo orbit-halo-1" />
        <div className="orbit-halo orbit-halo-2" />

        <div className="orbit-core">
          <div className="orbit-core-glow" />
          <div className="orbit-core-highlight" />
        </div>

        <div className="orbit-ring" style={{ '--ring-duration': '90s' }}>
          {CAPABILITIES.map((item, i) => (
            <div key={item.label} className="orbit-item" style={{ '--angle': `${step * i}deg` }}>
              <div className="orbit-item-counter">
                <button
                  type="button"
                  className={`orbit-chip ${!item.ready ? 'soon' : ''}`}
                  onClick={() => onStart && onStart()}
                >
                  <item.icon size={15} />
                  <span>{item.label}</span>
                  {!item.ready && <em>قريبًا</em>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}