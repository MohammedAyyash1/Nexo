function esc(str) {
  return (str || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildCvHtml(cv, lang, template, accent, fontStack) {
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const ACCENT = accent || template?.accent || '#6d28d9';
  const layout = template?.layout || 'sidebar';
  const font = fontStack || "'Segoe UI', Tahoma, Arial, sans-serif";

  const skillsHtml = (cv.skills || []).map((s) => `<span class="tag">${esc(s)}</span>`).join('');
  const langsHtml = (cv.languages || []).map((l) => `<div class="side-item">${esc(l)}</div>`).join('');
  const expHtml = (cv.experience || []).map((e) => `
    <div class="exp-item">
      <div class="exp-header">
        <span class="exp-role">${esc(e.role)}</span>
        <span class="exp-period">${esc(e.period)}</span>
      </div>
      <div class="exp-company">${esc(e.company)}</div>
      ${e.description ? `<p class="exp-desc">${esc(e.description)}</p>` : ''}
    </div>
  `).join('');
  const eduHtml = (cv.education || []).map((e) => `
    <div class="edu-item">
      <div class="exp-header">
        <span class="exp-role">${esc(e.degree)}</span>
        <span class="exp-period">${esc(e.period)}</span>
      </div>
      <div class="exp-company">${esc(e.institution)}</div>
    </div>
  `).join('');

  const baseStyle = `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; }
    body { font-family: ${font}; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0; size: A4; }
    .exp-item, .edu-item { margin-bottom: 16px; }
    .exp-header { display: flex; justify-content: space-between; align-items: baseline; }
    .exp-role { font-weight: 600; font-size: 14px; color: #111827; }
    .exp-period { font-size: 11.5px; color: #9ca3af; }
    .exp-desc { font-size: 13px; color: #4b5563; line-height: 1.7; margin: 0; }
    .summary { font-size: 13.5px; line-height: 1.8; color: #374151; }
  `;

  // ===== sidebar =====
  if (layout === 'sidebar') {
    const body = `
      <div class="page" style="display:flex;width:100%;min-height:100vh;">
        <div class="sidebar" style="width:34%;background:${ACCENT};color:#fff;padding:36px 26px;">
          ${cv.photoUrl ? `<img src="${esc(cv.photoUrl)}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid rgba(255,255,255,0.4);display:block;margin:0 auto 20px;" />` : `<div style="width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:40px;margin:0 auto 20px;">${esc((cv.fullName || 'N')[0])}</div>`}
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;margin:26px 0 10px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:6px;">${t('التواصل', 'Contact')}</div>
          ${cv.email ? `<div class="side-item" style="font-size:13px;margin-bottom:6px;opacity:0.95;">${esc(cv.email)}</div>` : ''}
          ${cv.phone ? `<div class="side-item" style="font-size:13px;margin-bottom:6px;opacity:0.95;">${esc(cv.phone)}</div>` : ''}
          ${cv.location ? `<div class="side-item" style="font-size:13px;margin-bottom:6px;opacity:0.95;">${esc(cv.location)}</div>` : ''}
          ${cv.skills?.length ? `<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;margin:26px 0 10px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:6px;">${t('المهارات', 'Skills')}</div><div>${skillsHtml.replace(/class="tag"/g, `style="display:inline-block;background:rgba(255,255,255,0.18);padding:4px 10px;border-radius:20px;font-size:11.5px;margin:0 4px 6px 0;"`)}</div>` : ''}
          ${cv.languages?.length ? `<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;margin:26px 0 10px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:6px;">${t('اللغات', 'Languages')}</div>${langsHtml}` : ''}
        </div>
        <div class="main" style="flex:1;padding:36px 32px;background:#fff;">
          <div style="font-size:26px;font-weight:700;margin:0 0 4px;color:${ACCENT};">${esc(cv.fullName)}</div>
          <div style="font-size:15px;color:#6b7280;margin-bottom:24px;">${esc(cv.jobTitle)}</div>
          ${cv.summary ? `<div class="main-title" style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:24px 0 12px;">${t('نبذة مختصرة', 'Summary')}</div><p class="summary">${esc(cv.summary)}</p>` : ''}
          ${expHtml ? `<div class="main-title" style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:24px 0 12px;">${t('الخبرات العملية', 'Experience')}</div>${expHtml}` : ''}
          ${eduHtml ? `<div class="main-title" style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:24px 0 12px;">${t('التعليم', 'Education')}</div>${eduHtml}` : ''}
        </div>
      </div>`;
    return `<html dir="${dir}"><head><meta charset="utf-8" /><title>${esc(cv.fullName)}</title><style>${baseStyle}</style></head><body>${body}</body></html>`;
  }

  // ===== dark =====
  if (layout === 'dark') {
    const body = `
      <div style="background:#0f0f16;color:#e5e5e5;min-height:100vh;padding:0;">
        <div style="display:flex;align-items:center;gap:20px;padding:40px 40px 28px;border-bottom:1px solid rgba(255,255,255,0.1);">
          ${cv.photoUrl ? `<img src="${esc(cv.photoUrl)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid ${ACCENT};" />` : ''}
          <div>
            <div style="font-size:26px;font-weight:700;color:#fff;">${esc(cv.fullName)}</div>
            <div style="font-size:15px;color:${ACCENT};font-weight:600;margin-top:4px;">${esc(cv.jobTitle)}</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:6px;">${[cv.email, cv.phone, cv.location].filter(Boolean).map(esc).join(' &middot; ')}</div>
          </div>
        </div>
        <div style="padding:30px 40px;">
          ${cv.summary ? `<div style="font-size:14px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">${t('نبذة مختصرة', 'Summary')}</div><p style="font-size:13.5px;line-height:1.8;color:#c8c8c8;">${esc(cv.summary)}</p>` : ''}
          ${(cv.experience || []).length ? `<div style="font-size:14px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:1px;margin:24px 0 10px;">${t('الخبرات العملية', 'Experience')}</div>` : ''}
          ${(cv.experience || []).map((e) => `
            <div style="margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;"><strong style="color:#fff;">${esc(e.role)}</strong><span style="color:${ACCENT};font-size:12px;">${esc(e.period)}</span></div>
              <div style="color:${ACCENT};font-size:12.5px;margin:2px 0 6px;">${esc(e.company)}</div>
              ${e.description ? `<p style="font-size:13px;color:#c8c8c8;line-height:1.7;margin:0;">${esc(e.description)}</p>` : ''}
            </div>`).join('')}
          ${cv.skills?.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">${(cv.skills || []).map((s) => `<span style="font-size:11px;border:1px solid ${ACCENT};color:${ACCENT};border-radius:20px;padding:3px 12px;">${esc(s)}</span>`).join('')}</div>` : ''}
        </div>
      </div>`;
    return `<html dir="${dir}"><head><meta charset="utf-8" /><title>${esc(cv.fullName)}</title><style>${baseStyle}</style></head><body>${body}</body></html>`;
  }

  // ===== gradient =====
  if (layout === 'gradient') {
    const body = `
      <div style="min-height:100vh;">
        <div style="background:linear-gradient(120deg, ${ACCENT}, ${ACCENT}99);padding:44px 40px;text-align:center;color:#fff;">
          ${cv.photoUrl ? `<img src="${esc(cv.photoUrl)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.6);margin-bottom:14px;" />` : ''}
          <div style="font-size:26px;font-weight:700;">${esc(cv.fullName)}</div>
          <div style="font-size:15px;opacity:0.95;margin-top:4px;">${esc(cv.jobTitle)}</div>
        </div>
        <div style="padding:30px 40px;">
          <div style="text-align:center;font-size:12px;color:#64748b;margin-bottom:20px;">${[cv.email, cv.phone, cv.location].filter(Boolean).map(esc).join('  &bull;  ')}</div>
          ${cv.summary ? `<div style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:0 0 12px;">${t('نبذة مختصرة', 'Summary')}</div><p class="summary">${esc(cv.summary)}</p>` : ''}
          ${expHtml ? `<div style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:24px 0 12px;">${t('الخبرات العملية', 'Experience')}</div>${expHtml}` : ''}
          ${eduHtml ? `<div style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:24px 0 12px;">${t('التعليم', 'Education')}</div>${eduHtml}` : ''}
        </div>
      </div>`;
    return `<html dir="${dir}"><head><meta charset="utf-8" /><title>${esc(cv.fullName)}</title><style>${baseStyle}</style></head><body>${body}</body></html>`;
  }

  // ===== classic (الافتراضي) =====
  const body = `
    <div style="padding:40px;">
      <div style="display:flex;align-items:center;gap:18px;border-bottom:3px solid ${ACCENT};padding-bottom:18px;margin-bottom:20px;">
        ${cv.photoUrl ? `<img src="${esc(cv.photoUrl)}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;" />` : ''}
        <div>
          <div style="font-size:26px;font-weight:700;color:${ACCENT};">${esc(cv.fullName)}</div>
          <div style="font-size:14px;color:#6b7280;margin-top:2px;">${esc(cv.jobTitle)}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:6px;">${[cv.email, cv.phone, cv.location].filter(Boolean).map(esc).join('  &bull;  ')}</div>
        </div>
      </div>
      ${cv.summary ? `<div style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:0 0 12px;">${t('نبذة مختصرة', 'Summary')}</div><p class="summary">${esc(cv.summary)}</p>` : ''}
      ${expHtml ? `<div style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:24px 0 12px;">${t('الخبرات العملية', 'Experience')}</div>${expHtml}` : ''}
      ${eduHtml ? `<div style="font-size:15px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT}22;padding-bottom:6px;margin:24px 0 12px;">${t('التعليم', 'Education')}</div>${eduHtml}` : ''}
      ${(cv.skills?.length || cv.languages?.length) ? `<div style="display:flex;gap:30px;margin-top:16px;">
        ${cv.skills?.length ? `<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:${ACCENT};margin-bottom:8px;">${t('المهارات', 'Skills')}</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${(cv.skills || []).map((s) => `<span style="font-size:11px;border:1px solid ${ACCENT};color:${ACCENT};border-radius:20px;padding:3px 12px;">${esc(s)}</span>`).join('')}</div></div>` : ''}
        ${cv.languages?.length ? `<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:${ACCENT};margin-bottom:8px;">${t('اللغات', 'Languages')}</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${(cv.languages || []).map((l) => `<span style="font-size:11px;border:1px solid ${ACCENT};color:${ACCENT};border-radius:20px;padding:3px 12px;">${esc(l)}</span>`).join('')}</div></div>` : ''}
      </div>` : ''}
    </div>`;
  return `<html dir="${dir}"><head><meta charset="utf-8" /><title>${esc(cv.fullName)}</title><style>${baseStyle}</style></head><body>${body}</body></html>`;
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