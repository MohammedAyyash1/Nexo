// يجيب الترجمة النصية (Transcript) من يوتيوب مباشرة - بدون API key، عبر endpoint عام يوفره يوتيوب نفسه
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export async function getYoutubeTranscript(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('invalid_youtube_url');

  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = await pageResponse.text();

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const videoTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(' - YouTube', '')) : videoId;

  const captionsMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!captionsMatch) throw new Error('no_captions_available');

  let tracks;
  try {
    tracks = JSON.parse(captionsMatch[1]);
  } catch (e) {
    throw new Error('no_captions_available');
  }
  if (!tracks.length) throw new Error('no_captions_available');

  // نفضّل ترجمة عربية أو إنجليزية إن وُجدت، وإلا نأخذ أول ترجمة متوفرة
  const track = tracks.find((t) => t.languageCode === 'ar') || tracks.find((t) => t.languageCode === 'en') || tracks[0];
  const captionUrl = track.baseUrl;

  const captionResponse = await fetch(captionUrl);
  const captionXml = await captionResponse.text();

  const textMatches = [...captionXml.matchAll(/<text[^>]*>(.*?)<\/text>/g)];
  const transcript = textMatches.map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ''))).join(' ');

  if (!transcript.trim()) throw new Error('no_captions_available');
  return { videoTitle, transcript: transcript.trim() };
}