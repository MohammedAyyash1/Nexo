function esc(str) {
  return (str || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildCvHtml(cv, lang, template, accent, fontStack) {
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const ACCENT = accent || template?.accent || '#6d28d9';
  const layout = template?.layout || 'sidebar';
  const font = fontStack || "'Segoe UI', Tahoma, Arial, sans-serif";

  // ===== حقول التواصل بتسمية واضحة (Label صغير + القيمة) =====
  const contactFields = [
    cv.email && [t('البريد الإلكتروني', 'Email'), cv.email],
    cv.phone && [t('الهاتف', 'Phone'), cv.phone],
    cv.location && [t('الموقع', 'Location'), cv.location],
    cv.website && [t('الموقع الإلكتروني', 'Website'), cv.website],
    cv.linkedin && ['LinkedIn', cv.linkedin],
  ].filter(Boolean);

  const contactCells = (labelColor, valueColor) => contactFields.map(([l, v]) => `
    <div style="min-width:0;">
      <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:0.5px;color:${labelColor};margin-bottom:1px;">${esc(l)}</div>
      <div dir="auto" style="font-size:12.5px;font-weight:600;color:${valueColor};word-break:break-word;">${esc(v)}</div>
    </div>`).join('');

  const contactRow = (labelColor, valueColor) => (contactFields.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px 26px;margin-top:10px;">${contactCells(labelColor, valueColor)}</div>` : '');

  const contactStack = (labelColor, valueColor) => (contactFields.length
    ? `<div style="display:flex;flex-direction:column;gap:10px;">${contactCells(labelColor, valueColor)}</div>` : '');

  const skillsHtml = (cv.skills || []).map((s) => `<span class="tag">${esc(s)}</span>`).join('');
  const langsHtml = (cv.languages || []).map((l) => `<div class="side-item">${esc(l)}</div>`).join('');

  const itemClass = layout === 'aurora' ? 'tl-item' : '';
  const expHtml = (cv.experience || []).map((e) => `
    <div class="exp-item ${itemClass}">
      <div class="exp-header">
        <span class="exp-role">${esc(e.role)}</span>
        <span class="exp-period">${esc(e.period)}</span>
      </div>
      <div class="exp-company">${esc(e.company)}</div>
      ${e.description ? `<p class="exp-desc">${esc(e.description)}</p>` : ''}
    </div>`).join('');
  const eduHtml = (cv.education || []).map((e) => `
    <div class="edu-item ${itemClass}">
      <div class="exp-header">
        <span class="exp-role">${esc(e.degree)}</span>
        <span class="exp-period">${esc(e.period)}</span>
      </div>
      <div class="exp-company">${esc(e.institution)}</div>
    </div>`).join('');
  const projHtml = (cv.projects || []).map((p) => `
    <div class="exp-item ${itemClass}">
      <div class="exp-header">
        <span class="exp-role">${esc(p.name)}</span>
        ${p.link ? `<span class="exp-period" dir="ltr">${esc(p.link)}</span>` : ''}
      </div>
      ${p.description ? `<p class="exp-desc">${esc(p.description)}</p>` : ''}
    </div>`).join('');
  const certHtml = (cv.certifications || []).map((c) => `
    <div class="edu-item ${itemClass}">
      <div class="exp-header">
        <span class="exp-role">${esc(c.name)}</span>
        <span class="exp-period">${esc(c.year)}</span>
      </div>
      <div class="exp-company">${esc(c.issuer)}</div>
    </div>`).join('');

  // عنوان قسم بنمط حسب القالب
  const sec = (title, marginTop = '24px') => `<div class="main-title" style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:${marginTop} 0 12px;">${title}</div>`;
  const secDark = (title, marginTop = '24px') => `<div class="main-title" style="font-size:14px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:1px;margin:${marginTop} 0 10px;">${title}</div>`;
  const secAts = (title, marginTop = '22px') => `<div class="main-title" style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:${marginTop} 0 10px;color:#111827;">${title}</div>`;

  const T = {
    summary: t('نبذة مختصرة', 'Summary'),
    exp: t('الخبرات العملية', 'Experience'),
    edu: t('التعليم', 'Education'),
    proj: t('المشاريع', 'Projects'),
    cert: t('الشهادات والدورات', 'Certifications'),
    skills: t('المهارات', 'Skills'),
    langs: t('اللغات', 'Languages'),
  };

  // ===== أنماط طباعة حقيقية: A4 + هوامش + منع قطع العناصر بين الصفحات =====
  const baseStyle = `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; }
    body { font-family: ${font}; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4; margin: 16mm 14mm; }
    .exp-item, .edu-item { margin-bottom: 16px; break-inside: avoid; page-break-inside: avoid; }
    .exp-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .exp-role { font-weight: 600; font-size: 14px; color: #111827; }
    .exp-period { font-size: 11.5px; color: #9ca3af; }
    .exp-company { font-size: 12.5px; color: #6b7280; font-style: italic; margin: 2px 0 4px; }
    .exp-desc { font-size: 13px; color: #4b5563; line-height: 1.7; margin: 0; }
    .summary { font-size: 13.5px; line-height: 1.8; color: #374151; }
    .main-title { break-after: avoid; page-break-after: avoid; }
    .tl-item { border-inline-start: 3px solid var(--acc); padding-inline-start: 18px; position: relative; }
    .tl-item::before { content: ''; position: absolute; inset-inline-start: -8px; top: 5px; width: 13px; height: 13px; border-radius: 50%; background: var(--acc); border: 3px solid #fff; box-sizing: border-box; }
  `;

  const wrap = (body) => `<html dir="${dir}"><head><meta charset="utf-8" /><title>${esc(cv.fullName)}</title><style>${baseStyle}</style></head><body style="--acc:${ACCENT};">${body}</body></html>`;

  // ===== sidebar =====
  if (layout === 'sidebar') {
    const sideLabel = (txt) => `<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;margin:26px 0 10px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:6px;">${txt}</div>`;
    return wrap(`
      <div class="page" style="display:flex;width:100%;min-height:100vh;">
        <div class="sidebar" style="width:32%;background:${ACCENT};color:#fff;padding:36px 24px;">
          ${cv.photoUrl ? `<img src="${esc(cv.photoUrl)}" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:4px solid rgba(255,255,255,0.4);display:block;margin:0 auto 20px;" />` : `<div style="width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:38px;margin:0 auto 20px;">${esc((cv.fullName || 'N')[0])}</div>`}
          ${contactFields.length ? sideLabel(t('التواصل', 'Contact')) + contactStack('rgba(255,255,255,0.65)', '#fff') : ''}
          ${cv.skills?.length ? sideLabel(T.skills) + `<div>${skillsHtml.replace(/class="tag"/g, `style="display:inline-block;background:rgba(255,255,255,0.18);padding:4px 10px;border-radius:20px;font-size:11.5px;margin:0 4px 6px 0;"`)}</div>` : ''}
          ${cv.languages?.length ? sideLabel(T.langs) + langsHtml : ''}
        </div>
        <div class="main" style="flex:1;padding:36px 32px;background:#fff;">
          <div style="font-size:26px;font-weight:700;margin:0 0 4px;color:${ACCENT};">${esc(cv.fullName)}</div>
          <div style="font-size:15px;color:#6b7280;margin-bottom:12px;">${esc(cv.jobTitle)}</div>
          ${cv.summary ? sec(T.summary) + `<p class="summary">${esc(cv.summary)}</p>` : ''}
          ${expHtml ? sec(T.exp) + expHtml : ''}
          ${eduHtml ? sec(T.edu) + eduHtml : ''}
          ${projHtml ? sec(T.proj) + projHtml : ''}
          ${certHtml ? sec(T.cert) + certHtml : ''}
        </div>
      </div>`);
  }

  // ===== dark =====
  if (layout === 'dark') {
    return wrap(`
      <div style="background:#0f0f16;color:#e5e5e5;min-height:100vh;padding:0;">
        <div style="display:flex;align-items:center;gap:20px;padding:40px 40px 28px;border-bottom:1px solid rgba(255,255,255,0.1);">
          ${cv.photoUrl ? `<img src="${esc(cv.photoUrl)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid ${ACCENT};" />` : ''}
          <div style="flex:1;">
            <div style="font-size:26px;font-weight:700;color:#fff;">${esc(cv.fullName)}</div>
            <div style="font-size:15px;color:${ACCENT};font-weight:600;margin-top:4px;">${esc(cv.jobTitle)}</div>
            ${contactRow('#9ca3af', '#fff')}
          </div>
        </div>
        <div style="padding:30px 40px;">
          ${cv.summary ? secDark(T.summary, '0') + `<p style="font-size:13.5px;line-height:1.8;color:#c8c8c8;">${esc(cv.summary)}</p>` : ''}
          ${expHtml ? secDark(T.exp) + expHtml.replace(/color: #111827/g, '').replace(/class="exp-role"/g, 'class="exp-role" style="color:#fff;"').replace(/class="exp-desc"/g, 'class="exp-desc" style="color:#c8c8c8;"') : ''}
          ${eduHtml ? secDark(T.edu) + eduHtml.replace(/class="exp-role"/g, 'class="exp-role" style="color:#fff;"') : ''}
          ${projHtml ? secDark(T.proj) + projHtml.replace(/class="exp-role"/g, 'class="exp-role" style="color:#fff;"').replace(/class="exp-desc"/g, 'class="exp-desc" style="color:#c8c8c8;"') : ''}
          ${certHtml ? secDark(T.cert) + certHtml.replace(/class="exp-role"/g, 'class="exp-role" style="color:#fff;"') : ''}
          ${cv.skills?.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">${(cv.skills || []).map((s) => `<span style="font-size:11px;border:1px solid ${ACCENT};color:${ACCENT};border-radius:20px;padding:3px 12px;">${esc(s)}</span>`).join('')}</div>` : ''}
          ${cv.languages?.length ? secDark(T.langs) + `<div style="font-size:13px;color:#c8c8c8;">${(cv.languages || []).map(esc).join(' · ')}</div>` : ''}
        </div>
      </div>`);
  }

  // ===== gradient =====
  if (layout === 'gradient') {
    return wrap(`
      <div style="min-height:100vh;">
        <div style="background:linear-gradient(120deg, ${ACCENT}, ${ACCENT}99);padding:44px 40px;text-align:center;color:#fff;">
          ${cv.photoUrl ? `<img src="${esc(cv.photoUrl)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.6);margin-bottom:14px;" />` : ''}
          <div style="font-size:26px;font-weight:700;">${esc(cv.fullName)}</div>
          <div style="font-size:15px;opacity:0.95;margin-top:4px;">${esc(cv.jobTitle)}</div>
        </div>
        <div style="padding:26px 40px 30px;">
          <div style="display:flex;justify-content:center;">${contactRow('#9ca3af', '#1f2937')}</div>
          ${cv.summary ? sec(T.summary, '20px') + `<p class="summary">${esc(cv.summary)}</p>` : ''}
          ${expHtml ? sec(T.exp) + expHtml : ''}
          ${eduHtml ? sec(T.edu) + eduHtml : ''}
          ${projHtml ? sec(T.proj) + projHtml : ''}
          ${certHtml ? sec(T.cert) + certHtml : ''}
          ${cv.skills?.length ? sec(T.skills) + `<div style="display:flex;flex-wrap:wrap;gap:6px;">${(cv.skills || []).map((s) => `<span style="font-size:11px;border:1px solid ${ACCENT};color:${ACCENT};border-radius:20px;padding:3px 12px;">${esc(s)}</span>`).join('')}</div>` : ''}
          ${cv.languages?.length ? sec(T.langs) + `<div style="font-size:13px;color:#4b5563;">${(cv.languages || []).map(esc).join(' · ')}</div>` : ''}
        </div>
      </div>`);
  }

  // ===== aurora (Pro): رأس تدرّج جريء + Timeline =====
  if (layout === 'aurora') {
    return wrap(`
      <div style="min-height:100vh;">
        <div style="background:linear-gradient(120deg, ${ACCENT} 0%, #ec4899 100%);padding:46px 40px 34px;color:#fff;">
          ${cv.photoUrl ? `<img src="${esc(cv.photoUrl)}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:4px solid rgba(255,255,255,0.55);margin-bottom:14px;display:block;" />` : ''}
          <div style="font-size:38px;font-weight:800;line-height:1.15;margin-bottom:10px;">${esc(cv.fullName)}</div>
          <span style="display:inline-block;font-size:15px;font-weight:600;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.4);padding:5px 16px;border-radius:30px;">${esc(cv.jobTitle)}</span>
          ${contactRow('rgba(255,255,255,0.7)', '#fff')}
        </div>
        <div style="padding:28px 40px 30px;">
          ${cv.summary ? sec(T.summary, '0') + `<p class="summary">${esc(cv.summary)}</p>` : ''}
          ${expHtml ? sec(T.exp) + expHtml : ''}
          ${eduHtml ? sec(T.edu) + eduHtml : ''}
          ${projHtml ? sec(T.proj) + projHtml : ''}
          ${certHtml ? sec(T.cert) + certHtml : ''}
          ${cv.skills?.length ? sec(T.skills) + `<div style="display:flex;flex-wrap:wrap;gap:6px;">${(cv.skills || []).map((s) => `<span style="font-size:11px;border:1px solid ${ACCENT};color:${ACCENT};border-radius:20px;padding:3px 12px;">${esc(s)}</span>`).join('')}</div>` : ''}
          ${cv.languages?.length ? sec(T.langs) + `<div style="font-size:13px;color:#4b5563;">${(cv.languages || []).map(esc).join(' · ')}</div>` : ''}
        </div>
      </div>`);
  }

  // ===== ats: بسيط جدًا، أبيض/أسود، بدون صورة، آمن لقارئات ATS =====
  if (layout === 'ats') {
    return wrap(`
      <div style="padding:40px;color:#111827;">
        <div style="border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:20px;">
          <div style="font-size:26px;font-weight:800;margin:0 0 4px;">${esc(cv.fullName)}</div>
          <div style="font-size:14px;color:#374151;margin-bottom:4px;">${esc(cv.jobTitle)}</div>
          ${contactRow('#6b7280', '#111827')}
        </div>
        ${cv.summary ? secAts(t('نبذة', 'Profile'), '0') + `<p class="summary" style="color:#1f2937;">${esc(cv.summary)}</p>` : ''}
        ${expHtml ? secAts(T.exp) + expHtml : ''}
        ${eduHtml ? secAts(T.edu) + eduHtml : ''}
        ${projHtml ? secAts(T.proj) + projHtml : ''}
        ${certHtml ? secAts(T.cert) + certHtml : ''}
        ${cv.skills?.length ? secAts(T.skills) + `<div style="font-size:13px;color:#374151;">${(cv.skills || []).map(esc).join(', ')}</div>` : ''}
        ${cv.languages?.length ? secAts(T.langs, '16px') + `<div style="font-size:13px;color:#374151;">${(cv.languages || []).map(esc).join(', ')}</div>` : ''}
      </div>`);
  }

  // ===== classic (الافتراضي) =====
  return wrap(`
    <div style="padding:40px;">
      <div style="display:flex;align-items:center;gap:18px;border-bottom:3px solid ${ACCENT};padding-bottom:18px;margin-bottom:20px;">
        ${cv.photoUrl ? `<img src="${esc(cv.photoUrl)}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;" />` : ''}
        <div style="flex:1;">
          <div style="font-size:26px;font-weight:700;color:${ACCENT};">${esc(cv.fullName)}</div>
          <div style="font-size:14px;color:#6b7280;margin-top:2px;">${esc(cv.jobTitle)}</div>
          ${contactRow('#9ca3af', '#1f2937')}
        </div>
      </div>
      ${cv.summary ? sec(T.summary, '0') + `<p class="summary">${esc(cv.summary)}</p>` : ''}
      ${expHtml ? sec(T.exp) + expHtml : ''}
      ${eduHtml ? sec(T.edu) + eduHtml : ''}
      ${projHtml ? sec(T.proj) + projHtml : ''}
      ${certHtml ? sec(T.cert) + certHtml : ''}
      ${(cv.skills?.length || cv.languages?.length) ? `<div style="display:flex;gap:30px;margin-top:16px;">
        ${cv.skills?.length ? `<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:${ACCENT};margin-bottom:8px;">${T.skills}</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${(cv.skills || []).map((s) => `<span style="font-size:11px;border:1px solid ${ACCENT};color:${ACCENT};border-radius:20px;padding:3px 12px;">${esc(s)}</span>`).join('')}</div></div>` : ''}
        ${cv.languages?.length ? `<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:${ACCENT};margin-bottom:8px;">${T.langs}</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${(cv.languages || []).map((l) => `<span style="font-size:11px;border:1px solid ${ACCENT};color:${ACCENT};border-radius:20px;padding:3px 12px;">${esc(l)}</span>`).join('')}</div></div>` : ''}
      </div>` : ''}
    </div>`);
}

export function exportCvAsPdf(cv, lang, template, accent, fontStack) {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert(lang === 'en' ? 'Please allow popups to export as PDF.' : 'الرجاء السماح بالنوافذ المنبثقة لتصدير PDF.');
    return;
  }
  printWindow.document.write(buildCvHtml(cv, lang, template, accent, fontStack));
  printWindow.document.close();

  const waitForImages = () => {
    const images = Array.from(printWindow.document.images);
    if (images.length === 0) return Promise.resolve();
    return Promise.all(
      images.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      }))
    );
  };

  printWindow.onload = () => {
    waitForImages().then(() => {
      printWindow.focus();
      printWindow.print();
    });
  };
}

export function exportCvAsWord(cv, lang, template, accent, fontStack) {
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>${buildCvHtml(cv, lang, template, accent, fontStack).replace(/<html[^>]*>/, '').replace('</html>', '')}</html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(cv.fullName || 'CV').replace(/[^\p{L}\p{N}\-_ ]/gu, '')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}