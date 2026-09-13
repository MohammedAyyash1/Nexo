// طبقة تجريد لمزوّد البحث — حاليًا Google Search (مدمج مع Gemini)
// لو بدنا نبدّل مزوّد لاحقًا، نعدّل بس هاتين الدالتين

export function getSearchTool(provider = 'google') {
  if (provider === 'google') {
    return [{ google_search: {} }];
  }
  return [];
}

export function extractSources(groundingMetadata) {
  if (!groundingMetadata?.groundingChunks) return [];
  return groundingMetadata.groundingChunks
    .filter((c) => c.web?.uri)
    .map((c) => ({ title: c.web.title || c.web.uri, url: c.web.uri }));
}