import { useNavigate } from 'react-router-dom';
import {
  Settings as GeneralIcon, User, Brain, MessageSquare, Sparkles,
  Mic, Paperclip, ShieldCheck, Database, CreditCard, Info, Rocket, Bot, FolderKanban,
} from 'lucide-react';

const SECTIONS = [
  { id: 'general', labelAr: 'عام', labelEn: 'General', Icon: GeneralIcon },
  { id: 'personalization', labelAr: 'التخصيص', labelEn: 'Personalization', Icon: User },
  { id: 'memory', labelAr: 'الذاكرة', labelEn: 'Memory', Icon: Brain },
  { id: 'projects', labelAr: 'المشاريع', labelEn: 'Projects', Icon: FolderKanban },
  { id: 'assistants', labelAr: 'المساعدون', labelEn: 'Assistants', Icon: Bot },
  { id: 'chat', labelAr: 'المحادثة', labelEn: 'Chat', Icon: MessageSquare },
  { id: 'ai', labelAr: 'الذكاء الاصطناعي', labelEn: 'AI', Icon: Sparkles },
  { id: 'voice', labelAr: 'الصوت', labelEn: 'Voice', Icon: Mic },
  { id: 'files', labelAr: 'الملفات', labelEn: 'Files', Icon: Paperclip },
  { id: 'security', labelAr: 'الأمان', labelEn: 'Security', Icon: ShieldCheck },
  { id: 'data', labelAr: 'التحكم بالبيانات', labelEn: 'Data Controls', Icon: Database },
  { id: 'subscription', labelAr: 'الاشتراك', labelEn: 'Subscription', Icon: CreditCard },
  // عنصر خاص: لا يبدّل المحتوى الداخلي، بل ينقل المستخدم لصفحة /upgrade المستقلة
  { id: 'upgrade', labelAr: 'خطة الترقية', labelEn: 'Upgrade plan', Icon: Rocket, externalPath: '/upgrade' },
  { id: 'about', labelAr: 'حول', labelEn: 'About', Icon: Info },
];

export function SettingsNav({ active, onSelect, lang }) {
  const navigate = useNavigate();

  const handleClick = (section) => {
    if (section.externalPath) {
      navigate(section.externalPath);
    } else {
      onSelect(section.id);
    }
  };

  return (
    <nav className="nexo-settings-nav">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          className={`nexo-settings-nav-item ${active === s.id ? 'active' : ''}`}
          onClick={() => handleClick(s)}
        >
          <s.Icon size={16} />
          <span>{lang === 'en' ? s.labelEn : s.labelAr}</span>
        </button>
      ))}
    </nav>
  );
}

export { SECTIONS };