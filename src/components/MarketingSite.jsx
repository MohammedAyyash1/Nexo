import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Image, Mic, FileText, Video, UserCircle2,
  ArrowLeft, Check, ChevronDown, Sparkles,
} from 'lucide-react';
import { API_BASE } from '../../config/api.js';
import { Logo } from './Logo.jsx';

const FEATURE_TABS = [
  { key: 'chat', icon: MessageSquare, title: 'AI Chat', desc: 'محادثة ذكية تفهم سياقك، تتذكّر تفضيلاتك، وتجيبك بدقة — بالفصحى أو بلهجتك المحلية.', ready: true },
  { key: 'image', icon: Image, title: 'Image Studio', desc: 'حوّل أي وصف نصي إلى صورة احترافية خلال ثوانٍ معدودة.', ready: true },
  { key: 'voice', icon: Mic, title: 'Voice Studio', desc: 'تحدّث واستمع بصوت طبيعي، وحوّل أي تسجيل صوتي إلى نص فورًا.', ready: true },
  { key: 'documents', icon: FileText, title: 'Documents', desc: 'ارفع ملفات PDF أو Word أو صور، ودع Nexo يقرأها ويحللها معك مباشرة.', ready: true },
  { key: 'video', icon: Video, title: 'Video Studio', desc: 'إنتاج ومونتاج فيديو بالذكاء الاصطناعي.', ready: false },
  { key: 'avatar', icon: UserCircle2, title: 'AI Avatar', desc: 'صورة رمزية متحركة تمثّلك أو علامتك التجارية.', ready: false },
];

const FAQ_ITEMS = [
  { q: 'هل يوجد خطة مجانية؟', a: 'نعم، خطة Nexo Free متاحة فورًا بدون بطاقة ائتمانية، بحدود استخدام يومية تكفي معظم الاستخدام العادي.' },
  { q: 'كيف يتم الدفع لخطة Pro؟', a: 'عبر تحويل بنكي أو PalPay — طرق دفع محلية، بدون الحاجة لبطاقة ائتمانية دولية. يتم تفعيل اشتراكك بعد مراجعة يدوية سريعة لإثبات التحويل.' },
  { q: 'هل يتذكّر Nexo محادثاتي السابقة؟', a: 'نعم، عبر نظام الذاكرة يمكن لـNexo حفظ تفضيلاتك وسياقك بمرور الوقت، مع تحكّم كامل منك بالحذف والتعديل والتثبيت لأي معلومة محفوظة.' },
  { q: 'هل أقدر أخلّي Nexo يحكي بلهجتي؟', a: 'أكيد — تقدر تختار من الفصحى أو عدة لهجات عربية (فلسطينية، مصرية، سورية، لبنانية، خليجية) من الإعدادات.' },
];

function formatPrice(amountMinor, currency) {
  return `${(amountMinor / 100).toFixed(0)} ${currency === 'ILS' ? '₪' : currency}`;
}

export function MarketingSite() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chat');
  const [openFaq, setOpenFaq] = useState(null);
  const [freePlan, setFreePlan] = useState(null);
  const [proPlan, setProPlan] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/payments/plans/free`).then((r) => r.json()).then((b) => b.success && setFreePlan(b.data)).catch(() => {});
    fetch(`${API_BASE}/api/v1/payments/plans/pro_monthly`).then((r) => r.json()).then((b) => b.success && setProPlan(b.data)).catch(() => {});
  }, []);

  const goToApp = () => navigate('/');
  const scrollToFeatures = () => document.getElementById('ms-features')?.scrollIntoView({ behavior: 'smooth' });

  const active = FEATURE_TABS.find((f) => f.key === activeTab);
  const ActiveIcon = active.icon;

  return (
    <div className="ms-page" dir="rtl">
      <nav className="ms-nav">
        <div className="landing-brand"><Logo size={30} /><span>Nexo</span></div>
        <button className="btn-primary-sm" onClick={goToApp}>ابدأ مجانًا</button>
      </nav>

      {/* Hero */}
      <section className="ms-hero">
        <div className="badge-pill">✨ Nexo</div>
        <h1>الذكاء الاصطناعي،<br /><span className="gradient-text">بلا حدود ولا تعقيد.</span></h1>
        <p className="ms-hero-sub">منصة واحدة تجمع كل أدوات الذكاء الاصطناعي التي تحتاجها — بلغتك، وبطريقة تفهم سياقك.</p>
        <div className="ms-hero-actions">
          <button className="btn-primary" onClick={goToApp}>ابدأ مجانًا</button>
          <button className="btn-outline-ms" onClick={scrollToFeatures}>استكشف Nexo</button>
        </div>

        <div className="ms-hero-visual">
          <div className="ms-orb ms-orb-1" />
          <div className="ms-orb ms-orb-2" />
          <div className="ms-hero-visual-card">
            <div className="ms-visual-dot" />
            <div className="ms-visual-line w-70 accent" />
            <div className="ms-visual-line w-50" />
            <div className="ms-visual-line w-85" />
          </div>
        </div>
      </section>

      {/* Concept */}
      <section className="ms-concept">
        <p>فكرة واحدة، <span className="gradient-text">أدوات الذكاء الاصطناعي</span> التي تحتاجها<br />في مكان واحد.</p>
      </section>

      {/* Interactive Features */}
      <section id="ms-features" className="ms-features">
        <h2>كل أداة، بمكانها الصح</h2>
        <div className="ms-tabs">
          {FEATURE_TABS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                className={`ms-tab ${activeTab === f.key ? 'active' : ''}`}
                onClick={() => setActiveTab(f.key)}
              >
                <Icon size={15} />
                {f.title}
                {!f.ready && <span className="ms-soon-dot" />}
              </button>
            );
          })}
        </div>

        <div className="ms-feature-panel">
          <div className="ms-feature-panel-icon"><ActiveIcon size={26} /></div>
          <h3>{active.title}{!active.ready && <span className="ms-soon-badge">قريبًا</span>}</h3>
          <p>{active.desc}</p>
        </div>
      </section>

      {/* How it works */}
      <section className="ms-how">
        <h2>بثلاث خطوات، تصل لنتيجتك</h2>
        <div className="ms-how-steps">
          <div className="ms-how-step"><span>01</span><h4>اكتب طلبك</h4><p>بلغتك الطبيعية، بدون أي تعقيد.</p></div>
          <div className="ms-how-step"><span>02</span><h4>Nexo يعالج الطلب</h4><p>يفهم السياق ويختار الأداة المناسبة.</p></div>
          <div className="ms-how-step"><span>03</span><h4>تحصل على نتيجتك</h4><p>جاهزة للاستخدام أو المشاركة فورًا.</p></div>
        </div>
      </section>

      {/* Showcase */}
      <section className="ms-showcase">
        <h2>أمثلة من قدرات Nexo</h2>
        <div className="ms-showcase-grid">
          <div className="ms-showcase-card">
            <span className="ms-showcase-label">محادثة</span>
            <p>"لخّصلي هاد التقرير بثلاث نقاط رئيسية"</p>
          </div>
          <div className="ms-showcase-card">
            <span className="ms-showcase-label">توليد صورة</span>
            <p>"صورة شعار بسيط لمشروع قهوة مختص، ألوان دافئة"</p>
          </div>
          <div className="ms-showcase-card">
            <span className="ms-showcase-label">تحليل ملف</span>
            <p>"اشرحلي أهم البنود بهاد العقد المرفق"</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="ms-pricing">
        <h2>اختر خطتك</h2>
        <div className="ms-pricing-grid">
          <div className="ms-price-card">
            <div className="ms-price-name">{freePlan?.name || 'Free'}</div>
            <div className="ms-price-amount">{freePlan ? formatPrice(freePlan.price_amount_minor, freePlan.currency) : '—'}</div>
            <button className="btn-outline-ms" onClick={goToApp}>ابدأ مجانًا</button>
          </div>
          <div className="ms-price-card featured">
            <div className="ms-price-tag">الأفضل قيمة</div>
            <div className="ms-price-name">{proPlan?.name || 'Pro'}</div>
            <div className="ms-price-amount">
              {proPlan ? formatPrice(proPlan.price_amount_minor, proPlan.currency) : '—'}
              <span> / شهريًا</span>
            </div>
            <button className="btn-primary-sm" onClick={goToApp}>ترقية إلى Pro</button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ms-faq">
        <h2>أسئلة شائعة</h2>
        <div className="ms-faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="ms-faq-item">
              <button className="ms-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{item.q}</span>
                <ChevronDown size={16} className={openFaq === i ? 'flipped' : ''} />
              </button>
              {openFaq === i && <p className="ms-faq-answer">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ms-final-cta">
        <Sparkles size={22} />
        <h2>جاهز تجرّب Nexo؟</h2>
        <button className="btn-cta" onClick={goToApp}>ابدأ الآن مجانًا <ArrowLeft size={15} /></button>
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