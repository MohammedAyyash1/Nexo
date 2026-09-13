// حاسبة المواريث (الفرائض) - تغطي الحالات الشائعة فقط (زوج/زوجة، أبناء/بنات، أب/أم، إخوة أشقاء)
// لا تغطي: أجداد، إخوة لأب أو لأم فقط، حالات عول/رد معقدة - هذه تحتاج مراجعة شرعية متخصصة
export function calculateInheritance({
  estateValue = 0, hasHusband = false, wivesCount = 0,
  sonsCount = 0, daughtersCount = 0, fatherAlive = false, motherAlive = false,
  fullBrothersCount = 0, fullSistersCount = 0,
}) {
  const shares = {}; // اسم الوارث -> كسر من التركة (كسور عشرية)
  const hasChildren = sonsCount > 0 || daughtersCount > 0;
  const notes = [];

  // 1) نصيب الزوج/الزوجة
  if (hasHusband) shares.husband = hasChildren ? 1 / 4 : 1 / 2;
  if (wivesCount > 0) shares.wives = hasChildren ? 1 / 8 : 1 / 4;

  // 2) الإخوة الأشقاء يُحجبون كليًا بوجود الأب أو الابن
  const siblingsExcluded = fatherAlive || sonsCount > 0;
  const siblingsCountForMotherRule = siblingsExcluded ? 0 : (fullBrothersCount + fullSistersCount);

  // 3) نصيب الأم
  if (motherAlive) {
    const motherGetsSixth = hasChildren || siblingsCountForMotherRule >= 2;
    // حالة "الغرّاوين/العمريتان": أم + أب + زوج/زوجة فقط بدون أبناء ولا إخوة -> للأم ثلث الباقي بعد نصيب الزوجية
    const isGharrawayn = !hasChildren && siblingsCountForMotherRule === 0 && fatherAlive && (hasHusband || wivesCount > 0);
    if (motherGetsSixth) {
      shares.mother = 1 / 6;
    } else if (isGharrawayn) {
      const spouseShare = hasHusband ? (shares.husband || 0) : (shares.wives || 0);
      shares.mother = (1 - spouseShare) / 3;
      notes.push('طُبّقت حالة "الغرّاوين" (نصيب الأم = ثلث الباقي بعد نصيب الزوج/الزوجة).');
    } else {
      shares.mother = 1 / 3;
    }
  }

  // 4) نصيب الأب: سدس مع وجود فرع وارث، وقد يزيد تعصيبًا إن لم يوجد ابن
  if (fatherAlive) {
    shares.father = hasChildren ? 1 / 6 : 0; // الباقي (تعصيب) يُحسب لاحقًا إن لزم
  }

  // 5) الإخوة الأشقاء (فقط إن لم يُحجبوا)
  if (!siblingsExcluded && (fullBrothersCount > 0 || fullSistersCount > 0)) {
    if (fullBrothersCount === 0) {
      shares.fullSisters = fullSistersCount === 1 ? 1 / 2 : 2 / 3;
    }
    // إن وُجد إخوة ذكور، يصبحون عصبة ويُحسبون بعد توزيع الباقي (أسفل)
  }

  // 6) البنات (فرض) إن لم يوجد ابن، وإلا يصبحن عصبة مع الإخوة
  if (daughtersCount > 0 && sonsCount === 0) {
    shares.daughters = daughtersCount === 1 ? 1 / 2 : 2 / 3;
  }

  // ===== العَوْل: إن زاد مجموع الفروض عن الواحد الصحيح، تُخفَّض كل الفروض بنفس النسبة =====
  let sumOfShares = Object.values(shares).reduce((a, b) => a + b, 0);
  let awlApplied = false;
  if (sumOfShares > 1) {
    const factor = 1 / sumOfShares;
    for (const key in shares) shares[key] *= factor;
    awlApplied = true;
    notes.push('طُبّق مبدأ "العول" لتجاوز مجموع الفروض للواحد الصحيح.');
    sumOfShares = 1;
  }

  // ===== الباقي يذهب للعصبة (الأبناء، أو البنات+الإخوة الذكور، أو الأب، أو الإخوة الذكور) =====
  let remainder = Math.max(0, 1 - sumOfShares);
  const asabaShares = {};

  if (sonsCount > 0) {
    // الأبناء والبنات عصبة بنسبة 2:1
    const totalUnits = sonsCount * 2 + daughtersCount;
    if (totalUnits > 0 && remainder > 0) {
      asabaShares.sons = (remainder * sonsCount * 2) / totalUnits;
      if (daughtersCount > 0) asabaShares.daughters = (remainder * daughtersCount) / totalUnits;
    }
  } else if (!hasChildren && fatherAlive && remainder > 0 && !shares.father) {
    // لا فرع وارث: الأب عصبة بالكامل بعد الفروض الأخرى
    asabaShares.father = remainder;
  } else if (daughtersCount > 0 && fatherAlive && remainder > 0) {
    // بنات فقط + أب: الأب يأخذ الباقي تعصيبًا فوق سدسه
    asabaShares.father = (asabaShares.father || 0) + remainder;
  } else if (!siblingsExcluded && fullBrothersCount > 0 && remainder > 0) {
    const totalUnits = fullBrothersCount * 2 + fullSistersCount;
    asabaShares.fullBrothers = (remainder * fullBrothersCount * 2) / totalUnits;
    if (fullSistersCount > 0) asabaShares.fullSisters = (asabaShares.fullSisters || 0) + (remainder * fullSistersCount) / totalUnits;
  } else if (remainder > 0.0001) {
    notes.push('تبقّى جزء من التركة بلا عصبة واضحة ضمن الورثة المدخلين - يلزم مراجعة شرعية (رَدّ أو ورثة غير مدرجين بهذه الأداة كالأجداد).');
  }

  // ===== تجميع النتيجة النهائية بالنسب والقيم =====
  const finalShares = {};
  const addShare = (key, label, fraction) => {
    if (!fraction || fraction <= 0) return;
    finalShares[key] = { label, fraction, amount: Math.round(fraction * estateValue * 100) / 100 };
  };

  if (shares.husband) addShare('husband', 'الزوج', shares.husband);
  if (shares.wives) addShare('wives', wivesCount > 1 ? `الزوجات (${wivesCount}) مجتمعات` : 'الزوجة', shares.wives);
  if (shares.mother) addShare('mother', 'الأم', shares.mother);
  if (shares.father || asabaShares.father) addShare('father', 'الأب', (shares.father || 0) + (asabaShares.father || 0));
  if (shares.daughters && !asabaShares.daughters) addShare('daughters', daughtersCount > 1 ? `البنات (${daughtersCount}) مجتمعات` : 'البنت', shares.daughters);
  if (asabaShares.sons) addShare('sons', sonsCount > 1 ? `الأبناء (${sonsCount}) مجتمعين` : 'الابن', asabaShares.sons);
  if (asabaShares.daughters) addShare('daughters', daughtersCount > 1 ? `البنات (${daughtersCount}) مجتمعات (تعصيب مع الأبناء)` : 'البنت (تعصيب مع الأبناء)', asabaShares.daughters);
  if (shares.fullSisters && !asabaShares.fullSisters) addShare('fullSisters', fullSistersCount > 1 ? `الأخوات الشقيقات (${fullSistersCount}) مجتمعات` : 'الأخت الشقيقة', shares.fullSisters);
  if (asabaShares.fullBrothers) addShare('fullBrothers', fullBrothersCount > 1 ? `الإخوة الأشقاء (${fullBrothersCount}) مجتمعين` : 'الأخ الشقيق', asabaShares.fullBrothers);
  if (asabaShares.fullSisters) addShare('fullSisters', 'الأخوات الشقيقات (تعصيب مع الإخوة)', asabaShares.fullSisters);

  return { estateValue, shares: finalShares, awlApplied, notes };
}