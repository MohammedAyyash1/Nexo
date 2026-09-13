import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShieldCheck, MapPin, Compass, ArrowLeft, Check, Clock } from 'lucide-react';
import { Logo } from './Logo.jsx';

// كل مجموعة = عنوان + قائمة ميزات. لإضافة ميزة جديدة، أضف سطر جديد بالقائمة المناسبة.
// ready:true = شغالة فعليًا الآن | ready:false = قريبًا (لا تُعرض كأنها متاحة)
const TOOL_GROUPS = [
  {
    title: 'المحادثة الأساسية',
    tools: [
      { label: 'محادثة ذكية بمزوّدين (Gemini + Groq) مع Fallback تلقائي', ready: true },
      { label: 'بحث حقيقي بالويب مع مصادر واستشهادات', ready: true },
      { label: 'رفع وتحليل صور وملفات PDF/Word بالمحادثة', ready: true },
      { label: 'تصدير أي رد كـWord أو PDF', ready: true },
      { label: 'سياق ذكي موفّر للتكلفة بالمحادثات الطويلة', ready: true },
      { label: 'أدوات تنفيذ حقيقية (حسابات دقيقة، تاريخ ووقت حقيقيَّين)', ready: true },
      { label: 'توليد الصور داخل المحادثة', ready: false },
    ],
  },
  {
    title: 'الذاكرة والتخصيص',
    tools: [
      { label: 'ذاكرة ذكية تتحدّث تلقائيًا وتتجنّب التكرار، بتحكّم يدوي كامل', ready: true },
      { label: 'تخصيص شخصية وأسلوب رد Nexo', ready: true },
      { label: 'مساعدون مخصصون بشخصية وملفات مرجعية خاصة', ready: true },
      { label: 'مشاريع/مساحات عمل تجمع محادثاتك وملفاتك بسياق مشترك', ready: true },
      { label: 'قاعدة معرفة شخصية تقدر تسأل Nexo عنها بأي وقت', ready: true },
    ],
  },
  {
    title: 'الصوت والمستندات',
    tools: [
      { label: 'تحويل صوت لنص (Speech to Text) عربي وإنجليزي', ready: true },
      { label: 'تحويل نص لصوت (Text to Speech)', ready: true },
      { label: 'تلخيص مستندات PDF/Word، واستخراج نص من الصور (OCR)', ready: true },
      { label: 'مكتبة ملفات موحّدة بمعاينة مباشرة', ready: true },
      { label: 'دمج وتعديل صور، وفيديو أفاتار متحدث', ready: false },
    ],
  },
  {
    title: 'أدوات الإنتاجية والتعلّم',
    tools: [
      { label: 'وضع مذاكرة ذكي: ملخص، مفاهيم، اختبار تفاعلي', ready: true },
      { label: 'بطاقات تعليمية قابلة للقلب من أي موضوع', ready: true },
      { label: 'محلل بيانات: إحصائيات محسوبة فعليًا من CSV/Excel', ready: true },
      { label: 'محاضر اجتماعات: تفريغ + ملخص + قرارات ومهام', ready: true },
      { label: 'مساعد إيميلات: كتابة ورد وتحسين بنبرات مختلفة', ready: true },
      { label: 'مساحة عمل كود: توليد وشرح وتصحيح وتحويل الكود', ready: true },
      { label: 'باحث: تقارير بحث معمّقة بمصادر حقيقية', ready: true },
      { label: 'سلاسل عمل آلية قابلة للتشغيل بضغطة زر', ready: true },
    ],
  },
  {
    title: 'أدوات متخصصة',
    tools: [
      { label: 'حاسبة الزكاة والمواريث', ready: true },
      { label: 'منشئ سيرة ذاتية احترافي، تصدير Word/PDF', ready: true },
      { label: 'ملخّص فيديوهات يوتيوب', ready: true },
      { label: 'كاشف مصداقية الأخبار عبر بحث حقيقي', ready: true },
      { label: 'محوّل بين الفصحى و٦ لهجات عربية', ready: true },
    ],
  },
];

export function OrganizationPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Nexo — منصة الذكاء الاصطناعي المتكاملة';

    const metaTags = [
      { name: 'description', content: 'Nexo منصة ذكاء اصطناعي متكاملة صُنعت في فلسطين، تجمع المحادثة الذكية وتوليد الصور وتحليل الملفات والذاكرة الشخصية في تجربة واحدة بسيطة وآمنة.' },
      { property: 'og:title', content: 'Nexo — منصة الذكاء الاصطناعي المتكاملة' },
      { property: 'og:description', content: 'مساحة واحدة لأدوات الذكاء الاصطناعي التي تحتاجها، صُنعت في فلسطين.' },
      { property: 'og:type', content: 'website' },
    ];

    const addedTags = metaTags.map((t) => {
      const el = document.createElement('meta');
      if (t.name) el.setAttribute('name', t.name);
      if (t.property) el.setAttribute('property', t.property);
      el.setAttribute('content', t.content);
      document.head.appendChild(el);
      return el;
    });

    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Nexo',
      applicationCategory: 'AI Assistant',
      operatingSystem: 'Web',
      description: 'منصة ذكاء اصطناعي متكاملة تجمع المحادثة الذكية وتوليد الصور وتحليل الملفات والذاكرة الشخصية.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' },
    });
    document.head.appendChild(schema);

    return () => {
      document.title = prevTitle;
      addedTags.forEach((el) => document.head.removeChild(el));
      document.head.removeChild(schema);
    };
  }, []);

  const goToApp = () => navigate('/');

  return (
    <div className="owp-page" dir="rtl">
      <nav className="ms-nav">
        <div className="landing-brand"><Logo size={30} /><span>Nexo</span></div>
        <button className="btn-primary-sm" onClick={goToApp}>ابدأ استخدام Nexo</button>
      </nav>

      {/* Hero */}
      <section className="owp-hero">
        <div className="owp-hero-logo"><Logo size={56} /></div>
        <h1>Nexo</h1>
        <p className="owp-hero-tagline">منصة ذكاء اصطناعي متكاملة، صُنعت لتكون مساحة واحدة لأدوات الذكاء الاصطناعي.</p>
      </section>

      {/* ما هو Nexo */}
      <section className="owp-section">
        <h2>ما هو Nexo؟</h2>
        <p>
          Nexo منصة ذكاء اصطناعي تجمع أدوات متعددة كنت تحتاج تتنقل بينها بشكل منفصل، وتضعها بتجربة واحدة متكاملة.
          محادثة ذكية تفهم سياقك وتتذكّر تفضيلاتك، توليد صور من وصف نصي بسيط، قراءة وتحليل ملفاتك، وتفاعل صوتي طبيعي —
          كل ذلك بواجهة واحدة مصمّمة لتكون سريعة وواضحة، بدون تعقيد أو أدوات متفرقة.
        </p>
      </section>

      

      {/* لماذا تم إنشاء Nexo */}
      <section className="owp-section">
        <h2>لماذا تم إنشاء Nexo؟</h2>
        <p>
          وُلدت فكرة Nexo من ملاحظة بسيطة: أدوات الذكاء الاصطناعي القوية موجودة، لكنها متفرقة — محادثة بمكان، توليد صور بمكان تاني، تحليل ملفات بأداة ثالثة.
          Nexo جاء ليجمعهم بتجربة واحدة، بلغة ووسائل دفع تناسب المستخدم العربي، بدل ما يضطر يتنقل بين خدمات منفصلة ما بتفهم سياقه أو واقعه.
        </p>
      </section>

      {/* أين صُنع Nexo */}
      <section className="owp-section">
        <h2><MapPin size={20} /> أين صُنع Nexo؟</h2>
        <p>طُوّر Nexo في فلسطين — بفكرة إنه أدوات الذكاء الاصطناعي القوية يجب أن تكون قريبة من المستخدم العربي، بلغته وبطريقة دفع تناسب واقعه.</p>
      </section>

      {/* الخصوصية أولًا */}
      <section className="owp-privacy">
        <div className="owp-privacy-icon"><ShieldCheck size={26} /></div>
        <h2>الخصوصية أولًا</h2>
        <p className="owp-privacy-lead">الخصوصية عندنا جزء من تصميم Nexo، مش جملة تسويقية مضافة لاحقًا.</p>
        <div className="owp-privacy-grid">
          <div className="owp-privacy-item">
            <h4>بياناتك تحت تحكّمك</h4>
            <p>تقدر تصدّر نسخة كاملة من بياناتك، أو تحذف حسابك نهائيًا، بأي وقت من داخل الإعدادات.</p>
          </div>
          <div className="owp-privacy-item">
            <h4>تحكّم كامل بذاكرتك</h4>
            <p>أي معلومة يحفظها Nexo عنك، تقدر تشوفها، تعدّلها، أو تحذفها فرديًا — بدون قيود.</p>
          </div>
          <div className="owp-privacy-item">
            <h4>اتصالات مشفّرة</h4>
            <p>بياناتك تُنقل عبر اتصالات مشفّرة، وكلمات المرور مخزّنة بشكل مشفّر (Hashed)، لا نصي (Plain text).</p>
          </div>
          <div className="owp-privacy-item">
            <h4>لا نبيع بياناتك</h4>
            <p>لا نبيع بياناتك أو نشاركها مع أطراف ثالثة لأغراض إعلانية.</p>
          </div>
        </div>
        <a href="/privacy" className="owp-privacy-link">اقرأ سياسة الخصوصية كاملة →</a>
      </section>

      {/* ما يميّز Nexo */}
      <section className="owp-section">
        <h2>ما الذي يميّز Nexo؟</h2>
        <ul className="owp-why-list">
          <li>تجربة واحدة بدل التنقل بين عشرات الأدوات المتفرقة.</li>
          <li>واجهة بسيطة وسريعة، بالعربية والإنجليزية.</li>
          <li>أدوات متعددة (محادثة، صور، ملفات، صوت) في مكان واحد.</li>
          <li>الخصوصية والأمان كجزء أساسي من المنتج، لا إضافة لاحقة.</li>
          <li>تطوير مستمر، وإضافة قدرات جديدة بشكل دوري.</li>
        </ul>
      </section>

      {/* رؤيتنا */}
      <section className="owp-vision">
        <Compass size={26} />
        <p>هدفنا بناء مساحة ذكاء اصطناعي واحدة، سهلة وقوية، يقدر المستخدم يعتمد عليها — بدل ما يتنقل بين مجموعة كبيرة من الخدمات المنفصلة.</p>
      </section>

      {/* Nexo اليوم */}
      <section className="owp-section owp-today">
        <h2>Nexo اليوم</h2>
        <div className="owp-tools-groups">
          {TOOL_GROUPS.map((group, gi) => (
            <div key={gi} className="owp-tool-group">
              <h4>{group.title}</h4>
              <div className="owp-tools-grid">
                {group.tools.map((t, ti) => (
                  <div key={ti} className={`owp-tool-chip ${!t.ready ? 'soon' : ''}`}>
                    {t.ready ? <Check size={13} /> : <Clock size={13} />}
                    {t.label}
                    {!t.ready && <span className="owp-tool-soon-label">قريبًا</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* صُنع بشغف */}
      <section className="owp-passion">
        <Sparkles size={24} />
        <h2>صُنع بشغف</h2>
        <p>
          Nexo مش مجرد واجهة تجمع خدمات جاهزة — هو مشروع بُني خطوة بخطوة، بهدف بناء تجربة ذكاء اصطناعي متكاملة فعليًا،
          بلغة وثقافة تفهم مستخدمها. لسا بأول الطريق، وبنطوّره باستمرار.
        </p>
      </section>

      {/* CTA */}
      <section className="owp-final-cta">
        <h2>اكتشف Nexo</h2>
        <button className="btn-cta" onClick={goToApp}>ابدأ استخدام Nexo <ArrowLeft size={15} /></button>
      </section>

      <footer className="landing-footer">
        <div className="footer-bottom" style={{ borderTop: 'none', paddingTop: 0 }}>
          <div className="footer-copy">© 2026 Nexo. جميع الحقوق محفوظة.</div>
        </div>
      </footer>
    </div>
  );
}