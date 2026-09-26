import { isPlaylist, isPrivateHost, rewritePlaylist, verifyProxyParams } from '@/lib/stream-proxy';

// Relais des flux HLS (voir lib/stream-proxy.js). Rien n'est journalisé ni
// mis en cache côté serveur : le relais transmet et oublie.
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 5;
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36';

export async function GET(request) {
  const target = verifyProxyParams(new URL(request.url).searchParams);
  if (!target) return new Response('Lien de relais invalide', { status: 403 });

  // Seuls les en-têtes nécessaires au flux sont envoyés au diffuseur : ni
  // l'IP, ni les cookies, ni l'en-tête Referer du visiteur.
  const headers = { 'User-Agent': target.userAgent || DEFAULT_UA, Accept: '*/*' };
  if (target.referrer) {
    headers.Referer = target.referrer;
    try { headers.Origin = new URL(target.referrer).origin; } catch {}
  }
  const range = request.headers.get('range');
  if (range) headers.Range = range;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  request.signal?.addEventListener('abort', () => controller.abort());
  let upstream;
  let url = target.url;
  try {
    // Redirections suivies à la main pour refuser celles qui mènent vers le
    // réseau local.
    for (let i = 0; ; i++) {
      upstream = await fetch(url, { headers, redirect: 'manual', cache: 'no-store', signal: controller.signal });
      const location = upstream.headers.get('location');
      if (upstream.status < 300 || upstream.status >= 400 || !location) break;
      if (i >= MAX_REDIRECTS) return new Response('Trop de redirections', { status: 508 });
      url = new URL(location, url).href;
      if (!isAllowedRedirect(url)) return new Response('Redirection refusée', { status: 403 });
    }
  } catch (err) {
    clearTimeout(timer);
    return new Response(err?.name === 'AbortError' ? 'Délai dépassé' : 'Flux injoignable', { status: 504 });
  }

  const contentType = upstream.headers.get('content-type') || '';
  const out = new Headers({ 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });

  if (upstream.ok && isPlaylist(contentType, url)) {
    const text = await upstream.text().finally(() => clearTimeout(timer));
    if (text.trimStart().startsWith('#EXTM3U')) {
      out.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(rewritePlaylist(text, url, target), { status: 200, headers: out });
    }
    out.set('Content-Type', contentType || 'text/plain');
    return new Response(text, { status: upstream.status, headers: out });
  }

  // Segments vidéo, clés, mp4 : transmis tels quels, en flux continu.
  clearTimeout(timer);
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

function isAllowedRedirect(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return /^https?:$/.test(protocol) && !isPrivateHost(hostname);
  } catch {
    return false;
  }
}
