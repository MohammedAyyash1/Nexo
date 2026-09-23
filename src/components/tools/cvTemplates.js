// كتالوج قوالب CV — كل قالب: هوية لونية + تخطيط. إضافة قالب جديد = عنصر جديد بالمصفوفة فقط
export const CV_TEMPLATES = [
  { id: 'modern-purple', nameAr: 'أرجواني عصري', nameEn: 'Modern Purple', layout: 'sidebar', accent: '#7c3aed' },
  { id: 'clean-minimal', nameAr: 'مينيمال نظيف', nameEn: 'Clean Minimal', layout: 'classic', accent: '#475569' },
  { id: 'dark-professional', nameAr: 'احترافي داكن', nameEn: 'Dark Professional', layout: 'dark', accent: '#38bdf8' },
  { id: 'creative-gradient', nameAr: 'تدرّج إبداعي', nameEn: 'Creative Gradient', layout: 'gradient', accent: '#ec4899' },
  { id: 'classic-elegant', nameAr: 'كلاسيكي أنيق', nameEn: 'Classic Elegant', layout: 'classic', accent: '#92400e' },
  { id: 'simple-blue', nameAr: 'أزرق بسيط', nameEn: 'Simple Blue', layout: 'sidebar', accent: '#2563eb' },
];

export const CV_FONT_OPTIONS = [
  { id: 'sans', nameAr: 'عصري', nameEn: 'Modern', stack: "'Segoe UI', Tahoma, Arial, sans-serif" },
  { id: 'serif', nameAr: 'كلاسيكي', nameEn: 'Classic', stack: "Georgia, 'Times New Roman', serif" },
];

export const ACCENT_SWATCHES = ['#7c3aed', '#2563eb', '#0ea5e9', '#16a34a', '#ec4899', '#92400e', '#475569', '#dc2626'];