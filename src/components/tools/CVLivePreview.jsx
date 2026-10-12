import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mail, Phone, MapPin, Globe, Link2 } from 'lucide-react';
import { paginateBlocks } from './cvPagination.js';

const A4_W = 794;
const A4_H = 1123;
const PAGE_PAD = 46;

// ===== سلّم ضغط آمن وتدريجي — One-Page-First =====
const COMPRESSION_LEVELS = [
  { gap: 18, fontScale: 1, lineScale: 1 },
  { gap: 13, fontScale: 1, lineScale: 1 },
  { gap: 9, fontScale: 1, lineScale: 1 },
  { gap: 9, fontScale: 1, lineScale: 0.94 },
  { gap: 8, fontScale: 0.92, lineScale: 0.9 },
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
  const hasMainHeader = !hasSidebar || layout === 'horizon';

  // اتجاه محتوى الورقة: نحدده صراحة (مو بس بالوراثة)
  const pageDir = typeof document !== 'undefined' && document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl';

  // ===== قياس عرض العمود وحساب نسبة التصغير (مع إعادة محاولة لو العرض صفر وقت التحميل) =====
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
      if (tries < 30) rafId = requestAnimationFrame(tryUpdate);
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

  // ===== محرك القياس + الضغط التدريجي (حالة واحدة موحّدة لتفادي تعارض ترتيب الـEffects) =====
  const measureRef = useRef(null);
  const headerMeasureRef = useRef(null);
  const contHeaderMeasureRef = useRef(null);

  const [engine, setEngine] = useState({ sig: '', level: 0, measured: null });

  const mainColWidth = hasSidebar ? A4_W * 0.7 - PAGE_PAD * 2 : A4_W - PAGE_PAD * 2;
  const headerMeasureWidth = hasSidebar ? mainColWidth : A4_W;
  const contentSignature = JSON.stringify({ cv, layout, fontStack, color });

  // لو المحتوى تغيّر، نعتبر مستوى الضغط صفر والقياس غير جاهز لحد ما نعيد القياس
  const sameContent = engine.sig === contentSignature;
  const levelIndex = sameContent ? engine.level : 0;
  const level = COMPRESSION_LEVELS[levelIndex];
  const measured = sameContent ? engine.measured : null;

  const measureStyle = {
    '--cv-accent': color,
    '--cv-font-scale': level.fontScale,
    '--cv-line-scale': level.lineScale,
    fontFamily: fontStack,
  };

  useLayoutEffect(() => {
    if (engine.sig !== contentSignature) {
      setEngine({ sig: contentSignature, level: 0, measured: null });
      return;
    }
    if (blocks.length === 0) {
      if (!engine.measured) setEngine((e) => ({ ...e, measured: { blockHeights: [], headerH: 0, contHeaderH: 0 } }));
      return;
    }
    if (!measureRef.current) return;

    const kids = Array.from(measureRef.current.children);
    const blockHeights = kids.map((k) => k.getBoundingClientRect().height);
    const headerH = hasMainHeader && headerMeasureRef.current ? headerMeasureRef.current.getBoundingClientRect().height : 0;
    const contHeaderH = contHeaderMeasureRef.current ? contHeaderMeasureRef.current.getBoundingClientRect().height : 0;

    const available = A4_H - PAGE_PAD * 2;
    const firstCapacity = available - headerH;
    const totalWithGaps = blockHeights.reduce((s, h) => s + h, 0) + Math.max(0, blockHeights.length - 1) * level.gap;

    if (totalWithGaps > firstCapacity && engine.level < COMPRESSION_LEVELS.length - 1) {
      setEngine((e) => ({ ...e, level: e.level + 1, measured: null }));
      return;
    }

    setEngine((e) => ({ ...e, measured: { blockHeights, headerH, contHeaderH } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSignature, engine.sig, engine.level]);

  // ورقة بحجم A4 منطقي مثبّتة بزاوية الإطار اليسرى فعليًا (position:absolute; left:0)،
  // فما بتتأثر باتجاه الصفحة RTL/LTR، والتصغير بيصير حول نفس الزاوية المرئية دايمًا
  const scalerStyle = { position: 'absolute', top: 0, left: 0, width: A4_W, height: A4_H, transform: `scale(${scale})`, transformOrigin: 'top left' };
  const frameStyle = { position: 'relative', width: A4_W * scale, height: A4_H * scale };

  if (!hasContent) {
    return (
      <div className="cv-page-scroll" ref={scrollRef}>
        <div className="cv-page-stack">
          <div className="cv-page-frame" style={frameStyle}>
            <div className="cv-page-scaler" dir={pageDir} style={scalerStyle}>
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
      {/* ممرات القياس المخفية: نفس الأنماط بالضبط (نفس مستوى الضغط والاتجاه الحاليين) */}
      <div dir={pageDir} style={{ position: 'fixed', top: 0, left: -99999, visibility: 'hidden', pointerEvents: 'none' }}>
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
          <div key={i} className="cv-page-frame" style={frameStyle}>
            <div className="cv-page-scaler" dir={pageDir} style={scalerStyle}>
              {p}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}