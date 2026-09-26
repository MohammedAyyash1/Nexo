export function CVLivePreview({ cv, template, accent, fontStack }) {
  const color = accent || template.accent;
  const style = { '--cv-accent': color, fontFamily: fontStack };

  const hasContent = cv.fullName || cv.summary || cv.experience.length > 0;

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 11.5, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 18, marginBottom: 8, borderBottom: `1.5px solid ${color}33`, paddingBottom: 4 }}>
      {children}
    </div>
  );

  if (!hasContent) {
    return (
      <div className="cv-preview-page cv-preview-empty" style={style}>
        <p>عبّي البيانات على اليسار وشوف سيرتك الذاتية تتكوّن هون مباشرة.</p>
      </div>
    );
  }

  // ===== تخطيط "sidebar": عمود جانبي ملوّن للصورة/التواصل =====
  if (template.layout === 'sidebar') {
    return (
      <div className="cv-preview-page cv-preview-sidebar-layout" style={style}>
        <aside className="cv-preview-sidebar" style={{ background: color }}>
          {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-preview-photo" />}
          <h2 className="cv-preview-name-onaccent">{cv.fullName || 'اسمك الكامل'}</h2>
          <p className="cv-preview-title-onaccent">{cv.jobTitle}</p>
          <div className="cv-preview-contact-onaccent">
            {cv.email && <div>{cv.email}</div>}
            {cv.phone && <div>{cv.phone}</div>}
            {cv.location && <div>{cv.location}</div>}
          </div>
          {cv.skills.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="cv-preview-onaccent-label">المهارات</div>
              {cv.skills.map((s, i) => <div key={i} className="cv-preview-onaccent-chip">{s}</div>)}
            </div>
          )}
          {cv.languages.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="cv-preview-onaccent-label">اللغات</div>
              {cv.languages.map((l, i) => <div key={i} className="cv-preview-onaccent-chip">{l}</div>)}
            </div>
          )}
        </aside>
        <main className="cv-preview-main">
          {cv.summary && <><SectionTitle>نبذة</SectionTitle><p className="cv-preview-text">{cv.summary}</p></>}
          {cv.experience.length > 0 && (
            <>
              <SectionTitle>الخبرات</SectionTitle>
              {cv.experience.map((e, i) => (
                <div key={i} className="cv-preview-entry">
                  <div className="cv-preview-entry-head"><strong>{e.role}</strong><span>{e.period}</span></div>
                  <div className="cv-preview-entry-sub">{e.company}</div>
                  <p className="cv-preview-text">{e.description}</p>
                </div>
              ))}
            </>
          )}
          {cv.education.length > 0 && (
            <>
              <SectionTitle>التعليم</SectionTitle>
              {cv.education.map((e, i) => (
                <div key={i} className="cv-preview-entry">
                  <div className="cv-preview-entry-head"><strong>{e.degree}</strong><span>{e.period}</span></div>
                  <div className="cv-preview-entry-sub">{e.institution}</div>
                </div>
              ))}
            </>
          )}
        </main>
      </div>
    );
  }

  // ===== تخطيط "dark": خلفية داكنة كاملة =====
  if (template.layout === 'dark') {
    return (
      <div className="cv-preview-page cv-preview-dark-layout" style={style}>
        <div className="cv-preview-dark-header">
          {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-preview-photo" style={{ borderColor: color }} />}
          <div>
            <h2 style={{ color: '#fff', margin: 0 }}>{cv.fullName || 'اسمك الكامل'}</h2>
            <p style={{ color, margin: '4px 0 0', fontWeight: 600 }}>{cv.jobTitle}</p>
            <div className="cv-preview-dark-contact">{[cv.email, cv.phone, cv.location].filter(Boolean).map((v, i) => <bdi key={i}>{v}</bdi>).reduce((prev, curr) => [prev, ' · ', curr])}</div>
          </div>
        </div>
        <div className="cv-preview-dark-body">
          {cv.summary && <><SectionTitle>نبذة</SectionTitle><p className="cv-preview-text-dark">{cv.summary}</p></>}
          {cv.experience.map((e, i) => (
            <div key={i} className="cv-preview-entry">
              <div className="cv-preview-entry-head" style={{ color: '#fff' }}><strong>{e.role}</strong><span style={{ color }}>{e.period}</span></div>
              <div className="cv-preview-entry-sub" style={{ color }}>{e.company}</div>
              <p className="cv-preview-text-dark">{e.description}</p>
            </div>
          ))}
          {cv.skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {cv.skills.map((s, i) => <span key={i} className="cv-preview-dark-chip" style={{ borderColor: color, color }}>{s}</span>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== تخطيط "gradient": شريط علوي متدرّج =====
  if (template.layout === 'gradient') {
    return (
      <div className="cv-preview-page" style={style}>
        <div className="cv-preview-gradient-header" style={{ background: `linear-gradient(120deg, ${color}, ${color}99)` }}>
          {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-preview-photo" />}
          <h2 style={{ color: '#fff', margin: 0 }}>{cv.fullName || 'اسمك الكامل'}</h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '4px 0 0' }}>{cv.jobTitle}</p>
        </div>
        <div className="cv-preview-main" style={{ paddingTop: 18 }}>
          <div className="cv-preview-contact-row">{[cv.email, cv.phone, cv.location].filter(Boolean).map((v, i) => <bdi key={i}>{v}</bdi>).reduce((a, b) => [a, '  •  ', b])}</div>
          {cv.summary && <><SectionTitle>نبذة</SectionTitle><p className="cv-preview-text">{cv.summary}</p></>}
          {cv.experience.map((e, i) => (
            <div key={i} className="cv-preview-entry">
              <div className="cv-preview-entry-head"><strong>{e.role}</strong><span>{e.period}</span></div>
              <div className="cv-preview-entry-sub">{e.company}</div>
              <p className="cv-preview-text">{e.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===== تخطيط "classic": الافتراضي — عنوان بسيط ثم أقسام عمودية =====
  return (
    <div className="cv-preview-page" style={style}>
      <div className="cv-preview-classic-header" style={{ borderBottomColor: color }}>
        {cv.photoUrl && <img src={cv.photoUrl} alt="" className="cv-preview-photo cv-preview-photo-round" />}
        <div>
          <h2 style={{ margin: 0, color }}>{cv.fullName || 'اسمك الكامل'}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #666)' }}>{cv.jobTitle}</p>
          <div className="cv-preview-contact-row">{[cv.email, cv.phone, cv.location].filter(Boolean).map((v, i) => <bdi key={i}>{v}</bdi>).reduce((a, b) => [a, '  •  ', b])}</div>
        </div>
      </div>
      {cv.summary && <><SectionTitle>نبذة</SectionTitle><p className="cv-preview-text">{cv.summary}</p></>}
      {cv.experience.length > 0 && (
        <>
          <SectionTitle>الخبرات</SectionTitle>
          {cv.experience.map((e, i) => (
            <div key={i} className="cv-preview-entry">
              <div className="cv-preview-entry-head"><strong>{e.role}</strong><span>{e.period}</span></div>
              <div className="cv-preview-entry-sub">{e.company}</div>
              <p className="cv-preview-text">{e.description}</p>
            </div>
          ))}
        </>
      )}
      {cv.education.length > 0 && (
        <>
          <SectionTitle>التعليم</SectionTitle>
          {cv.education.map((e, i) => (
            <div key={i} className="cv-preview-entry">
              <div className="cv-preview-entry-head"><strong>{e.degree}</strong><span>{e.period}</span></div>
              <div className="cv-preview-entry-sub">{e.institution}</div>
            </div>
          ))}
        </>
      )}
      {(cv.skills.length > 0 || cv.languages.length > 0) && (
        <div style={{ display: 'flex', gap: 24, marginTop: 10 }}>
          {cv.skills.length > 0 && (
            <div style={{ flex: 1 }}>
              <SectionTitle>المهارات</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cv.skills.map((s, i) => <span key={i} className="cv-preview-classic-chip" style={{ borderColor: color, color }}>{s}</span>)}
              </div>
            </div>
          )}
          {cv.languages.length > 0 && (
            <div style={{ flex: 1 }}>
              <SectionTitle>اللغات</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cv.languages.map((l, i) => <span key={i} className="cv-preview-classic-chip" style={{ borderColor: color, color }}>{l}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}