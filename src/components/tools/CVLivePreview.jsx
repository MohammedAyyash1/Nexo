import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mail, Phone, MapPin, Globe, Link2 } from 'lucide-react';
import { paginateBlocks } from './cvPagination.js';

const A4_W = 794;
const A4_H = 1123;
const PAGE_PAD = 46;

// ===== سلّم ضغط آمن وتدريجي — One-Page-First =====
// كل مستوى بيتم اختباره بقياس حقيقي فعلي بالمتصفح (مو تخمين)، وما بننتقل
// للمستوى التالي إلا لو المستوى الحالي فعليًا ما كفى. النص ما بينزل تحت 92%
// من حجمه الأصلي أبدًا (يضل مقروء).
const COMPRESSION_LEVELS = [
  { gap: 18, fontScale: 1, lineScale: 1 },    // 0: طبيعي
  { gap: 13, fontScale: 1, lineScale: 1 },    // 1: تقليل المسافات بين العناصر
  { gap: 9, fontScale: 1, lineScale: 1 },     // 2: تقليل أكبر للمسافات/الأقسام
  { gap: 9, fontScale: 1, lineScale: 0.94 },  // 3: تقليل بسيط لتباعد الأسطر
  { gap: 8, fontScale: 0.92, lineScale: 0.9 }, // 4: أقصى ضغط آمن (نص أصغر 8% بس)
];

function getContactFields(cv) {
  return [
    cv.email && { Icon: Mail, label: 'البريد الإلكتروني', value: cv.email },
    cv.phone && { Icon: Phone, label: 'الهاتف', value: cv.phone },
    cv.location && { Icon: MapPin, label: 'الموقع', value: cv.location },
    cv.website && { Icon: Globe, label: 'الموقع الإلكتروني', value: cv.website },
    cv.linkedin && { Icon: Link2, label: 'LinkedIn', value: cv.linkedin },
  ].filter(Boolean);
}

function ContactRow({ cv, light, iconColor, pills }) {
  const fields = getContactFields(cv);
  if (!fields.length) return null;
  return (
    <div className={`cv-page-contact-grid ${light ? 'cv-page-contact-grid-light' : 'cv-page-contact-grid-dark'} ${pills ? 'cv-page-contact-pills' : ''}`}>
      {fields.map((f, i) => (
        <div key={i} className="cv-page-contact-cell">
          <f.Icon size={22} className="cv-page-contact-icon" style={iconColor ? { color: iconColor } : undefined} />
          <div>
            <div className="cv-page-contact-label">{f.label}</div>
            <div className="cv-page-contact-value" dir="auto">{f.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactStack({ cv }) {
  const fields = getContactFields(cv);
  if (!fields.length) return null;
  return (
    <div className="cv-preview-contact-onaccent">
      {fields.map((f, i) => (
        <div key={i} className="cv-page-contact-item">
          <f.Icon size={24} className="cv-page-contact-icon" />
          <div>
            <div className="cv-page-contact-label">{f.label}</div>
            <div className="cv-page-contact-value" dir="auto">{f.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HorizonContact({ cv, color }) {
  const fields = getContactFields(cv);
  if (!fields.length) return null;
  return (
    <div className="cv-page-horizon-contact">
      {fields.map((f, i) => (
        <div key={i} className="cv-page-contact-item">
          <f.Icon size={22} className="cv-page-contact-icon" style={{ color }} />
          <div>
            <div className="cv-page-contact-label">{f.label}</div>
            <div className="cv-page-contact-value" dir="auto">{f.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CVLivePreview({ cv, template, accent, fontStack }) {
  const color = accent || template.accent;
  const layout = template.layout;
  const titleColor = layout === 'ats' ? '#111827' : layout === 'executive' ? '#1f2937' : color;
  const hasContent = cv.fullName || cv.summary || cv.experience.length > 0;
  const hasSidebar = layout === 'sidebar' || layout === 'horizon';
  const isTimeline = layout === 'aurora';
  // الرأس الوحيد اللي بياخذ مساحة من ارتفاع المحتوى الرئيسي (وليس من الـSidebar)
  const hasMainHeader = !hasSidebar || layout === 'horizon';

  const scrollRef = useRef(null);
  const [scale, setScale] = useState(0.48);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    let rafId = null;
    let tries = 0;
    const tryUpdate = () => {
      if (el.clientWidth > 0) { setScale(el.clientWidth / A4_W); return; }
      tries += 1;
      if (tries < 30) rafId = requestAnimationFrame(tryUpdate); // إعادة محاولة لحد ما العرض يصير فعلي (~نص ثانية كحد أقصى)
    };
    tryUpdate();
    const ro = new ResizeObserver(() => { if (el.clientWidth > 0) setScale(el.clientWidth / A4_W); });
    ro.observe(el);
    return () => { if (rafId) cancelAnimationFrame(rafId); ro.disconnect(); };
  }, []);

  const sectionTitleVariant = layout === 'aurora' ? 'cv-page-section-title-aurora'
    : layout === 'horizon' ? 'cv-page-section-title-horizon'
    : layout === 'executive' ? 'cv-page-section-title-exec'
    : '';

  const SectionTitle = ({ children }) => (
    <div
      className={`cv-page-section-title ${sectionTitleVariant}`}
      style={{ color: titleColor, borderBottomColor: `${titleColor}33`, borderInlineStartColor: titleColor }}
    >
      {children}
    </div>
  );

  const EntryWrap = ({ children }) => (
    isTimeline
      ? <div className="cv-page-timeline-item" style={{ borderInlineStartColor: color }}><span className="cv-page-timeline-dot" style={{ background: color }} />{children}</div>
      : children
  );

  const buildBlocks = () => {
    const blocks = [];

    if (cv.summary) {
      blocks.push({
        key: 'summary',
        node: (
          <div>
            <SectionTitle>{layout === 'ats' ? 'Profile' : 'نبذة'}</SectionTitle>
            <p className="cv-page-text">{cv.summary}</p>
          </div>
        ),
      });
    }

    if (cv.experience.length > 0) {
      blocks.push({ key: 'exp-title', node: <SectionTitle>{layout === 'ats' ? 'Experience' : 'الخبرات العملية'}</SectionTitle> });
      cv.experience.forEach((e, i) => {
        blocks.push({
          key: `exp-${i}`,
          node: (
            <EntryWrap>
              <div className="cv-page-entry">
                <div className="cv-page-entry-head"><strong>{e.role}</strong><span>{e.period}</span></div>
                <div className="cv-page-entry-sub">{e.company}</div>
                {e.description && <p className="cv-page-text">{e.description}</p>}
              </div>
            </EntryWrap>
          ),
        });
      });
    }

    if (cv.education.length > 0) {
      blocks.push({ key: 'edu-title', node: <SectionTitle>{layout === 'ats' ? 'Education' : 'التعليم'}</SectionTitle> });
      cv.education.forEach((e, i) => {
        blocks.push({
          key: `edu-${i}`,
          node: (
            <EntryWrap>
              <div className="cv-page-entry">
                <div className="cv-page-entry-head"><strong>{e.degree}</strong><span>{e.period}</span></div>
                <div className="cv-page-entry-sub">{e.institution}</div>
              </div>
            </EntryWrap>
          ),
        });
      });
    }

    if (cv.projects && cv.projects.length > 0) {
      blocks.push({ key: 'proj-title', node: <SectionTitle>{layout === 'ats' ? 'Projects' : 'المشاريع'}</SectionTitle> });
      cv.projects.forEach((p, i) => {
        blocks.push({
          key: `proj-${i}`,
          node: (
            <EntryWrap>
              <div className="cv-page-entry">
                <div className="cv-page-entry-head">
                  <strong>{p.name}</strong>
                  {p.link && <span className="cv-page-entry-link" style={{ color: layout === 'ats' ? '#374151' : color }} dir="ltr">{p.link}</span>}
                </div>
                {p.description && <p className="cv-page-text">{p.description}</p>}
              </div>
            </EntryWrap>
          ),
        });
      });
    }

    if (cv.certifications && cv.certifications.length > 0) {
      blocks.push({ key: 'cert-title', node: <SectionTitle>{layout === 'ats' ? 'Certifications' : 'الشهادات والدورات'}</SectionTitle> });
      cv.certifications.forEach((c, i) => {
        blocks.push({
          key: `cert-${i}`,
          node: (
            <EntryWrap>
              <div className="cv-page-entry">
                <div className="cv-page-entry-head"><strong>{c.name}</strong><span>{c.year}</span></div>
                <div className="cv-page-entry-sub">{c.issuer}</div>
              </div>
            </EntryWrap>
          ),
        });
      });
    }

    if ((layout === 'classic' || layout === 'ats' || layout === 'aurora' || layout === 'executive') && (cv.skills.length > 0 || cv.languages.length > 0)) {
      blocks.push({
        key: 'skills-langs',
        node: (
          <div style={{ display: 'flex', gap: 28 }}>
            {cv.skills.length > 0 && (
              <div style={{ flex: 1 }}>
                <SectionTitle>{layout === 'ats' ? 'Skills' : 'المهارات'}</SectionTitle>
                <div className="cv-page-chip-row">
                  {cv.skills.map((s, i) => (
                    <span key={i} className={layout === 'ats' ? 'cv-page-ats-chip' : 'cv-page-chip'} style={layout === 'ats' ? undefined : { borderColor: color, color }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {cv.languages.length > 0 && (
              <div style={{ flex: 1 }}>
                <SectionTitle>{layout === 'ats' ? 'Languages' : 'اللغات'}</SectionTitle>
                <div className="cv-page-chip-row">
                  {cv.languages.map((l, i) => (
                    <span key={i} className={layout === 'ats' ? 'cv-page-ats-chip' : 'cv-page-chip'} style={layout === 'ats' ? undefined : { borderColor: color, color }}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
      });
    }

    if ((layout === 'dark' || layout === 'gradient') && cv.skills.length > 0) {
      blocks.push({
        key: 'skills-chips',
        node: (
          <div className="cv-page-chip-row">
            {cv.skills.map((s, i) => (
              <span key={i} className="cv-page-chip" style={{ borderColor: color, color }}>{s}</span>
            ))}
          </div>
        ),
      });
    }

    return blocks;
  };

  const blocks = hasContent ? buildBlocks() : [];

  // ===== محرك القياس الحقيقي + الضغط التدريجي (One-Page-First) =====
  const measureRef = useRef(null);
  const headerMeasureRef = useRef(null);
  const contHeaderMeasureRef = useRef(null);

  const [compressionLevel, setCompressionLevel] = useState(0);
  const [measured, setMeasured] = useState(null); // { blockHeights, headerH, contHeaderH }

  const level = COMPRESSION_LEVELS[compressionLevel];
  const mainColWidth = hasSidebar ? A4_W * 0.7 - PAGE_PAD * 2 : A4_W - PAGE_PAD * 2;
  const headerMeasureWidth = hasSidebar ? mainColWidth : A4_W; // رؤوس القوالب بدون Sidebar تمتد بعرض الصفحة كاملة
  const contentSignature = JSON.stringify({ cv, layout, fontStack, color });

  // أي تغيير حقيقي بالمحتوى/القالب → نعيد المحاولة من مستوى الضغط صفر (One-Page-First دايمًا أولوية)
  useEffect(() => {
    setCompressionLevel(0);
    setMeasured(null);
  }, [contentSignature]);

  const measureStyle = {
    '--cv-accent': color,
    '--cv-font-scale': level.fontScale,
    '--cv-line-scale': level.lineScale,
    fontFamily: fontStack,
  };

  useLayoutEffect(() => {
    if (blocks.length === 0) { setMeasured({ blockHeights: [], headerH: 0, contHeaderH: 0 }); return; }
    if (!measureRef.current) return;

    const kids = Array.from(measureRef.current.children);
    const blockHeights = kids.map((k) => k.getBoundingClientRect().height);
    const headerH = hasMainHeader && headerMeasureRef.current ? headerMeasureRef.current.getBoundingClientRect().height : 0;
    const contHeaderH = contHeaderMeasureRef.current ? contHeaderMeasureRef.current.getBoundingClientRect().height : 0;

    const available = A4_H - PAGE_PAD * 2;
    const firstCapacity = available - headerH;
    // مجموع ارتفاع المحتوى الحقيقي + الفجوات بين العناصر فقط (بدون فجوة زايدة بعد آخر عنصر)
    const totalWithGaps = blockHeights.reduce((s, h) => s + h, 0) + Math.max(0, blockHeights.length - 1) * level.gap;

    if (totalWithGaps > firstCapacity && compressionLevel < COMPRESSION_LEVELS.length - 1) {
      // ما كفت صفحة وحدة بهالمستوى من الضغط — جرّب المستوى الأشد بعده (وبيعاد قياس حقيقي جديد بنفس الـEffect)
      setCompressionLevel((l) => l + 1);
      return;
    }

    setMeasured({ blockHeights, headerH, contHeaderH });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSignature, compressionLevel]);

  if (!hasContent) {
    return (
      <div className="cv-page-scroll" ref={scrollRef}>
        <div className="cv-page-stack">
          <div className="cv-page-frame" style={{ width: A4_W * scale, height: A4_H * scale }}>
            <div className="cv-page-scaler" style={{ width: A4_W, height: A4_H, transform: `scale(${scale})` }}>
              <div className="cv-preview-page cv-preview-empty" style={{ '--cv-accent': color, fontFamily: fontStack, fontSize: 34 }}>
                <p>عبّي البيانات على اليسار وشوف سيرتك الذاتية تتكوّن هون مباشرة.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const style = { '--cv-accent': color, '--cv-font-scale': level.fontScale, '--cv-line-scale': level.lineScale, fontFamily: fontStack };

  const renderMainBlocks = (indices) => indices.map((i) => (
    <div key={blocks[i].key} style={{ marginBottom: level.gap }}>{blocks[i].node}</div>
  ));

  const renderContinuationHeader = () => (
    <div className="cv-page-continuation-header" style={{ borderBottomColor: `${titleColor}33`, color: titleColor }}>
      <span className="cv-page-continuation-name">{cv.fullName}</span>
      <span style={{ color: titleColor, opacity: 0.75 }}>{cv.jobTitle}</span>
    </div>
  );

  const renderFirstPageHeader = () => {
    if (layout === 'ats') {
      return (
        <div className="cv-page-ats-header">
          <h2>{cv.fullName || 'اسمك الكامل'}</h2>
          <p>{cv.jobTitle}</p>
          <ContactRow cv={cv} light={false} iconColor="#374151" />
        </div>
      );
    }
    if (layout === 'aurora') {
      return (
        <div className="cv-page-aurora-header" style={{ background: `linear-gradient(120deg, ${color} 0%, #ec4899 100%)` }}>
          <span className="cv-page-aurora-ring cv-page-aurora-ring-1" />
          <span className="cv-page-aurora-ring cv-page-aurora-ring-2" />
          <div className="cv-page-aurora-mesh" />
          {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-page-aurora-photo" />}
          <h2>{cv.fullName || 'اسمك الكامل'}</h2>
          <span className="cv-page-aurora-title-pill">{cv.jobTitle}</span>
          <ContactRow cv={cv} light pills iconColor="rgba(255,255,255,0.9)" />
        </div>
      );
    }
    if (layout === 'horizon') {
      return (
        <div className="cv-page-horizon-header">
          <h2>{cv.fullName || 'اسمك الكامل'}</h2>
          <p style={{ color }}>{cv.jobTitle}</p>
          <span className="cv-page-horizon-rule" style={{ background: color }} />
        </div>
      );
    }
    if (layout === 'executive') {
      return (
        <div className="cv-page-exec-header" style={{ background: color }}>
          <div className="cv-page-exec-header-text">
            <span className="cv-page-exec-gold" />
            <h2>{cv.fullName || 'اسمك الكامل'}</h2>
            <p>{cv.jobTitle}</p>
            <ContactRow cv={cv} light iconColor="#e8c766" />
          </div>
          {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-page-exec-photo" />}
        </div>
      );
    }
    if (layout === 'dark') {
      return (
        <div className="cv-preview-dark-header">
          {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-preview-photo" style={{ borderColor: color }} />}
          <div>
            <h2 style={{ color: '#fff', margin: 0 }}>{cv.fullName || 'اسمك الكامل'}</h2>
            <p style={{ color, margin: '6px 0 0', fontWeight: 600 }}>{cv.jobTitle}</p>
            <ContactRow cv={cv} light iconColor={color} />
          </div>
        </div>
      );
    }
    if (layout === 'gradient') {
      return (
        <>
          <div className="cv-preview-gradient-header" style={{ background: `linear-gradient(120deg, ${color}, ${color}99)` }}>
            {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-preview-photo" />}
            <h2 style={{ color: '#fff', margin: 0 }}>{cv.fullName || 'اسمك الكامل'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', margin: '6px 0 0' }}>{cv.jobTitle}</p>
          </div>
          <div className="cv-page-gradient-contact-wrap"><ContactRow cv={cv} light={false} iconColor={color} /></div>
        </>
      );
    }
    // classic
    return (
      <div className="cv-preview-classic-header" style={{ borderBottomColor: color }}>
        {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-preview-photo cv-preview-photo-round" />}
        <div>
          <h2 style={{ margin: 0, color }}>{cv.fullName || 'اسمك الكامل'}</h2>
          <p style={{ margin: '6px 0 0', color: '#666' }}>{cv.jobTitle}</p>
          <ContactRow cv={cv} light={false} iconColor={color} />
        </div>
      </div>
    );
  };

  const renderSidebar = () => {
    if (layout === 'horizon') {
      return (
        <aside className="cv-preview-sidebar cv-page-horizon-side" style={{ borderInlineEndColor: color, background: '#f8fafc' }}>
          {cv.photoUrl
            ? <img src={cv.photoUrl} alt="" className="cv-page-horizon-photo" style={{ borderColor: color }} />
            : <div className="cv-page-horizon-monogram" style={{ background: color }}>{(cv.fullName || 'N')[0]}</div>}
          <HorizonContact cv={cv} color={color} />
          {cv.skills.length > 0 && (
            <div>
              <div className="cv-page-horizon-label" style={{ color }}>المهارات</div>
              <div className="cv-page-horizon-chips">
                {cv.skills.map((s, i) => <span key={i} className="cv-page-horizon-chip" style={{ background: `${color}1a`, color }}>{s}</span>)}
              </div>
            </div>
          )}
          {cv.languages.length > 0 && (
            <div>
              <div className="cv-page-horizon-label" style={{ color }}>اللغات</div>
              {cv.languages.map((l, i) => <div key={i} className="cv-page-horizon-lang">{l}</div>)}
            </div>
          )}
        </aside>
      );
    }
    return (
      <aside className="cv-preview-sidebar" style={{ background: color }}>
        {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-preview-photo" />}
        <div>
          <h2 className="cv-preview-name-onaccent">{cv.fullName || 'اسمك الكامل'}</h2>
          <p className="cv-preview-title-onaccent">{cv.jobTitle}</p>
        </div>
        <ContactStack cv={cv} />
        {cv.skills.length > 0 && (
          <div>
            <div className="cv-preview-onaccent-label">المهارات</div>
            {cv.skills.map((s, i) => <div key={i} className="cv-preview-onaccent-chip">{s}</div>)}
          </div>
        )}
        {cv.languages.length > 0 && (
          <div>
            <div className="cv-preview-onaccent-label">اللغات</div>
            {cv.languages.map((l, i) => <div key={i} className="cv-preview-onaccent-chip">{l}</div>)}
          </div>
        )}
      </aside>
    );
  };

  const renderSidebarContinuation = () => (
    layout === 'horizon'
      ? <div className="cv-preview-sidebar cv-page-horizon-side" style={{ borderInlineEndColor: color, background: '#f8fafc' }} />
      : <div className="cv-preview-sidebar" style={{ background: color }} />
  );

  // لسا عم نقيس (أو بنعيد القياس بمستوى ضغط جديد) — نعرض الصفحة بمستوى الضغط الحالي كتخمين مبدئي
  // لحد ما يجهز القياس الحقيقي، حتى ما تومض الشاشة فاضية. ما في خطر هون لأنه useLayoutEffect
  // بيصحح القرار قبل أي Paint فعلي يشوفه المستخدم.
  const ready = measured !== null && measured.blockHeights.length === blocks.length;
  const effFirstCapacity = ready ? (A4_H - PAGE_PAD * 2 - measured.headerH) : (A4_H - PAGE_PAD * 2);
  const effNextCapacity = ready ? (A4_H - PAGE_PAD * 2 - measured.contHeaderH) : (A4_H - PAGE_PAD * 2 - 74);

  const pageGroups = ready
    ? paginateBlocks(measured.blockHeights.map((h) => h + level.gap), effNextCapacity, effFirstCapacity)
    : blocks.length > 0 ? [blocks.map((_, i) => i)] : [[]];

  const pages = pageGroups.map((group, pageIndex) => {
    const isFirst = pageIndex === 0;
    if (hasSidebar) {
      return (
        <div key={pageIndex} className="cv-preview-page cv-preview-sidebar-layout" style={style}>
          {isFirst ? renderSidebar() : renderSidebarContinuation()}
          <main className="cv-preview-main">
            {isFirst ? (layout === 'horizon' && renderFirstPageHeader()) : renderContinuationHeader()}
            {renderMainBlocks(group)}
          </main>
        </div>
      );
    }
    return (
      <div key={pageIndex} className={`cv-preview-page ${layout === 'dark' ? 'cv-preview-dark-layout' : ''} ${layout === 'ats' ? 'cv-page-ats-layout' : ''} ${isTimeline ? 'cv-page-timeline-layout' : ''} ${layout === 'executive' ? 'cv-page-exec-layout' : ''}`} style={style}>
        {isFirst ? renderFirstPageHeader() : renderContinuationHeader()}
        <div className={layout === 'dark' ? 'cv-preview-dark-body' : 'cv-preview-main'}>
          {renderMainBlocks(group)}
        </div>
      </div>
    );
  });

  return (
    <div className="cv-page-scroll" ref={scrollRef}>
      {/* ممرات القياس المخفية: نفس الأنماط بالضبط (نفس مستوى الضغط الحالي) حتى يكون
          القياس صحيح 100% بدل تخمين. */}
      <div style={{ position: 'fixed', top: 0, insetInlineStart: -99999, visibility: 'hidden', pointerEvents: 'none' }}>
        {hasMainHeader && (
          <div ref={headerMeasureRef} style={{ width: headerMeasureWidth, ...measureStyle }}>
            {renderFirstPageHeader()}
          </div>
        )}
        <div ref={contHeaderMeasureRef} style={{ width: hasSidebar ? mainColWidth : A4_W, ...measureStyle }}>
          {renderContinuationHeader()}
        </div>
        <div ref={measureRef} style={{ width: mainColWidth, ...measureStyle }}>
          {blocks.map((b) => <div key={b.key} style={{ marginBottom: level.gap }}>{b.node}</div>)}
        </div>
      </div>

      {pageGroups.length > 1 && (
        <div className="cv-page-count-badge">{pageGroups.length} صفحات</div>
      )}

      <div className="cv-page-stack">
        {pages.map((p, i) => (
          <div key={i} className="cv-page-frame" style={{ width: A4_W * scale, height: A4_H * scale }}>
            <div className="cv-page-scaler" style={{ width: A4_W, height: A4_H, transform: `scale(${scale})` }}>
              {p}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}