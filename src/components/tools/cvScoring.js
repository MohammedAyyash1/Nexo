// محرك تسجيل محلي بالكامل للسيرة الذاتية — بدون أي استدعاء AI أو Backend.
// قابل للتعديل بسهولة (الأوزان والقواعد كلها بمكان واحد).

// ===== 1) نسبة اكتمال السيرة الذاتية =====
// كل قسم ما بيُحسب "مكتمل" إلا لو فيه محتوى فعلي (مش موجود كمصفوفة فاضية بس)
export function computeCompletion(cv) {
  const personalFields = [cv.fullName, cv.jobTitle, cv.email, cv.phone, cv.location];
  const personalFilled = personalFields.filter((f) => f && f.trim()).length;
  const personalScore = (personalFilled / personalFields.length) * 20;

  const summaryScore = cv.summary && cv.summary.trim() ? 15 : 0;

  const expFilled = (cv.experience || []).filter((e) => e.role?.trim() && e.company?.trim());
  const hasExp = (cv.experience || []).length > 0;
  const experienceScore = !hasExp ? 0 : expFilled.length === cv.experience.length ? 20 : 10;

  const eduFilled = (cv.education || []).filter((e) => e.degree?.trim() && e.institution?.trim());
  const hasEdu = (cv.education || []).length > 0;
  const educationScore = !hasEdu ? 0 : eduFilled.length === cv.education.length ? 15 : 7;

  const skillsCount = (cv.skills || []).length;
  const skillsScore = skillsCount >= 3 ? 15 : skillsCount > 0 ? 8 : 0;

  const projectsScore = (cv.projects || []).length > 0 ? 10 : 0;
  const certsScore = (cv.certifications || []).length > 0 ? 5 : 0;

  const total = Math.round(personalScore + summaryScore + experienceScore + educationScore + skillsScore + projectsScore + certsScore);

  const sections = [
    { key: 'personal', label: 'المعلومات الأساسية', status: personalFilled === personalFields.length ? 'done' : personalFilled > 0 ? 'partial' : 'empty' },
    { key: 'summary', label: 'النبذة المختصرة', status: summaryScore === 15 ? 'done' : 'empty' },
    { key: 'experience', label: 'الخبرات العملية', status: experienceScore === 20 ? 'done' : experienceScore > 0 ? 'partial' : 'empty' },
    { key: 'education', label: 'التعليم', status: educationScore === 15 ? 'done' : educationScore > 0 ? 'partial' : 'empty' },
    { key: 'skills', label: 'المهارات', status: skillsScore === 15 ? 'done' : skillsScore > 0 ? 'partial' : 'empty' },
    { key: 'projects', label: 'المشاريع', status: projectsScore === 10 ? 'done' : 'empty' },
    { key: 'certifications', label: 'الشهادات والدورات', status: certsScore === 5 ? 'done' : 'empty' },
  ];

  return { total: Math.min(100, total), sections };
}

// أول قسم ناقص بترتيب الأولوية — يُستخدم لزر "تحسين سيرتي"
export function firstIncompleteSection(completion) {
  const found = completion.sections.find((s) => s.status !== 'done');
  return found ? found.key : null;
}

// ===== 2) فحص توافق ATS — قواعد واضحة وحتمية، بدون أي ادعاء بضمان القبول =====
export function computeAtsCheck(cv, template) {
  const checks = [];
  const push = (key, label, status) => checks.push({ key, label, status });

  push('name', 'الاسم الكامل', cv.fullName?.trim() ? 'good' : 'issue');
  push('email', 'البريد الإلكتروني', cv.email?.trim() ? 'good' : 'issue');
  push('phone', 'رقم الهاتف', cv.phone?.trim() ? 'good' : 'review');
  push('summary', 'النبذة المهنية', cv.summary?.trim() ? 'good' : 'review');
  push('experience', 'الخبرات العملية', (cv.experience || []).length > 0 ? 'good' : 'review');
  push('education', 'التعليم', (cv.education || []).length > 0 ? 'good' : 'review');
  push('skills', 'المهارات', (cv.skills || []).length > 0 ? 'good' : 'review');

  const hasEmptyExp = (cv.experience || []).some((e) => !e.role?.trim() && !e.company?.trim());
  if (hasEmptyExp) push('empty-exp', 'يوجد خبرة عمل فارغة لم تُستكمل', 'review');
  const hasEmptyEdu = (cv.education || []).some((e) => !e.degree?.trim() && !e.institution?.trim());
  if (hasEmptyEdu) push('empty-edu', 'يوجد مؤهل تعليمي فارغ لم يُستكمل', 'review');

  // القالب — حسب نوعه فقط، بدون منع استخدام أي قالب
  const layout = template?.layout;
  if (layout === 'ats') {
    push('template', 'القالب الحالي مصمم خصيصًا للتوافق مع ATS', 'good');
  } else if (layout === 'sidebar' || layout === 'horizon') {
    push('template', 'القالب الحالي يستخدم عمودًا جانبيًا بصريًا، قد تتعامل معه بعض أنظمة ATS بشكل غير كامل', 'review');
  } else if (layout === 'aurora' || layout === 'gradient' || layout === 'executive') {
    push('template', 'القالب الحالي يحتوي عناصر تصميمية بصرية غنية، فكّر بقالب أبسط لو كنت تقدّم لشركة تعتمد ATS بشكل صارم', 'review');
  } else {
    push('template', 'تخطيط القالب الحالي بسيط نسبيًا ومناسب للقراءة الآلية', 'good');
  }

  if (cv.photoUrl) {
    push('photo', layout === 'ats'
      ? 'السيرة تحتوي صورة شخصية رغم استخدامك قالب ATS — بعض الأنظمة تتجاهلها بأمان، بس يفضّل حذفها للسلامة القصوى'
      : 'السيرة تحتوي صورة شخصية — بعض أنظمة ATS لا تقرأها أو تتجاهل المحتوى المجاور لها', 'review');
  }

  const totalEntries = (cv.experience || []).length + (cv.education || []).length + (cv.projects || []).length + (cv.certifications || []).length;
  push('length', totalEntries > 12 ? 'عدد عناصر السيرة كبير نسبيًا — تأكد أنها لا تتجاوز صفحتين' : 'طول المحتوى ضمن معدل مناسب', totalEntries > 12 ? 'review' : 'good');

  const weight = { good: 1, review: 0.5, issue: 0 };
  const score = Math.round((checks.reduce((s, c) => s + weight[c.status], 0) / checks.length) * 100);

  return { score, checks };
}