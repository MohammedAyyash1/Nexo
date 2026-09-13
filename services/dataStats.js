// حساب إحصائيات حقيقية على البيانات - منطق برمجي بحت، بدون أي موديل ذكاء اصطناعي
export function computeStats(rows) {
  if (!rows.length) return {};
  const columns = Object.keys(rows[0]);
  const stats = {};

  for (const col of columns) {
    const values = rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== '');
    const numericValues = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
    const isNumeric = numericValues.length > 0 && numericValues.length >= values.length * 0.7;

    if (isNumeric) {
      const sum = numericValues.reduce((a, b) => a + b, 0);
      stats[col] = {
        type: 'numeric',
        count: numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        avg: Math.round((sum / numericValues.length) * 100) / 100,
        sum: Math.round(sum * 100) / 100,
      };
    } else {
      const freq = {};
      for (const v of values) {
        const key = String(v);
        freq[key] = (freq[key] || 0) + 1;
      }
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
      stats[col] = {
        type: 'categorical',
        distinctCount: Object.keys(freq).length,
        topValues: sorted.map(([value, count]) => ({ value, count })),
      };
    }
  }

  return stats;
}