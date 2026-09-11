import * as cheerio from 'cheerio';
import { cacheGet, cacheSet } from '@/lib/cache';

const DZRI_BASE = 'https://dzritv.com';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const matchUrl = searchParams.get('url');
  if (!matchUrl) return Response.json({ error: 'URL match manquante' }, { status: 400 });

  const cacheKey = `dzritv:stream:${Buffer.from(matchUrl).toString('base64').slice(0, 32)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return Response.json({ ...cached, cached: true });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(matchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Referer': 'https://dzritv.com/sport/football' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const sources = [];

    $('iframe').each((_, el) => {
      const src = $(el).attr('src');
      if (src) sources.push({ type: 'iframe', url: resolveUrl(src), quality: 'unknown' });
    });

    $('video source').each((_, el) => {
      const src = $(el).attr('src');
      const type = $(el).attr('type') || '';
      if (src) sources.push({ type: type.includes('m3u8') ? 'hls' : 'mp4', url: resolveUrl(src), quality: $(el).attr('data-quality') || 'auto' });
    });

    const scriptText = $('script').map((_, el) => $(el).html()).get().join(' ');
    const m3u8Match = scriptText.match(/["']([^"']+\.m3u8[^"]*)["']/);
    const mp4Match = scriptText.match(/["']([^"']+\.mp4[^"]*)["']/);
    if (m3u8Match && !sources.find(s => s.url.includes('.m3u8'))) sources.push({ type: 'hls', url: resolveUrl(m3u8Match[1]), quality: 'auto' });
    if (mp4Match && !sources.find(s => s.url.includes('.mp4'))) sources.push({ type: 'mp4', url: resolveUrl(mp4Match[1]), quality: 'auto' });

    $('[data-stream], [data-src], [data-video]').each((_, el) => {
      const stream = $(el).attr('data-stream') || $(el).attr('data-src') || $(el).attr('data-video');
      if (stream) sources.push({ type: stream.includes('.m3u8') ? 'hls' : 'iframe', url: resolveUrl(stream), quality: 'auto' });
    });

    const unique = sources.filter((s, i, arr) => arr.findIndex(t => t.url === s.url) === i);
    const result = { matchUrl, sources: unique, count: unique.length, expires: new Date(Date.now() + 2 * 60 * 1000).toISOString() };
    await cacheSet(cacheKey, result, 120);
    return Response.json({ ...result, cached: false });
  } catch (err) {
    return Response.json({ error: err.message, sources: [] }, { status: 500 });
  }
}

function resolveUrl(url) {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${DZRI_BASE}${url}`;
}
