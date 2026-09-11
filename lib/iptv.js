const CHANNELS_URL = 'https://iptv-org.github.io/api/channels.json';
const STREAMS_URL = 'https://iptv-org.github.io/api/streams.json';
const COUNTRIES_URL = 'https://iptv-org.github.io/api/countries.json';
const BLOCKLIST_URL = 'https://iptv-org.github.io/api/blocklist.json';
// Source communautaire secondaire (projet distinct d'iptv-org), utilisée en
// chevauchement pour ajouter des flux alternatifs et limiter l'impact des
// liens morts sur une seule source. Best-effort : si elle échoue, on ignore
// silencieusement et on continue avec iptv-org seul.
const FREE_TV_M3U_URL = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist.m3u8';
const REVALIDATE_SECONDS = 3600;
export const SPORT_CATEGORY = 'sports';

async function fetchJson(url) {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Échec du chargement (${res.status})`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
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

const isPureSport = cats => cats.length > 0 && cats.every(c => c === SPORT_CATEGORY);

export async function getLiveTvData() {
  const [channels, streams, countries, blocklist, freeTvStreams] = await Promise.all([
    fetchJson(CHANNELS_URL), fetchJson(STREAMS_URL), fetchJson(COUNTRIES_URL), fetchJson(BLOCKLIST_URL),
    getFreeTvStreamsByChannel(),
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
  const usedCountries = [...new Set(list.map(c=>c.country))].filter(Boolean)
    .map(code=>({code,name:countryNames[code]||code})).sort((a,b)=>a.name.localeCompare(b.name));
  return {
    channels:list, countries:usedCountries,
    categories:[...new Set(list.flatMap(c=>c.categories))].sort(),
    sportCount:list.filter(c=>c.pureSport).length
  };
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
