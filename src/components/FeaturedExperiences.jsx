import { useNavigate } from 'react-router-dom';
import {
  Radio, FileStack, BarChart3, FileUser, GraduationCap, Image as ImageIcon, ArrowLeft, ArrowRight,
} from 'lucide-react';

// كل route هون موجود فعليًا بـApp.jsx — لا شي وهمي
const FEATURED = [
  { key: 'livetranslate', path: '/live-translate', icon: Radio, size: 'hero', tone: 'purple',
    titleAr: 'المكالمات والاجتماعات', titleEn: 'Calls & Meetings',
    descAr: 'تحدّث بلغتك ودع Nexo يترجم المحادثة لحظيًا بين العربية والإنجليزية.',
    descEn: 'Speak your language and let Nexo translate the conversation live between Arabic and English.',
    ctaAr: 'ابدأ الآن', ctaEn: 'Start now' },
  { key: 'documents', path: '/ai-documents', icon: FileStack, size: 'wide', tone: 'blue',
    titleAr: 'تحليل المستندات', titleEn: 'AI Documents',
    descAr: 'ارفع ملف PDF أو Word ودع Nexo يلخّصه ويستخرج أهم نقاطه.',
    descEn: 'Upload a PDF or Word file and let Nexo summarize it and extract the key points.',
    ctaAr: 'حلّل ملفًا', ctaEn: 'Analyze a file' },
  { key: 'data', path: '/data-analyzer', icon: BarChart3, size: 'std', tone: 'teal',
    titleAr: 'محلل البيانات', titleEn: 'Data Analyzer',
    descAr: 'إحصائيات محسوبة من ملفات CSV وExcel، مع ملاحظات ذكية.',
    descEn: 'Real statistics computed from CSV and Excel files, with smart insights.',
    ctaAr: 'حلّل بياناتك', ctaEn: 'Analyze data' },
  { key: 'cv', path: '/cv-builder', icon: FileUser, size: 'std', tone: 'pink',
    titleAr: 'منشئ السيرة الذاتية', titleEn: 'CV Builder',
    descAr: 'اختر قالبًا، عبّئ بياناتك، وصدّر سيرتك بصيغة Word أو PDF.',
    descEn: 'Pick a template, fill your info, and export your CV as Word or PDF.',
    ctaAr: 'أنشئ سيرتك', ctaEn: 'Build your CV' },
  { key: 'study', path: '/study-mode', icon: GraduationCap, size: 'std', tone: 'amber',
    titleAr: 'وضع المذاكرة', titleEn: 'Study Mode',
    descAr: 'ملخص ومفاهيم واختبار تفاعلي من أي موضوع أو ملف.',
    descEn: 'A summary, key concepts, and an interactive quiz from any topic or file.',
    ctaAr: 'ابدأ المذاكرة', ctaEn: 'Start studying' },
  { key: 'image', path: '/image-studio', icon: ImageIcon, size: 'std', tone: 'rose', soon: true,
    titleAr: 'استوديو الصور', titleEn: 'Image Studio',
    descAr: 'توليد وتعديل الصور بالذكاء الاصطناعي.',
    descEn: 'Generate and edit images with AI.',
    ctaAr: 'اعرف المزيد', ctaEn: 'Learn more' },
];

// ===== رسومات توضيحية (Illustrations) خفيفة — SVG/CSS بحت، بدون بيانات وهمية على أنها نتائج =====
function LiveTranslateVisual() {
  return (
    <div className="welcome-featured-visual welcome-visual-translate" aria-hidden="true">
      <div className="wf-bubble wf-bubble-ar"><span>AR</span><i /><i className="short" /></div>
      <div className="wf-bubble-arrow">⇄</div>
      <div className="wf-bubble wf-bubble-en"><span>EN</span><i /><i className="short" /></div>
    </div>
  );
}

function DocumentVisual() {
  return (
    <div className="welcome-featured-visual welcome-visual-doc" aria-hidden="true">
      <div className="wf-doc"><b /><i /><i /><i className="short" /></div>
      <div className="wf-doc-tag">PDF · DOCX</div>
    </div>
  );
}

function DataVisual() {
  return (
    <div className="welcome-featured-visual welcome-visual-data" aria-hidden="true">
      {[38, 62, 46, 78, 55].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
    </div>
  );
}

function CvVisual() {
  return (
    <div className="welcome-featured-visual welcome-visual-cv" aria-hidden="true">
      <div className="wf-cv"><b /><i /><i className="short" /><i /></div>
    </div>
  );
}

function StudyVisual() {
  return (
    <div className="welcome-featured-visual welcome-visual-study" aria-hidden="true">
      <div className="wf-card wf-card-back" />
      <div className="wf-card wf-card-front"><i /><i className="short" /></div>
    </div>
  );
}

function ImageVisual() {
  return (
    <div className="welcome-featured-visual welcome-visual-image" aria-hidden="true">
      <div className="wf-frame"><span /></div>
    </div>
  );
}

const VISUALS = {
  livetranslate: LiveTranslateVisual,
  documents: DocumentVisual,
  data: DataVisual,
  cv: CvVisual,
  study: StudyVisual,
  image: ImageVisual,
};

export function FeaturedExperiences({ lang }) {
  const navigate = useNavigate();
  const isEn = lang === 'en';
  const Arrow = isEn ? ArrowRight : ArrowLeft;

  return (
    <section className="welcome-featured" aria-labelledby="welcome-featured-title">
      <div className="welcome-featured-head">
        <h2 id="welcome-featured-title" className="welcome-featured-title">
          {isEn ? 'The best of what you can do with Nexo' : 'أبرز ما يمكنك فعله مع Nexo'}
        </h2>
        <p className="welcome-featured-sub">
          {isEn ? 'Not just a chatbot — a complete AI workspace.' : 'ليس مجرد شات — بل مساحة عمل كاملة بالذكاء الاصطناعي.'}
        </p>
      </div>

      <div className="welcome-featured-grid">
        {FEATURED.map((f) => {
          const Icon = f.icon;
          const Visual = VISUALS[f.key];
          const title = isEn ? f.titleEn : f.titleAr;
          return (
            <button
              key={f.key}
              type="button"
              className={`welcome-featured-card welcome-featured-${f.size} tone-${f.tone}`}
              onClick={() => navigate(f.path)}
              aria-label={title}
            >
              <div className="welcome-featured-body">
                <div className="welcome-featured-top">
                  <span className="welcome-featured-icon" aria-hidden="true"><Icon size={18} /></span>
                  {f.soon && <span className="welcome-featured-soon">{isEn ? 'Soon' : 'قريبًا'}</span>}
                </div>
                <h3 className="welcome-featured-card-title" dir="auto">{title}</h3>
                <p className="welcome-featured-card-desc" dir="auto">{isEn ? f.descEn : f.descAr}</p>
                <span className="welcome-featured-cta">
                  {isEn ? f.ctaEn : f.ctaAr} <Arrow size={14} aria-hidden="true" />
                </span>
              </div>
              <Visual />
            </button>
          );
        })}
      </div>
    </section>
  );
}