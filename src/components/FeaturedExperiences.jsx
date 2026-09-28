import { useNavigate } from 'react-router-dom';
import {
  Radio, FileUser, FileStack, BarChart3, GraduationCap, Image as ImageIcon,
  ArrowLeft, ArrowRight, Check, Mic, Video, Languages, PhoneOff, Sparkles,
} from 'lucide-react';

// ===== رسم توضيحي: نافذة اجتماع (زخرفي بحت — بدون بيانات حقيقية) =====
function MeetVisual() {
  return (
    <div className="wfx-meet wfx-ltr" aria-hidden="true">
      <div className="wfx-meet-bar">
        <span className="wfx-meet-live"><i /> Nexo</span>
        <span className="wfx-meet-chip">AR <Languages size={10} /> EN</span>
      </div>
      <div className="wfx-meet-tiles">
        <div className="wfx-tile">
          <span className="wfx-avatar" />
          <span className="wfx-wave"><i /><i /><i /><i /><i /></span>
        </div>
        <div className="wfx-tile t2">
          <span className="wfx-avatar" />
          <span className="wfx-wave"><i /><i /><i /><i /><i /></span>
        </div>
      </div>
      <div className="wfx-meet-caption">
        <b>EN</b>
        <span><i /><i className="s" /></span>
      </div>
      <div className="wfx-meet-toolbar">
        <span className="wfx-meet-btn"><Mic size={13} /></span>
        <span className="wfx-meet-btn"><Video size={13} /></span>
        <span className="wfx-meet-btn"><Languages size={13} /></span>
        <span className="wfx-meet-btn end"><PhoneOff size={13} /></span>
      </div>
    </div>
  );
}

// ===== رسم توضيحي: ورقة سيرة ذاتية + ألوان القوالب =====
function CvVisual() {
  return (
    <div className="wfx-cv wfx-ltr" aria-hidden="true">
      <div className="wfx-cv-sheet wfx-cv-sheet-back" />
      <div className="wfx-cv-sheet wfx-cv-sheet-front">
        <div className="wfx-cv-head">
          <span className="wfx-cv-photo" />
          <span className="wfx-cv-lines"><i /><i /></span>
        </div>
        <div className="wfx-cv-cols">
          <div className="wfx-cv-side"><i /><i /><i /><span /><span /></div>
          <div className="wfx-cv-main"><b /><i /><i /><i className="s" /><b /><i /><i className="s" /></div>
        </div>
      </div>
      <div className="wfx-cv-swatches"><span /><span /><span /><span /></div>
      <div className="wfx-cv-chip">PDF · Word</div>
    </div>
  );
}

// كل route هون موجود فعليًا بـApp.jsx
const SHOWCASE = [
  {
    key: 'meet', path: '/live-translate', icon: Radio, tone: 'meet', Visual: MeetVisual,
    tagAr: 'ترجمة فورية', tagEn: 'Live translation',
    titleAr: 'المكالمات والاجتماعات', titleEn: 'Calls & Meetings',
    descAr: 'مكالمة صوتية أو مرئية تترجم كلامك لحظيًا، فتتحدث بلغتك ويفهمك الجميع.',
    descEn: 'A voice or video call that translates your speech in real time — speak your language and everyone understands.',
    pointsAr: ['ترجمة صوتية فورية بين العربية والإنجليزية', 'مكالمات صوتية ومرئية مع محادثة عامة وخاصة', 'محضر اجتماع يُحفظ عند إنهاء المكالمة'],
    pointsEn: ['Live voice translation between Arabic and English', 'Voice and video calls with public and private chat', 'Meeting notes saved when the call ends'],
    ctaAr: 'ابدأ اجتماعًا', ctaEn: 'Start a meeting',
  },
  {
    key: 'cv', path: '/cv-builder', icon: FileUser, tone: 'cv', Visual: CvVisual,
    tagAr: 'قوالب احترافية', tagEn: 'Pro templates',
    titleAr: 'منشئ السيرة الذاتية', titleEn: 'CV Builder',
    descAr: 'ابنِ سيرة ذاتية أنيقة بقالب تختاره، وشاهدها تتكوّن أمامك مباشرة.',
    descEn: 'Build an elegant CV with a template you choose, and watch it take shape live.',
    pointsAr: ['قوالب احترافية مع ألوان وخطوط قابلة للتخصيص', 'معاينة حية لسيرتك أثناء الكتابة', 'تحسين النبذة بالذكاء الاصطناعي وتصدير Word أو PDF'],
    pointsEn: ['Professional templates with customizable colors and fonts', 'Live preview while you type', 'AI summary enhancement and Word or PDF export'],
    ctaAr: 'أنشئ سيرتك', ctaEn: 'Build your CV',
  },
];

const COMPACT = [
  { key: 'documents', path: '/ai-documents', icon: FileStack, tone: 'blue',
    titleAr: 'تحليل المستندات', titleEn: 'AI Documents',
    descAr: 'لخّص ملفات PDF وWord واستخرج أهم نقاطها.', descEn: 'Summarize PDF and Word files and extract the key points.' },
  { key: 'data', path: '/data-analyzer', icon: BarChart3, tone: 'teal',
    titleAr: 'محلل البيانات', titleEn: 'Data Analyzer',
    descAr: 'إحصائيات محسوبة من ملفات CSV وExcel مع ملاحظات ذكية.', descEn: 'Real statistics from CSV and Excel files, with smart insights.' },
  { key: 'study', path: '/study-mode', icon: GraduationCap, tone: 'amber',
    titleAr: 'وضع المذاكرة', titleEn: 'Study Mode',
    descAr: 'ملخص ومفاهيم واختبار تفاعلي من أي موضوع أو ملف.', descEn: 'A summary, key concepts, and a quiz from any topic or file.' },
  { key: 'image', path: '/image-studio', icon: ImageIcon, tone: 'rose', soon: true,
    titleAr: 'استوديو الصور', titleEn: 'Image Studio',
    descAr: 'توليد وتعديل الصور بالذكاء الاصطناعي.', descEn: 'Generate and edit images with AI.' },
];

export function FeaturedExperiences({ lang }) {
  const navigate = useNavigate();
  const isEn = lang === 'en';
  const Arrow = isEn ? ArrowRight : ArrowLeft;

  return (
    <section className="wfx" aria-labelledby="wfx-title">
      <div className="wfx-head">
        <span className="wfx-eyebrow"><Sparkles size={12} aria-hidden="true" /> {isEn ? 'Nexo highlights' : 'مميزات Nexo'}</span>
        <h2 id="wfx-title" className="wfx-title">
          {isEn ? 'The best of what you can do with Nexo' : 'أبرز ما يمكنك فعله مع Nexo'}
        </h2>
        <p className="wfx-sub">
          {isEn ? 'Not just a chatbot — a complete AI workspace.' : 'ليس مجرد شات — بل مساحة عمل كاملة بالذكاء الاصطناعي.'}
        </p>
      </div>

      <div className="wfx-showcase">
        {SHOWCASE.map((f) => {
          const Icon = f.icon;
          const Visual = f.Visual;
          const title = isEn ? f.titleEn : f.titleAr;
          return (
            <button
              key={f.key}
              type="button"
              className={`wfx-big wfx-tone-${f.tone}`}
              onClick={() => navigate(f.path)}
              aria-label={title}
            >
              <div className="wfx-big-visual"><Visual /></div>
              <div className="wfx-big-body">
                <div className="wfx-big-tagrow">
                  <span className="wfx-icon" aria-hidden="true"><Icon size={17} /></span>
                  <span className="wfx-tag">{isEn ? f.tagEn : f.tagAr}</span>
                </div>
                <h3 className="wfx-big-title" dir="auto">{title}</h3>
                <p className="wfx-big-desc" dir="auto">{isEn ? f.descEn : f.descAr}</p>
                <ul className="wfx-points">
                  {(isEn ? f.pointsEn : f.pointsAr).map((p) => (
                    <li key={p} dir="auto"><Check size={13} aria-hidden="true" /> <span>{p}</span></li>
                  ))}
                </ul>
                <span className="wfx-cta">
                  {isEn ? f.ctaEn : f.ctaAr} <Arrow size={15} aria-hidden="true" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="wfx-more-label">{isEn ? 'More powerful tools' : 'أدوات أخرى قوية'}</div>
      <div className="wfx-compact-grid">
        {COMPACT.map((f) => {
          const Icon = f.icon;
          const title = isEn ? f.titleEn : f.titleAr;
          return (
            <button
              key={f.key}
              type="button"
              className={`wfx-compact wfx-tone-${f.tone}`}
              onClick={() => navigate(f.path)}
              aria-label={title}
            >
              <div className="wfx-compact-top">
                <span className="wfx-icon" aria-hidden="true"><Icon size={17} /></span>
                {f.soon
                  ? <span className="wfx-soon">{isEn ? 'Soon' : 'قريبًا'}</span>
                  : <Arrow size={15} className="wfx-compact-arrow" aria-hidden="true" />}
              </div>
              <h3 className="wfx-compact-name" dir="auto">{title}</h3>
              <p className="wfx-compact-desc" dir="auto">{isEn ? f.descEn : f.descAr}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}