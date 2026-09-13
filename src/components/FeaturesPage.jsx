import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Logo } from './Logo.jsx';

const FEATURES = [
  { icon: '💬', title: 'محادثة ذكية', desc: 'اسأل، ناقش، واحصل على إجابات دقيقة ومباشرة بأي وقت، مع دعم كامل للعربية والإنجليزية.' },
  { icon: '🎨', title: 'توليد الصور', desc: 'حوّل وصفك النصي إلى صورة احترافية خلال ثوانٍ معدودة.' },
  { icon: '🧠', title: 'ذاكرة تتعلّم منك', desc: 'Nexo يتذكّر تفضيلاتك وسياقك ويصنّفها (شخصية، عمل، تفضيلات، مشاريع)، ليقدّم لك ردودًا أكثر دقة مع كل محادثة — مع تحكّم كامل منك بالحذف والتعديل والتثبيت.' },
  { icon: '🌐', title: 'بحث لحظي بالويب', desc: 'إجابات مبنية على معلومات محدّثة، مع ذكر المصادر عند الحاجة.' },
  { icon: '📎', title: 'تحليل الملفات', desc: 'ارفع صورة، مستند PDF، أو ملف Word، ودع Nexo يقرأه ويحلله معك مباشرة داخل المحادثة.' },
  { icon: '🎙️', title: 'تفاعل صوتي', desc: 'تحدّث واستمع لردود Nexo بصوت طبيعي، وحوّل أي تسجيل صوتي إلى نص جاهز.' },
  { icon: '🗣️', title: 'لهجات عربية متعددة', desc: 'اختر أن يحادثك Nexo بالفصحى أو بلهجتك المحلية (فلسطينية، مصرية، سورية، لبنانية، خليجية).' },
  { icon: '⚙️', title: 'اختيار النموذج', desc: 'بخطة Pro، اختر النموذج الأنسب لمهمتك — سرعة أعلى أو تحليل أعمق — بدلًا من الاعتماد على اختيار تلقائي فقط.' },
  { icon: '💳', title: 'اشتراك بدفع محلي', desc: 'خطة Pro قابلة للدفع عبر تحويل بنكي أو PalPay، بدون الحاجة لبطاقة ائتمانية دولية.' },
];

export function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <div className="legal-page" dir="rtl">
      <nav className="legal-nav">
        <div className="landing-brand"><Logo size={28} /><span>Nexo</span></div>
        <button className="btn-ghost" onClick={() => navigate('/')}>
          <ArrowRight size={15} /> رجوع للرئيسية
        </button>
      </nav>

      <div className="wide-page-content">
        <h1>كل ما يقدّمه Nexo</h1>
        <p className="legal-updated">مجموعة أدوات ذكاء اصطناعي متكاملة، مبنية لتلائم استخدامك اليومي.</p>

        <div className="features-grid" style={{ marginTop: 48, maxWidth: 1100 }}>
          {FEATURES.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}