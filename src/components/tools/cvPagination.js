// خوارزمية توزيع الكتل (Blocks) عبر صفحات A4 — منطق بحت بدون أي تعامل مع DOM،
// قابل للاختبار لحاله بمعزل عن باقي الكود. بيوزّع الكتل بالترتيب على صفحات
// بدون ما يقطع كتلة لنصين (تجربة عمل أو تعليم كاملة تضل سوا دايمًا).
//
// blockHeights: مصفوفة أرقام (ارتفاع كل كتلة بالبكسل المنطقي)
// pageCapacityPx: السعة المتاحة لكل صفحة غير الأولى
// firstPageCapacityPx: السعة المتاحة للصفحة الأولى (أقل عادة بسبب الرأس/الـSidebar)
// بترجع: مصفوفة صفحات، كل صفحة = مصفوفة indices (مواقع الكتل بمصفوفة blockHeights الأصلية)
export function paginateBlocks(blockHeights, pageCapacityPx, firstPageCapacityPx) {
  const pages = [];
  let current = [];
  let used = 0;
  let capacity = Math.max(1, firstPageCapacityPx);

  blockHeights.forEach((h, i) => {
    // لو الكتلة نفسها أطول من صفحة كاملة (نادر - نص طويل جدًا بخبرة وحدة)،
    // منحطها لحالها بصفحتها بدل ما تعلق بحلقة لانهائية أو تختفي
    const effectiveCapacity = Math.max(capacity, h);
    if (current.length > 0 && used + h > effectiveCapacity) {
      pages.push(current);
      current = [];
      used = 0;
      capacity = Math.max(1, pageCapacityPx);
    }
    current.push(i);
    used += h;
  });

  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);
  return pages;
}