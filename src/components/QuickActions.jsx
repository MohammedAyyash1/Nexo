import { FileText, Image as ImageIcon, Radio, LayoutGrid } from 'lucide-react';

export function QuickActions({ lang, onAction, onOpenTools }) {
  const t = (ar, en) => (lang === 'en' ? en : ar);

  const actions = [
    { key: 'write', icon: FileText, labelAr: 'اكتب شيئًا', labelEn: 'Write something', descAr: 'مقالة، رسالة، محتوى...', descEn: 'Article, email, content...', prompt: lang === 'en' ? "Help me write: " : 'ساعدني أكتب: ' },
    { key: 'file', icon: FileText, labelAr: 'حلّل ملفًا', labelEn: 'Analyze a file', descAr: 'PDF, Excel, CSV...', descEn: 'PDF, Excel, CSV...', action: 'attach' },
    { key: 'image', icon: ImageIcon, labelAr: 'أنشئ صورة', labelEn: 'Create an image', descAr: 'من وصف نصي', descEn: 'From a text description', route: '/image-studio' },
    { key: 'translate', icon: Radio, labelAr: 'ترجم مباشرة', labelEn: 'Live translate', descAr: 'محادثات صوتية فورية', descEn: 'Real-time voice calls', route: '/live-translate' },
    { key: 'tools', icon: LayoutGrid, labelAr: 'اكتشف الأدوات', labelEn: 'Discover tools', descAr: 'كل أدوات Nexo', descEn: 'All Nexo tools', action: 'openTools' },
  ];

  return (
    <div className="nexo-quick-actions">
      {actions.map((a) => (
        <div key={a.key} className="nexo-premium-card nexo-quick-action-card" onClick={() => onAction(a)}>
          <div className="nexo-quick-action-icon"><a.icon size={16} /></div>
          <div className="nexo-quick-action-label">{lang === 'en' ? a.labelEn : a.labelAr}</div>
          <div className="nexo-quick-action-desc">{lang === 'en' ? a.descEn : a.descAr}</div>
        </div>
      ))}
    </div>
  );
}