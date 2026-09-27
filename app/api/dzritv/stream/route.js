import * as cheerio from 'cheerio';
import { cacheGet, cacheSet } from '@/lib/cache';

const DZRI_BASE = 'https://dzritv.com';
const inflight = new Map(); // matchUrl -> Promise du scraping en cours

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const matchUrl = searchParams.get('url');
  if (!matchUrl) return Response.json({ error: 'URL match manquante' }, { status: 400 });

  // Clé = URL complète du match. (Tronquer son base64 donnait la même clé à
  // tous les matchs : « https://dzritv.com/match » tient dans les 32 premiers
  // caractères, et chaque match recevait le flux du premier ouvert.)
  const cacheKey = `dzritv:stream:${matchUrl}`;
  // fresh=1 : le lecteur a échoué (lien signé expiré), on ignore le cache.
  const cached = searchParams.get('fresh') ? null : await cacheGet(cacheKey);
  if (cached) return Response.json({ ...cached, cached: true });

  // Un seul appel à dzritv à la fois par match : chaque visite de la page du
  // match crée un nouveau lien signé, et deux appels simultanés (double rendu
  // de React en dev, deux onglets) donnaient deux liens dont un inutilisable.
  let pending = inflight.get(matchUrl);
  if (!pending) {
    pending = scrape(matchUrl).finally(() => inflight.delete(matchUrl));
    inflight.set(matchUrl, pending);
  }
  try {
    const result = await pending;
    // Les liens signés (wmsAuthSign) indiquent validminutes=1 : au-delà d'une
    // minute le serveur vidéo répond 403. Cache court pour ne jamais servir
    // un lien expiré.
    await cacheSet(cacheKey, result, 30);
    return Response.json({ ...result, cached: false });
  } catch (err) {
    return Response.json({ error: err.message, sources: [] }, { status: 500 });
  }
}

async function scrape(matchUrl) {
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
  // Constaté sur une vraie page de match (11/09/2026) : le flux est injecté
  // via `var videoSrc = '...m3u8?...';` dans un <script> inline. La regex
  // doit stopper au VRAI guillemet fermant (simple OU double) : utiliser
  // [^"]* au lieu de [^"']* faisait avaler toute la suite du script jusqu'à
  // un guillemet bien plus loin, produisant une URL corrompue et injouable.
  const m3u8Match = scriptText.match(/["']([^"']+\.m3u8[^"']*)["']/);
  const mp4Match = scriptText.match(/["']([^"']+\.mp4[^"']*)["']/);
  if (m3u8Match && !sources.find(s => s.url.includes('.m3u8'))) sources.push({ type: 'hls', url: resolveUrl(m3u8Match[1]), quality: 'auto' });
  if (mp4Match && !sources.find(s => s.url.includes('.mp4'))) sources.push({ type: 'mp4', url: resolveUrl(mp4Match[1]), quality: 'auto' });

  $('[data-stream], [data-src], [data-video]').each((_, el) => {
    const stream = $(el).attr('data-stream') || $(el).attr('data-src') || $(el).attr('data-video');
    if (stream) sources.push({ type: stream.includes('.m3u8') ? 'hls' : 'iframe', url: resolveUrl(stream), quality: 'auto' });
  });

  const unique = sources.filter((s, i, arr) => arr.findIndex(t => t.url === s.url) === i);
  const result = { matchUrl, sources: unique, count: unique.length, expires: new Date(Date.now() + 60 * 1000).toISOString() };
  return result;
}

function resolveUrl(url) {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${DZRI_BASE}${url}`;
}
