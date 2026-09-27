// lib/stream-proxy.js — Relais serveur des flux HLS que le navigateur ne peut
// pas lire seul : flux exigeant un Referer / User-Agent, flux en http:// sur
// un site en https (contenu mixte) et diffuseurs qui refusent le CORS.
// Chaque URL relayée est signée (HMAC) : le relais ne sert que des adresses
// émises par le serveur lui-même, jamais une URL arbitraire.
// Aucune donnée de visiteur n'est conservée ni transmise au diffuseur
// (ni IP, ni cookies, ni en-têtes du navigateur).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const PROXY_PATH = '/api/tv/proxy';

// Secret stable à définir en production (sinon les liens signés par une
// instance ne sont pas reconnus par une autre) ; aléatoire par processus sinon.
const store = (globalThis.__streamtvProxy ||= {
  secret: process.env.STREAM_PROXY_SECRET || randomBytes(32).toString('hex'),
});

function sign(url, referrer, userAgent) {
  return createHmac('sha256', store.secret)
    .update(`${url}\n${referrer || ''}\n${userAgent || ''}`)
    .digest('base64url')
    .slice(0, 32);
}

// Lien relatif vers le relais pour `url`, avec les en-têtes à rejouer.
export function proxyUrl(url, headers = {}) {
  return signedLink(PROXY_PATH, url, headers);
}

// Même signature pour tout point d'entrée qui accepte une URL de flux
// (relais, conversion HEVC) : vérifiée par verifyProxyParams().
export function signedLink(path, url, { referrer = null, userAgent = null } = {}) {
  const params = new URLSearchParams({ u: url });
  if (referrer) params.set('r', referrer);
  if (userAgent) params.set('a', userAgent);
  params.set('t', sign(url, referrer, userAgent));
  return `${path}?${params}`;
}

// Renvoie { url, referrer, userAgent } si la signature est valide, sinon null.
export function verifyProxyParams(searchParams) {
  const url = searchParams.get('u');
  const referrer = searchParams.get('r');
  const userAgent = searchParams.get('a');
  const token = searchParams.get('t') || '';
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const expected = Buffer.from(sign(url, referrer, userAgent));
  const given = Buffer.from(token);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (isPrivateHost(new URL(url).hostname)) return null;
  return { url, referrer, userAgent };
}

// Refuse les adresses du réseau local (le relais ne doit jamais servir
// de porte d'entrée vers la machine ou le réseau qui l'héberge).
export function isPrivateHost(host) {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (h.includes(':')) return h === '::1' || h === '::' || /^(fc|fd|fe80)/.test(h) || h.startsWith('::ffff:');
  return false;
}

export function isPlaylist(contentType, url) {
  return /mpegurl|x-mpegurl/i.test(contentType || '') || /\.m3u8?(\?|$)/i.test(url || '');
}

// Réécrit toutes les URI d'une playlist HLS (variantes, segments, clés,
// sous-titres, pistes audio) pour qu'elles passent elles aussi par le relais,
// avec les mêmes en-têtes que la playlist d'origine.
export function rewritePlaylist(text, baseUrl, headers) {
  const wrap = (uri) => {
    try {
      return proxyUrl(new URL(uri, baseUrl).href, headers);
    } catch {
      return uri;
    }
  };
  return text.split(/\r?\n/).map((line) => {
    const l = line.trim();
    if (!l) return line;
    if (l.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${wrap(uri)}"`);
    return wrap(l);
  }).join('\n');
}
