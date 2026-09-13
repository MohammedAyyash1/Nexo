// تحويل Markdown مبسّط لـHTML - كافي لعناوين/عريض/قوائم/فقرات، بدون أي مكتبة خارجية
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function simpleMarkdownToHtml(text) {
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  const inlineFormat = (line) => escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^#{1,3}\s+/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      const level = line.match(/^#{1,3}/)[0].length;
      const content = line.replace(/^#{1,3}\s+/, '');
      html += `<h${level + 1}>${inlineFormat(content)}</h${level + 1}>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inlineFormat(line.replace(/^[-*]\s+/, ''))}</li>`;
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<br/>';
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${inlineFormat(line)}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function sanitizeFilename(title) {
  return (title || 'nexo-export').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim().slice(0, 60) || 'nexo-export';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function deriveTitleFromContent(content) {
  const firstLine = content.split('\n').find((l) => l.trim());
  if (!firstLine) return 'Nexo';
  return firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').slice(0, 60);
}

// تصدير Word - عبر HTML متوافق مع Word، يفتح مباشرة بـWord/WPS/LibreOffice بدون أي مكتبة خارجية
export function exportMessageAsWord(text, title, lang) {
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const bodyHtml = simpleMarkdownToHtml(text);
  const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
    <body dir="${dir}" style="font-family: Arial, sans-serif; font-size: 14px;">${bodyHtml}</body>
  </html>`;
  const blob = new Blob(['\ufeff', doc], { type: 'application/msword' });
  downloadBlob(blob, `${sanitizeFilename(title)}.doc`);
}

// تصدير PDF - عبر نافذة طباعة المتصفح (أدق طريقة لعرض العربي صحيح 100%، بدون مكتبات خارجية)
export function exportMessageAsPdf(text, title, lang) {
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const bodyHtml = simpleMarkdownToHtml(text);
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert(lang === 'en' ? 'Please allow popups to export as PDF.' : 'الرجاء السماح بالنوافذ المنبثقة لتصدير PDF.');
    return;
  }
  printWindow.document.write(`
    <html dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 40px; line-height: 1.8; color: #111; }
          h1, h2, h3, h4 { margin: 16px 0 8px; }
          ul { padding-inline-start: 24px; }
          p { margin: 8px 0; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${bodyHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}