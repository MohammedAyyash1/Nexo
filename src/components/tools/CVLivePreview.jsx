import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { paginateBlocks } from './cvPagination.js';

// ===== أبعاد A4 منطقية (تُرسم بهاد الحجم دايمًا، وبعدين تُصغّر بصريًا
// لتناسب عرض عمود المعاينة الفعلي عبر transform: scale) =====
const A4_W = 794;
const A4_H = 1123;
const PAGE_PAD = 46;
const CONT_HEADER_H = 74;

function ContactLine({ cv, className = 'cv-page-contact-row' }) {
  const items = [cv.email, cv.phone, cv.location].filter(Boolean);
  if (!items.length) return null;
  return (
    <div className={className}>
      {items.map((v, i) => (
        <span key={i}>
          {i > 0 && <span className="cv-page-contact-dot">•</span>}
          <bdi>{v}</bdi>
        </span>
      ))}
    </div>
  );
}

export function CVLivePreview({ cv, template, accent, fontStack }) {
  const color = accent || template.accent;
  const layout = template.layout;
  const titleColor = layout === 'ats' ? '#111827' : color;
  const hasContent = cv.fullName || cv.summary || cv.experience.length > 0;
  const hasSidebar = layout === 'sidebar';

  // ===== قياس عرض عمود المعاينة الفعلي وحساب نسبة التصغير =====
  const scrollRef = useRef(null);
  const [scale, setScale] = useState(0.48);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const update = () => {
      if (el.clientWidth > 0) setScale(el.clientWidth / A4_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const SectionTitle = ({ children }) => (
    <div className="cv-page-section-title" style={{ color: titleColor, borderBottomColor: `${titleColor}33` }}>
      {children}
    </div>
  );

  // ===== بناء كتل المحتوى الرئيسي (بترتيب ثابت، كل كتلة توزّع لحالها بالصفحات) =====
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
            <div className="cv-page-entry">
              <div className="cv-page-entry-head"><strong>{e.role}</strong><span>{e.period}</span></div>
              <div className="cv-page-entry-sub">{e.company}</div>
              {e.description && <p className="cv-page-text">{e.description}</p>}
            </div>
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
            <div className="cv-page-entry">
              <div className="cv-page-entry-head"><strong>{e.degree}</strong><span>{e.period}</span></div>
              <div className="cv-page-entry-sub">{e.institution}</div>
            </div>
          ),
        });
      });
    }

    // المهارات/اللغات بالمحتوى الرئيسي للقوالب اللي مالها Sidebar جانبي (classic/ats)
    if ((layout === 'classic' || layout === 'ats') && (cv.skills.length > 0 || cv.languages.length > 0)) {
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

    // المهارات بالمحتوى الرئيسي للقوالب اللي عندها Sidebar/Header بس ما فيها مكان جانبي للمهارات (dark/gradient)
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

  // ===== Pass قياس مخفي: نرندر كل الكتل بعرض العمود الحقيقي المنطقي،
  // بعدين نقرأ ارتفاعها الفعلي من الـDOM قبل ما نوزّعها على صفحات =====
  const measureRef = useRef(null);
  const [heights, setHeights] = useState([]);
  const mainColWidth = hasSidebar ? A4_W * 0.7 - PAGE_PAD * 2 : A4_W - PAGE_PAD * 2;
  const contentSignature = JSON.stringify({ cv, layout, fontStack, color });

  useLayoutEffect(() => {
    if (!measureRef.current || blocks.length === 0) { setHeights([]); return; }
    const kids = Array.from(measureRef.current.children);
    setHeights(kids.map((k) => k.getBoundingClientRect().height));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSignature]);

  const firstPageHeaderH = hasSidebar ? 0 // الـSidebar جنب المحتوى مو فوقه، ما بياخد ارتفاع من المحتوى الرئيسي
    : layout === 'dark' ? 220
    : layout === 'gradient' ? 260
    : layout === 'ats' ? 200
    : 220; // classic

  const firstPageCapacity = A4_H - PAGE_PAD * 2 - firstPageHeaderH;
  const nextPageCapacity = A4_H - PAGE_PAD * 2 - CONT_HEADER_H;

  const heightsReady = heights.length === blocks.length && blocks.length > 0;
  const pageGroups = heightsReady
    ? paginateBlocks(heights, nextPageCapacity, firstPageCapacity)
    : blocks.length > 0 ? [blocks.map((_, i) => i)] : [[]];

  if (!hasContent) {
    return (
      <div className="cv-page-scroll" ref={scrollRef}>
        <div className="cv-page-stack">
          <div className="cv-preview-page cv-preview-empty" style={{ '--cv-accent': color, fontFamily: fontStack }}>
            <p>عبّي البيانات على اليسار وشوف سيرتك الذاتية تتكوّن هون مباشرة.</p>
          </div>
        </div>
      </div>
    );
  }

  const style = { '--cv-accent': color, fontFamily: fontStack };

  const renderMainBlocks = (indices) => indices.map((i) => (
    <div key={blocks[i].key} style={{ marginBottom: 18 }}>{blocks[i].node}</div>
  ));

  const renderPageHeader = (isFirst) => {
    if (!isFirst) {
      return (
        <div className="cv-page-continuation-header" style={{ borderBottomColor: `${titleColor}33`, color: titleColor }}>
          <span className="cv-page-continuation-name">{cv.fullName}</span>
          <span style={{ color: titleColor, opacity: 0.75 }}>{cv.jobTitle}</span>
        </div>
      );
    }
    if (layout === 'ats') {
      return (
        <div className="cv-page-ats-header">
          <h2>{cv.fullName || 'اسمك الكامل'}</h2>
          <p>{cv.jobTitle}</p>
          <ContactLine cv={cv} className="cv-page-ats-contact" />
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
            <ContactLine cv={cv} className="cv-preview-dark-contact" />
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
          <div className="cv-page-gradient-contact-wrap"><ContactLine cv={cv} /></div>
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
          <ContactLine cv={cv} />
        </div>
      </div>
    );
  };

  const renderSidebar = () => (
    <aside className="cv-preview-sidebar" style={{ background: color }}>
      {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-preview-photo" />}
      <div>
        <h2 className="cv-preview-name-onaccent">{cv.fullName || 'اسمك الكامل'}</h2>
        <p className="cv-preview-title-onaccent">{cv.jobTitle}</p>
      </div>
      {(cv.email || cv.phone || cv.location) && (
        <div className="cv-preview-contact-onaccent">
          {cv.email && <div>{cv.email}</div>}
          {cv.phone && <div>{cv.phone}</div>}
          {cv.location && <div>{cv.location}</div>}
        </div>
      )}
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

  const pages = pageGroups.map((group, pageIndex) => {
    const isFirst = pageIndex === 0;
    if (hasSidebar) {
      return (
        <div key={pageIndex} className="cv-preview-page cv-preview-sidebar-layout" style={style}>
          {isFirst ? renderSidebar() : <div className="cv-preview-sidebar cv-preview-sidebar-continuation" style={{ background: color }} />}
          <main className="cv-preview-main">
            {renderPageHeader(isFirst)}
            {renderMainBlocks(group)}
          </main>
        </div>
      );
    }
    return (
      <div key={pageIndex} className={`cv-preview-page ${layout === 'dark' ? 'cv-preview-dark-layout' : ''} ${layout === 'ats' ? 'cv-page-ats-layout' : ''}`} style={style}>
        {renderPageHeader(isFirst)}
        <div className={layout === 'dark' ? 'cv-preview-dark-body' : 'cv-preview-main'}>
          {renderMainBlocks(group)}
        </div>
      </div>
    );
  });

  return (
    <div className="cv-page-scroll" ref={scrollRef}>
      {/* ممر قياس مخفي: بيرندر كل الكتل بعرض العمود الحقيقي حتى نقيس ارتفاعها
          الفعلي قبل ما نوزّعها على صفحات. مخفي بصريًا بس محسوب بالـLayout. */}
      <div ref={measureRef} className="cv-page-measure" style={{ width: mainColWidth, ...style }}>
        {blocks.map((b) => <div key={b.key} style={{ marginBottom: 18 }}>{b.node}</div>)}
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