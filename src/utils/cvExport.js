// يبني نص Markdown من بيانات السيرة الذاتية - يُمرَّر مباشرة لأدوات exportDoc.js الموجودة
export function buildCvMarkdown(data, lang) {
  const t = (ar, en) => (lang === 'en' ? en : ar);
  let md = `# ${data.fullName || ''}\n`;
  if (data.jobTitle) md += `${data.jobTitle}\n`;
  const contactLine = [data.email, data.phone, data.location].filter(Boolean).join(' | ');
  if (contactLine) md += `${contactLine}\n`;

  if (data.summary) {
    md += `\n## ${t('نبذة مختصرة', 'Summary')}\n${data.summary}\n`;
  }

  if (data.experience?.length) {
    md += `\n## ${t('الخبرات العملية', 'Experience')}\n`;
    for (const exp of data.experience) {
      md += `\n**${exp.role || ''} - ${exp.company || ''}** (${exp.period || ''})\n`;
      if (exp.description) md += `${exp.description}\n`;
    }
  }

  if (data.education?.length) {
    md += `\n## ${t('التعليم', 'Education')}\n`;
    for (const edu of data.education) {
      md += `- **${edu.degree || ''}** - ${edu.institution || ''} (${edu.period || ''})\n`;
    }
  }

  if (data.skills?.length) {
    md += `\n## ${t('المهارات', 'Skills')}\n`;
    md += data.skills.map((s) => `- ${s}`).join('\n') + '\n';
  }

  if (data.languages?.length) {
    md += `\n## ${t('اللغات', 'Languages')}\n`;
    md += data.languages.map((l) => `- ${l}`).join('\n') + '\n';
  }

  return md;
}