// حاسبة الزكاة المبسّطة - المستخدم يدخل القيمة الإجمالية مباشرة (بدل تفصيل ذهب/فضة/سعر الغرام)
export function calculateZakat({ totalWealth = 0, debts = 0, nisabValue = null }) {
  const netWealth = Math.max(0, totalWealth - debts);
  const hasNisabInfo = nisabValue !== null && nisabValue !== undefined && nisabValue > 0;
  const isDue = hasNisabInfo ? netWealth >= nisabValue : null; // null = غير محدد (المستخدم ما أدخل النصاب)
  const zakatAmount = Math.round(netWealth * 0.025 * 100) / 100;

  return {
    totalWealth: Math.round(totalWealth * 100) / 100,
    netWealth: Math.round(netWealth * 100) / 100,
    nisabValue: hasNisabInfo ? Math.round(nisabValue * 100) / 100 : null,
    hasNisabInfo,
    isDue,
    zakatAmount,
  };
}