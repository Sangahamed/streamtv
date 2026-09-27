// lib/stream-check.js — Vérifie côté serveur quelles sources d'une chaîne
// répondent réellement, et convertit les directs YouTube officiels en
// lecteur intégré. Résultats gardés quelques minutes en mémoire.
// Mesuré le 25/09/2026 : médiane 2,8 s et 90e centile 5,8 s pour la seule
// playlist. Un délai plus court déclarait morts des flux simplement lents.
const PROBE_TIMEOUT_MS = 8000;
// Le lecteur n'attend jamais plus que ça : au-delà, la source est renvoyée
// comme « inconnue » (alive: null) et le test continue en arrière-plan pour
// la prochaine ouverture.
const MAX_WAIT_MS = 2500;
const RESULT_TTL_MS = 10 * 60 * 1000;
const results = new Map(); // url -> { at, value }

function remember(url, value) {
  results.set(url, { at: Date.now(), value });
  if (results.size > 5000) results.delete(results.keys().next().value);
  return value;
}

function recall(url) {
  const hit = results.get(url);
  return hit && Date.now() - hit.at < RESULT_TTL_MS ? hit.value : undefined;
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store', redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

// Origine factice envoyée pour savoir si le diffuseur autorise la lecture
// depuis un autre site (en-tête Access-Control-Allow-Origin).
const PROBE_ORIGIN = 'https://streamtv.invalid';

// Une playlist HLS vivante répond 2xx et commence par #EXTM3U.
// Renvoie { alive, cors } : alive = true | false | null (lent, inconnu),
// cors = false quand hls.js ne pourra pas lire ce flux dans un navigateur.
async function probeHls({ url, referrer, userAgent }) {
  const cached = recall(url);
  if (cached !== undefined) return cached;
  try {
    const headers = {
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
      Origin: PROBE_ORIGIN,
    };
    if (referrer) headers.Referer = referrer;
    const res = await fetchWithTimeout(url, { headers });
    if (!res.ok) return remember(url, { alive: false, cors: null });
    const acao = res.headers.get('access-control-allow-origin');
    const cors = acao === '*' || acao === PROBE_ORIGIN;
    const type = res.headers.get('content-type') || '';
    if (!url.includes('.m3u8') && /video\/|octet-stream/.test(type)) {
      res.body?.cancel();
      return remember(url, { alive: true, cors });
    }
    const text = await res.text();
    if (!text.slice(0, 200).includes('#EXTM3U')) return remember(url, { alive: false, cors });
    // Flux chiffré dont la clé exige un abonnement (401/403) : la playlist
    // répond mais rien n'est lisible, le lecteur échouerait sur la clé.
    const keyUri = text.match(/#EXT-X-KEY:[^\n]*URI="([^"]+)"/)?.[1];
    if (keyUri && !keyUri.startsWith('skd:')) {
      const key = await fetchWithTimeout(new URL(keyUri, res.url || url).href, { headers });
      key.body?.cancel();
      if (key.status === 401 || key.status === 403) return remember(url, { alive: false, cors, locked: true });
    }
    return remember(url, { alive: true, cors });
  } catch (err) {
    // Délai dépassé = lent, pas forcément mort : on ne le condamne pas.
    const value = { alive: err?.name === 'AbortError' ? null : false, cors: null };
    return remember(url, value);
  }
}

// https://www.youtube.com/@Chaine/live → lecteur intégré du direct officiel.
async function resolveYouTube(url) {
  const cached = recall(url);
  if (cached !== undefined) return cached;
  try {
    const direct = url.match(/youtube\.com\/channel\/(UC[\w-]{22})/)?.[1];
    const videoId = url.match(/(?:v=|youtu\.be\/|\/live\/)([\w-]{11})(?:[?&]|$)/)?.[1];
    let channelId = direct;
    if (!channelId && !videoId) {
      const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'fr-FR' } });
      const html = await res.text();
      channelId = html.match(/"(?:externalId|channelId)":"(UC[\w-]{22})"/)?.[1];
    }
    const embed = videoId
      ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`
      : channelId
        ? `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1`
        : null;
    return remember(url, embed);
  } catch {
    return remember(url, null);
  }
}

function withDeadline(promise) {
  return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), MAX_WAIT_MS))]);
}

// wait : attend la fin de chaque test (jusqu'à PROBE_TIMEOUT_MS) au lieu de
// renvoyer « inconnu » au bout de MAX_WAIT_MS.
export async function checkStreams(streams, { wait = false } = {}) {
  const checked = await Promise.all(
    streams.map(async (s) => {
      if (s.kind === 'youtube') {
        // Sans URL intégrable, la source est inutilisable : on l'attend.
        const embed = await resolveYouTube(s.url);
        return { ...s, embed, alive: !!embed };
      }
      if (s.kind === 'twitch') {
        const channel = s.url.match(/twitch\.tv\/([\w]+)/)?.[1];
        return { ...s, twitchChannel: channel || null, alive: !!channel };
      }
      const probe = await (wait ? probeHls(s) : withDeadline(probeHls(s)));
      return { ...s, alive: probe?.alive ?? null, cors: probe?.cors ?? null };
    })
  );
  // Tri stable : sources qui répondent, puis inconnues, puis hors ligne.
  const rank = alive => (alive === true ? 2 : alive === null ? 1 : 0);
  return checked
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(b.s.alive) - rank(a.s.alive) || a.i - b.i)
    .map(({ s }) => s);
}
