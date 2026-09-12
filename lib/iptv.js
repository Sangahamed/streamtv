import { cacheGet, cacheSet } from '@/lib/cache';

const CHANNELS_URL = 'https://iptv-org.github.io/api/channels.json';
const STREAMS_URL = 'https://iptv-org.github.io/api/streams.json';
const COUNTRIES_URL = 'https://iptv-org.github.io/api/countries.json';
const BLOCKLIST_URL = 'https://iptv-org.github.io/api/blocklist.json';
// Source communautaire secondaire (projet distinct d'iptv-org), utilisée en
// chevauchement pour ajouter des flux alternatifs et limiter l'impact des
// liens morts sur une seule source. Best-effort : si elle échoue, on ignore
// silencieusement et on continue avec iptv-org seul.
const FREE_TV_M3U_URL = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';
// Chaînes ivoiriennes (NCI, RTI, etc.) largement absentes du catalogue
// iptv-org. Constaté le 11/09/2026 : ce dépôt communautaire indépendant
// référence NCI, RTI 1/2/3 et une quinzaine d'autres chaînes CI avec de vrais
// flux HLS. Beaucoup d'entrées du fichier pointent vers des liens
// plugin://... (Dailymotion/YouTube via Kodi) qui ne fonctionnent pas dans un
// lecteur web — on les filtre. "LA3" mentionné par l'utilisateur n'a pas été
// retrouvé dans cette source précise ; à vérifier si une autre source existe.
const CI_CHANNELS_M3U_URL = 'https://raw.githubusercontent.com/bitsbb01/iptvmu3/main/C%C3%B4te%20d%E2%80%99Ivoire.m3u';
const REVALIDATE_SECONDS = 3600;
export const SPORT_CATEGORY = 'sports';

// Les fichiers channels.json (~10 Mo) et streams.json (~4,7 Mo) dépassent la
// limite de 2 Mo du cache de fetch intégré à Next.js : celui-ci échoue
// silencieusement et retélécharge tout à chaque requête. On désactive donc ce
// cache ici (cache: 'no-store') et on met en cache nous-mêmes, plus bas, le
// résultat déjà filtré de getLiveTvData() via lib/cache.js — bien plus léger
// que les fichiers bruts.
async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Échec du chargement (${res.status})`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Échec du chargement (${res.status})`);
  return res.text();
}

// Parse minimal d'un fichier M3U/M3U8 avec attributs #EXTINF (tvg-id, tvg-logo, group-title).
function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let current = null;
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (l.startsWith('#EXTINF')) {
      const idMatch = l.match(/tvg-id="([^"]*)"/i);
      const logoMatch = l.match(/tvg-logo="([^"]*)"/i);
      const groupMatch = l.match(/group-title="([^"]*)"/i);
      const nameMatch = l.match(/,(.*)$/);
      current = {
        id: idMatch ? idMatch[1] : null,
        logo: logoMatch ? logoMatch[1] : null,
        group: groupMatch ? groupMatch[1] : null,
        name: nameMatch ? nameMatch[1].trim() : 'Sans nom',
      };
    } else if (!l.startsWith('#') && current) {
      entries.push({ ...current, url: l });
      current = null;
    }
  }
  return entries;
}

// Récupère les flux de la source secondaire, indexés par id de chaîne (tvg-id)
// quand il correspond à la convention iptv-org, pour venir compléter les flux
// existants plutôt que dupliquer les chaînes.
async function getFreeTvStreamsByChannel() {
  try {
    const text = await fetchText(FREE_TV_M3U_URL);
    const entries = parseM3U(text);
    const byChannel = {};
    for (const e of entries) {
      if (!e.id || !e.url) continue;
      (byChannel[e.id] ||= []).push({ url: e.url, quality: null, source: 'free-tv' });
    }
    return byChannel;
  } catch (err) {
    console.warn('Source secondaire Free-TV/IPTV indisponible, ignorée:', err.message);
    return {};
  }
}

// Nettoie les suffixes d'annotation de la source (qualité, méthode de lecture,
// statut) pour regrouper les entrées d'une même chaîne sous un seul nom.
function cleanChannelName(name) {
  return name.replace(/\s*\((1080p|720p|OPT-\d+|DM|STK|YT|c_id|UPD|OFFLINE)\)\s*/gi, '').trim();
}

async function getCoteDIvoireExtraChannels() {
  try {
    const text = await fetchText(CI_CHANNELS_M3U_URL);
    const entries = parseM3U(text);
    const byId = new Map();
    for (const e of entries) {
      if (!e.id || !e.url) continue;
      if (e.url.startsWith('plugin://')) continue; // injouable dans un lecteur web (Kodi-only)
      if (/\(OFFLINE\)/i.test(e.name)) continue; // explicitement marqué mort par la source
      if (!byId.has(e.id)) {
        byId.set(e.id, {
          id: e.id,
          name: cleanChannelName(e.name),
          country: 'CI',
          categories: [],
          pureSport: false,
          logo: e.logo || null,
          streams: [],
        });
      }
      byId.get(e.id).streams.push({ url: e.url, quality: null, source: 'iptvmu3-ci' });
    }
    return [...byId.values()].filter(c => c.streams.length > 0);
  } catch (err) {
    console.warn('Source secondaire Côte d\'Ivoire indisponible, ignorée:', err.message);
    return [];
  }
}

const isPureSport = cats => cats.length > 0 && cats.every(c => c === SPORT_CATEGORY);

export async function getLiveTvData() {
  const cacheKey = 'live-tv-data';
  const cached = await cacheGet(cacheKey).catch(() => null);
  if (cached) return cached;

  const [channels, streams, countries, blocklist, freeTvStreams, ciExtraChannels] = await Promise.all([
    fetchJson(CHANNELS_URL), fetchJson(STREAMS_URL), fetchJson(COUNTRIES_URL), fetchJson(BLOCKLIST_URL),
    getFreeTvStreamsByChannel(),
    getCoteDIvoireExtraChannels(),
  ]);
  const blocked = new Set(blocklist.map(b => b.channel));
  const countryNames = Object.fromEntries(countries.map(c => [c.code, c.name]));
  const byChannel = {};
  for (const s of streams) {
    if (!s.channel || !s.url) continue;
    (byChannel[s.channel] ||= []).push({ url: s.url, quality: s.quality || null, source: 'iptv-org' });
  }
  // Fusion : les flux de la source secondaire viennent s'ajouter en fin de
  // liste des flux existants (chevauchement), sans créer de doublons d'URL.
  for (const [channelId, extraStreams] of Object.entries(freeTvStreams)) {
    if (!byChannel[channelId]) continue;
    const existingUrls = new Set(byChannel[channelId].map(s => s.url));
    for (const s of extraStreams) {
      if (!existingUrls.has(s.url)) byChannel[channelId].push(s);
    }
  }
  const list = channels.filter(c => {
    if (c.closed || c.is_nsfw || blocked.has(c.id)) return false;
    const cats = c.categories || [];
    if (cats.includes('xxx') || !byChannel[c.id]) return false;
    return true;
  }).map(c => ({
    id:c.id, name:c.name, country:c.country || null, categories:c.categories || [],
    pureSport:isPureSport(c.categories || []), logo:c.logo || null, streams:byChannel[c.id]
  }));
  // Ajout des chaînes ivoiriennes absentes d'iptv-org (voir CI_CHANNELS_M3U_URL).
  const existingIds = new Set(list.map(c => c.id));
  for (const c of ciExtraChannels) {
    if (!existingIds.has(c.id)) list.push(c);
  }
  const usedCountries = [...new Set(list.map(c=>c.country))].filter(Boolean)
    .map(code=>({code,name:countryNames[code]||code})).sort((a,b)=>a.name.localeCompare(b.name));
  const result = {
    channels:list, countries:usedCountries,
    categories:[...new Set(list.flatMap(c=>c.categories))].sort(),
    sportCount:list.filter(c=>c.pureSport).length
  };
  await cacheSet(cacheKey, result, REVALIDATE_SECONDS).catch(() => {});
  return result;
}

export async function getChannels({ includeSports=false, country=null, category=null }={}) {
  const data = await getLiveTvData();
  return data.channels.filter(c => {
    if (!includeSports && c.pureSport) return false;
    if (country && c.country !== country) return false;
    if (category && !c.categories.includes(category)) return false;
    return true;
  });
}
