import { useRef } from 'react';
import { Logo } from './Logo.jsx';
import { HeroOrbit } from './HeroOrbit.jsx';
import {
  MessageSquare, FileStack, Mic, Brain, ShieldCheck as PrivacyIcon,
  Video, Image as ImageIcon, FileUser, ScanText, BarChart3, Users,
  BookOpen, Mail, Layers, GraduationCap, Code2, Search, Workflow,
  Megaphone, Moon, PlayCircle, ShieldCheck, Languages,
} from 'lucide-react';

function TiltCard({ children, className = '' }) {
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--tilt-x', `${y * -6}deg`);
    el.style.setProperty('--tilt-y', `${x * 6}deg`);
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <div ref={ref} className={`tilt-card ${className}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {children}
    </div>
  );
}

export function Landing({ onStart }) {
  return (
    <div className="landing landing-v2">
      <nav className="landing-nav">
        <div className="landing-brand"><Logo size={32} /><span>Nexo</span></div>
        <div className="landing-nav-actions">
          <button className="btn-ghost" onClick={onStart}>تسجيل الدخول</button>
          <button className="btn-primary-sm" onClick={onStart}>ابدأ الآن</button>
        </div>
      </nav>

      {/* Hero: نص أولًا (Header→Badge→Headline→Description→CTA)، ثم صندوق النواة منفصل تحته */}
      <section className="hero-v3">
        <div className="hero-v3-bg" />

        <div className="hero-v3-text">
          <div className="badge-pill">✨ Nexo Core</div>
          <h1>
            <span className="hero-v3-brand">Nexo</span> — ذكاؤك الاصطناعي،<br />
            <span className="gradient-text">في مكان واحد.</span>
          </h1>
          <p className="hero-sub">
            Nexo يجمع المحادثة، البحث، الإبداع، الملفات، والصوت — كل أدوات الذكاء الاصطناعي التي تحتاجها، بمنصة واحدة.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={onStart}>ابدأ مجانًا</button>
            <button className="btn-outline-ms" onClick={() => document.getElementById('features-anchor')?.scrollIntoView({ behavior: 'smooth' })}>
              استكشف الأدوات
            </button>
          </div>
        </div>

        <div className="hero-v3-core-box">
  <HeroOrbit onStart={onStart} />
</div>
      </section>

      <div id="features-anchor" />

      {/* كيف تعمل منظومة Nexo */}
      <section className="ms-concept">
        <p>نواة واحدة، <span className="gradient-text">أدوات ذكاء اصطناعي</span> متكاملة<br />تدور حولها.</p>
      </section>

      {/* الميزات — بطاقات كبيرة بـTilt */}
      <section className="features-intro">
        <h2>قدرات Nexo</h2>
        <p>كل أداة مبنية ومختبرة فعليًا، بلا نماذج تجريبية.</p>
      </section>

<section className="v2-features-grid">
        <TiltCard className="v2-feature-card">
          <div className="feature-icon"><MessageSquare size={22} /></div>
          <h3>محادثة وبحث</h3>
          <p>محادثة ذكية بمزوّدين مع Fallback تلقائي، وبحث حقيقي بالويب مع مصادر موثّقة.</p>
        </TiltCard>
        <TiltCard className="v2-feature-card">
          <div className="feature-icon"><FileStack size={22} /></div>
          <h3>ملفات ومستندات</h3>
          <p>تحليل صور وPDF وWord مباشرة بالمحادثة، ومكتبة ملفات موحّدة بمكان واحد.</p>
        </TiltCard>
        <TiltCard className="v2-feature-card">
          <div className="feature-icon"><Mic size={22} /></div>
          <h3>صوت طبيعي</h3>
          <p>تحويل صوت لنص وعكسه، بدقة عالية وبالعربية والإنجليزية.</p>
        </TiltCard>
      </section>

      {/* شبكة كاملة تعرض كل أدوات Nexo مجمّعة بفئات — تملأ القسم وتوضح الوفرة الحقيقية */}
      <section className="owp-tools-groups" style={{ marginTop: 60, maxWidth: 980 }}>
        <div className="owp-tool-group">
          <h4>الصوت والصور</h4>
          <div className="owp-tools-grid">
            <div className="owp-tool-chip"><Video size={15} /><span>أفاتار</span><span className="owp-tool-soon-label">قريبًا</span></div>
            <div className="owp-tool-chip"><ImageIcon size={15} /><span>استوديو الصور</span><span className="owp-tool-soon-label">قريبًا</span></div>
            <div className="owp-tool-chip soon"><Video size={15} /><span>تحليل الفيديو</span><span className="owp-tool-soon-label">قريبًا</span></div>
          </div>
        </div>

        <div className="owp-tool-group">
          <h4>المستندات والبيانات</h4>
          <div className="owp-tools-grid">
            <div className="owp-tool-chip"><ScanText size={15} /><span>استخراج نص (OCR)</span></div>
            <div className="owp-tool-chip"><BarChart3 size={15} /><span>محلل البيانات</span></div>
            <div className="owp-tool-chip"><Users size={15} /><span>محاضر الاجتماعات</span></div>
            <div className="owp-tool-chip"><BookOpen size={15} /><span>قاعدة المعرفة</span></div>
          </div>
        </div>

        <div className="owp-tool-group">
          <h4>الإنتاجية</h4>
          <div className="owp-tools-grid">
            <div className="owp-tool-chip"><Mail size={15} /><span>مساعد الإيميلات</span></div>
            <div className="owp-tool-chip"><Layers size={15} /><span>البطاقات التعليمية</span></div>
            <div className="owp-tool-chip"><GraduationCap size={15} /><span>وضع المذاكرة</span></div>
            <div className="owp-tool-chip"><Code2 size={15} /><span>مساحة عمل الكود</span></div>
            <div className="owp-tool-chip"><Search size={15} /><span>الباحث</span></div>
            <div className="owp-tool-chip"><Workflow size={15} /><span>سلاسل العمل الآلية</span></div>
            <div className="owp-tool-chip"><Megaphone size={15} /><span>مولّد الإعلانات</span></div>
          </div>
        </div>

        <div className="owp-tool-group">
          <h4>أدوات متخصصة</h4>
          <div className="owp-tools-grid">
            <div className="owp-tool-chip"><Moon size={15} /><span>الزكاة والمواريث</span></div>
            <div className="owp-tool-chip"><FileUser size={15} /><span>منشئ السيرة الذاتية</span></div>
            <div className="owp-tool-chip"><PlayCircle size={15} /><span>ملخّص يوتيوب</span></div>
            <div className="owp-tool-chip"><ShieldCheck size={15} /><span>كاشف مصداقية الأخبار</span></div>
            <div className="owp-tool-chip"><Languages size={15} /><span>محوّل العامية والفصحى</span></div>
          </div>
        </div>
      </section>

      {/* الذاكرة والتخصيص */}
      <section className="v2-memory-section">
        <TiltCard className="v2-memory-card">
          <div className="feature-icon"><Brain size={24} /></div>
          <h2>ذاكرة تتعلّم منك</h2>
          <p>
            Nexo يتذكّر تفضيلاتك وسياقك من محادثاتك السابقة تلقائيًا، ليقدّم لك ردودًا أكثر دقة مع الوقت —
            مع تحكّم كامل منك: عدّل، ثبّت، أو احذف أي معلومة يدويًا بأي لحظة.
          </p>
        </TiltCard>
      </section>

      {/* الخصوصية */}
      <section className="owp-privacy">
        <div className="owp-privacy-icon"><PrivacyIcon size={26} /></div>
        <h2>الخصوصية أولًا</h2>
        <p className="owp-privacy-lead">الخصوصية عندنا جزء من تصميم Nexo، مش جملة تسويقية.</p>
        <div className="owp-privacy-grid">
          <div className="owp-privacy-item">
            <h4>بياناتك تحت تحكّمك</h4>
            <p>تصدير كامل لبياناتك، أو حذف حسابك نهائيًا، بأي وقت من الإعدادات.</p>
          </div>
          <div className="owp-privacy-item">
            <h4>تحكّم كامل بذاكرتك</h4>
            <p>تعديل أو حذف أي معلومة يحفظها Nexo عنك، فرديًا وبلا قيود.</p>
          </div>
          <div className="owp-privacy-item">
            <h4>اتصالات مشفّرة</h4>
            <p>بياناتك تُنقل عبر اتصالات مشفّرة، وكلمات المرور مخزّنة بشكل مشفّر.</p>
          </div>
          <div className="owp-privacy-item">
            <h4>لا نبيع بياناتك</h4>
            <p>لا نبيع أو نشارك بياناتك مع أطراف ثالثة لأغراض إعلانية.</p>
          </div>
        </div>
        <a href="/privacy" className="owp-privacy-link">اقرأ سياسة الخصوصية كاملة →</a>
      </section>

      <section className="cta">
        <h2>جاهز تبدأ؟</h2>
        <p>انضم الآن وابدأ بتحويل أفكارك إلى نتائج حقيقية.</p>
        <button className="btn-cta" onClick={onStart}>ابدأ الآن مجانًا</button>
        <div className="cta-note">بدون بطاقة ائتمانية — خطة مجانية متاحة فورًا.</div>
      </section>

      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="footer-brand"><Logo size={24} /><span>Nexo</span></div>
            <p className="footer-tagline">منصة ذكاء اصطناعي شاملة، بُنيت لتساعدك تنجز أكثر بوقت أقل.</p>
          </div>
          <div className="footer-links-group">
            <div className="footer-links-col">
              <h4>المنتج</h4>
              <a href="/features">المميزات</a>
              <a href="/upgrade">الأسعار</a>
            </div>
            <div className="footer-links-col">
              <h4>الشركة</h4>
              <a href="/about">من نحن</a>
              <a href="/contact">تواصل معنا</a>
            </div>
            <div className="footer-links-col">
              <h4>قانوني</h4>
              <a href="/privacy">سياسة الخصوصية</a>
              <a href="/terms">شروط الاستخدام</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2026 Nexo. جميع الحقوق محفوظة.</div>
        </div>
      </footer>
    </div>
  );
}