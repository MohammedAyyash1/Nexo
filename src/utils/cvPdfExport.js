const ACCENT = '#6d28d9';
const ACCENT_LIGHT = '#f3e8ff';

function esc(str) {
  return (str || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildCvHtml(cv, lang) {
  const t = (ar, en) => (lang === 'en' ? en : ar);
  const dir = lang === 'en' ? 'ltr' : 'rtl';

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

  return `
  <html dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <title>${esc(cv.fullName)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; }
      body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0; size: A4; }
      .page { display: flex; width: 100%; min-height: 100vh; }
      .sidebar { width: 34%; background: ${ACCENT}; color: #fff; padding: 36px 26px; }
      .main { flex: 1; padding: 36px 32px; background: #fff; }
      .photo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid rgba(255,255,255,0.4); display: block; margin: 0 auto 20px; }
      .photo-placeholder { width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 20px; }
      .side-section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85; margin: 26px 0 10px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 6px; }
      .side-item { font-size: 13px; margin-bottom: 6px; opacity: 0.95; }
      .tag { display: inline-block; background: rgba(255,255,255,0.18); padding: 4px 10px; border-radius: 20px; font-size: 11.5px; margin: 0 4px 6px 0; }
      .name { font-size: 26px; font-weight: 700; margin: 0 0 4px; color: ${ACCENT}; }
      .job-title { font-size: 15px; color: #6b7280; margin-bottom: 24px; }
      .main-section-title { font-size: 15px; font-weight: 700; color: ${ACCENT}; border-bottom: 2px solid ${ACCENT_LIGHT}; padding-bottom: 6px; margin: 24px 0 12px; }
      .main-section-title:first-of-type { margin-top: 0; }
      .summary { font-size: 13.5px; line-height: 1.8; color: #374151; }
      .exp-item, .edu-item { margin-bottom: 16px; }
      .exp-header { display: flex; justify-content: space-between; align-items: baseline; }
      .exp-role { font-weight: 600; font-size: 14px; color: #111827; }
      .exp-period { font-size: 11.5px; color: #9ca3af; }
      .exp-company { font-size: 12.5px; color: ${ACCENT}; margin: 2px 0 6px; }
      .exp-desc { font-size: 13px; color: #4b5563; line-height: 1.7; margin: 0; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="sidebar">
        ${cv.photoUrl ? `<img class="photo" src="${esc(cv.photoUrl)}" />` : `<div class="photo-placeholder">${esc((cv.fullName || 'N')[0])}</div>`}

        <div class="side-section-title">${t('التواصل', 'Contact')}</div>
        ${cv.email ? `<div class="side-item">${esc(cv.email)}</div>` : ''}
        ${cv.phone ? `<div class="side-item">${esc(cv.phone)}</div>` : ''}
        ${cv.location ? `<div class="side-item">${esc(cv.location)}</div>` : ''}

        ${cv.skills?.length ? `<div class="side-section-title">${t('المهارات', 'Skills')}</div><div>${skillsHtml}</div>` : ''}
        ${cv.languages?.length ? `<div class="side-section-title">${t('اللغات', 'Languages')}</div>${langsHtml}` : ''}
      </div>
      <div class="main">
        <div class="name">${esc(cv.fullName)}</div>
        <div class="job-title">${esc(cv.jobTitle)}</div>

        ${cv.summary ? `<div class="main-section-title">${t('نبذة مختصرة', 'Summary')}</div><p class="summary">${esc(cv.summary)}</p>` : ''}
        ${expHtml ? `<div class="main-section-title">${t('الخبرات العملية', 'Experience')}</div>${expHtml}` : ''}
        ${eduHtml ? `<div class="main-section-title">${t('التعليم', 'Education')}</div>${eduHtml}` : ''}
      </div>
    </div>
  </body>
  </html>`;
}

export function exportCvAsPdf(cv, lang) {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert(lang === 'en' ? 'Please allow popups to export as PDF.' : 'الرجاء السماح بالنوافذ المنبثقة لتصدير PDF.');
    return;
  }
  printWindow.document.write(buildCvHtml(cv, lang));
  printWindow.document.close();

  // ننتظر كل الصور جوا النافذة تخلص تحميل فعليًا قبل ما نطبع - يحل مشكلة الصورة الفارغة
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

export function exportCvAsWord(cv, lang) {
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>${buildCvHtml(cv, lang).replace(/<html[^>]*>/, '').replace('</html>', '')}</html>`;
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