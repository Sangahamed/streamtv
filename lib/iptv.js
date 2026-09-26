import { cacheGet, cacheSet } from '@/lib/cache';

const CHANNELS_URL = 'https://iptv-org.github.io/api/channels.json';
const STREAMS_URL = 'https://iptv-org.github.io/api/streams.json';
// Depuis 2025, iptv-org ne fournit plus le champ `logo` dans channels.json :
// les logos sont publiés à part dans logos.json.
const LOGOS_URL = 'https://iptv-org.github.io/api/logos.json';
const COUNTRIES_URL = 'https://iptv-org.github.io/api/countries.json';
// Langues de diffusion par chaîne (feeds.json) : sert à repérer les chaînes VF.
const FEEDS_URL = 'https://iptv-org.github.io/api/feeds.json';
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

// Chaînes adultes : désactivées sauf si le serveur l'autorise explicitement
// (usage personnel). Voir /api/tv/adult et le README.
export const adultEnabled = () => process.env.ENABLE_ADULT_CHANNELS === '1';
const isAdultChannel = c => c.is_nsfw || (c.categories || []).includes('xxx');
// Clé de rapprochement des noms entre une playlist et iptv-org.
const adultNameKey = name => normalizeKey((name || '').replace(/\+/g, ' plus ').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\b(f?hd|uhd|4k|sd|tv)\b/gi, ' '));

// Playlists M3U complémentaires listées dans une variable d'environnement
// (URL séparées par des virgules). Leurs entrées ne servent qu'à fournir des
// flux aux chaînes de l'annuaire iptv-org : voir buildLiveTvData().
async function getM3UEntries(envVar) {
  const urls = (process.env[envVar] || '').split(',').map(u => u.trim()).filter(Boolean);
  const lists = await Promise.all(urls.map(url => fetchText(url).then(parseM3U).catch(err => {
    console.warn(`Playlist ${envVar} indisponible, ignorée (${url}):`, err.message);
    return [];
  })));
  return lists.flat().filter(e => /^https?:\/\//.test(e.url));
}

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
      const countryMatch = l.match(/tvg-country="([^"]*)"/i);
      const nameMatch = l.match(/,(.*)$/);
      current = {
        id: idMatch ? idMatch[1] : null,
        country: countryMatch ? countryMatch[1] : null,
        logo: logoMatch ? logoMatch[1] : null,
        group: groupMatch ? groupMatch[1] : null,
        name: nameMatch ? nameMatch[1].trim() : 'Sans nom',
      };
    } else if (l.startsWith('#EXTVLCOPT:') && current) {
      // En-têtes exigés par le diffuseur (rejoués par le relais serveur).
      const [key, ...rest] = l.slice(11).split('=');
      if (/^http-referr?er$/i.test(key)) current.referrer = rest.join('=');
      if (/^http-user-agent$/i.test(key)) current.userAgent = rest.join('=');
    } else if (!l.startsWith('#') && current) {
      entries.push({ ...current, url: l });
      current = null;
    }
  }
  return entries;
}

// Free-TV/IPTV ne liste que des chaînes gratuites diffusées en clair par leurs
// éditeurs. Ses noms portent des pictogrammes : Ⓖ géobloqué, Ⓨ direct
// YouTube officiel, Ⓣ direct Twitch officiel (voir le README du projet).
const CIRCLED = /[Ⓐ-ⓩ]/g;

function freeTvStream(e) {
  const marks = e.name.match(CIRCLED) || [];
  let kind = 'hls';
  if (marks.includes('Ⓨ') || /youtube\.com|youtu\.be/.test(e.url)) kind = 'youtube';
  else if (marks.includes('Ⓣ') || /twitch\.tv/.test(e.url)) kind = 'twitch';
  return {
    url: e.url, kind, quality: e.name.match(/\b(\d{3,4}p)\b/)?.[1] || null, feed: null,
    labels: marks.includes('Ⓖ') ? ['Geo-blocked'] : [], source: 'free-tv',
    ...(e.referrer ? { referrer: e.referrer } : {}),
    ...(e.userAgent ? { userAgent: e.userAgent } : {}),
  };
}

function cleanFreeTvName(name) {
  return name.replace(CIRCLED, '').replace(/\s+/g, ' ').trim();
}

// Toutes les entrées Free-TV exploitables dans un navigateur.
async function getFreeTvEntries() {
  try {
    const text = await fetchText(FREE_TV_M3U_URL);
    return parseM3U(text).filter(e =>
      /^https?:\/\//.test(e.url) && !/xxx|adult/i.test(e.group || '')
    );
  } catch (err) {
    console.warn('Source secondaire Free-TV/IPTV indisponible, ignorée:', err.message);
    return [];
  }
}

// Nettoie les suffixes d'annotation de la source (qualité, méthode de lecture,
// statut) pour regrouper les entrées d'une même chaîne sous un seul nom.
function cleanChannelName(name) {
  return name.replace(/\s*\((1080p\vert{}720p\vert{}OPT-\d+\vert{}DM\vert{}STK\vert{}YT\vert{}c_id\vert{}UPD\vert{}OFFLINE)\)\s*/gi, '').trim();
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
      byId.get(e.id).streams.push({
        url: e.url, quality: null, labels: [], source: 'iptvmu3-ci',
        ...(e.referrer ? { referrer: e.referrer } : {}),
        ...(e.userAgent ? { userAgent: e.userAgent } : {}),
      });
    }
    return [...byId.values()].filter(c => c.streams.length > 0);
  } catch (err) {
    console.warn('Source secondaire Côte d\'Ivoire indisponible, ignorée:', err.message);
    return [];
  }
}

const normalizeKey = str =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '').toLowerCase();

// Clé de regroupement des doublons : « France 24 HD », « France 24 (1080p) »
// et « FRANCE 24 » donnent la même clé. Le « + » est gardé : « ATV » et
// « ATV+ » sont deux chaînes différentes.
const dedupeName = name =>
  normalizeKey((name || '').replace(/\+/g, ' plus ').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\b(f?hd|uhd|4k|sd|hevc|backup|alt)\b/gi, ' '));

const isPureSport = cats => cats.length > 0 && cats.every(c => c === SPORT_CATEGORY);

// Classe les flux du plus au moins fiable : HTTPS d'abord (pas de contenu
// mixte une fois déployé), puis non géobloqués, puis 24/7, puis qualité.
function streamScore(s) {
  const labels = s.labels || [];
  let score = 0;
  if (s.url.startsWith('https:')) score += 100;
  if (!labels.includes('Geo-blocked')) score += 50;
  if (!labels.includes('Not 24/7')) score += 20;
  if (s.source === 'iptv-org') score += 5;
  return score + Math.min(parseInt(s.quality, 10) || 0, 2160) / 100;
}

function pickLogo(logos = []) {
  let best = null;
  for (const l of logos) {
    if (!l.url) continue;
    const score = (l.in_use ? 2 : 0) + (l.feed === null ? 1 : 0);
    if (!best || score > best.score) best = { url: l.url, score };
  }
  return best?.url || null;
}

const store = (globalThis.__streamtvLiveTv ||= { memo: null });

function startBuild() {
  const promise = buildLiveTvData();
  const previous = store.memo;
  store.memo = { at: Date.now(), promise, value: previous?.value };
  promise.then(
    (value) => { if (store.memo?.promise === promise) store.memo.value = value; },
    (err) => {
      console.warn('Reconstruction du catalogue TV échouée :', err.message);
      if (store.memo?.promise === promise) store.memo = previous?.value ? { ...previous, at: Date.now() } : null;
    }
  );
  return promise;
}

function buildAll() {
  if (!store.memo) return startBuild();
  if (Date.now() - store.memo.at > REVALIDATE_SECONDS * 1000) {
    const refresh = startBuild();
    if (store.memo.value) return Promise.resolve(store.memo.value);
    return refresh;
  }
  return store.memo.value ? Promise.resolve(store.memo.value) : store.memo.promise;
}

export function warmLiveTvData() {
  buildAll().catch(() => {});
}

export async function getLiveTvData() {
  const cacheKey = 'live-tv-data:v8';
  const cached = await cacheGet(cacheKey).catch(() => null);
  if (cached) return cached;
  const { catalog } = await buildAll();
  await cacheSet(cacheKey, catalog, REVALIDATE_SECONDS).catch(() => {});
  return catalog;
}

export async function getChannelStreams(channelId) {
  const { streamsById, adult } = await buildAll();
  if (adult?.ids.has(channelId) && !adultEnabled()) return [];
  return streamsById.get(channelId) || [];
}

export function isAdultChannelId(channelId) {
  return !!store.memo?.value?.adult?.ids.has(channelId);
}

export async function getAdultChannels() {
  const { adult } = await buildAll();
  return adult?.channels || [];
}

async function buildLiveTvData() {
  const [channels, streams, logos, countries, feeds, freeTvEntries, ciExtraChannels] = await Promise.all([
    fetchJson(CHANNELS_URL), fetchJson(STREAMS_URL), fetchJson(LOGOS_URL).catch(() => []),
    fetchJson(COUNTRIES_URL), fetchJson(FEEDS_URL).catch(() => []),
    getFreeTvEntries(),
    getCoteDIvoireExtraChannels(),
  ]);
  const [adultM3U, extraM3U] = await Promise.all([
    adultEnabled() ? getM3UEntries('ADULT_M3U_URLS') : [],
    getM3UEntries('EXTRA_M3U_URLS'),
  ]);
  const frenchIds = new Set(feeds.filter(f => (f.languages || []).includes('fra')).map(f => f.channel));
  const countryNames = Object.fromEntries(countries.map(c => [c.code, c.name]));
  const logosByChannel = {};
  for (const l of logos) (logosByChannel[l.channel] ||= []).push(l);
  const knownIds = new Set(channels.map(c => c.id));
  const byChannel = {};
  const orphans = new Map();
  const adultOrphans = {};
  for (const s of streams) {
    if (!s.url) continue;
    const stream = {
      url: s.url, quality: s.quality || null, feed: s.feed || null,
      labels: s.labels || [], source: 'iptv-org',
    };
    if (s.referrer) stream.referrer = s.referrer;
    if (s.user_agent) stream.userAgent = s.user_agent;
    if (s.channel && knownIds.has(s.channel)) {
      (byChannel[s.channel] ||= []).push(stream);
      continue;
    }
    const name = (s.title || '').replace(/\s*\([^)]*\)|\s*\[[^\]]*\]/g, '').trim();
    const key = dedupeName(name);
    if (!key) continue;
    if (/xxx|adult|porn/i.test(name)) {
      (adultOrphans[key] ||= { id: `iptv-${key}`, name, streams: [] }).streams.push(stream);
      continue;
    }
    if (!orphans.has(key)) {
      orphans.set(key, {
        id: s.channel || `iptv-${key}`, name, country: null,
        categories: [], pureSport: false, logo: null, streams: [],
      });
    }
    orphans.get(key).streams.push(stream);
  }
  const freeTvExtra = new Map();
  const countryCodes = new Set(countries.map(c => c.code));
  const countryByName = new Map(countries.map(c => [c.name.toLowerCase(), c.code]));
  for (const e of freeTvEntries) {
    const id = e.id?.split('@')[0] || null;
    const stream = freeTvStream(e);
    if (id && knownIds.has(id)) {
      const list = (byChannel[id] ||= []);
      if (!list.some(s => s.url === stream.url)) list.push(stream);
      continue;
    }
    const name = cleanFreeTvName(e.name);
    const country = (e.country || '').split(/[;,]/)[0].toUpperCase()
      || countryByName.get((e.group || '').toLowerCase()) || '';
    const key = id || `freetv-${country}-${normalizeKey(name)}`;
    if (!freeTvExtra.has(key)) {
      freeTvExtra.set(key, {
        id: key, name, country: countryCodes.has(country) ? country : null,
        categories: [], pureSport: false, logo: e.logo || null, streams: [],
        ...(country === 'FR' ? { fr: true } : {}),
      });
    }
    const extra = freeTvExtra.get(key);
    if (!extra.streams.some(s => s.url === stream.url)) extra.streams.push(stream);
  }
  
  // EXTRA_M3U_URLS : Rattaché aux chaînes existantes ou créé dynamiquement si inconnu
  if (extraM3U.length) {
    const eligible = channels.filter(c => !c.closed && !isAdultChannel(c));
    const byLowerId = new Map(eligible.map(c => [c.id.toLowerCase(), c]));
    const byName = new Map();
    for (const c of eligible) {
      for (const n of new Set([c.name, ...(c.alt_names || [])].map(dedupeName))) {
        if (n) (byName.get(n) || byName.set(n, []).get(n)).push(c);
      }
    }
    const countryOf = e => (e.country || '').split(/[;,]/)[0].trim().toUpperCase();
    let matched = 0;
    for (const e of extraM3U) {
      if (/xxx|adult|porn/i.test(`${e.group || ''} ${e.name}`)) continue;
      let ref = byLowerId.get((e.id || '').split('@')[0].toLowerCase());
      if (!ref) {
        const candidates = byName.get(dedupeName(cleanChannelName(e.name))) || [];
        const country = countryOf(e);
        const inCountry = country ? candidates.filter(c => c.country === country) : [];
        ref = inCountry.length === 1 ? inCountry[0] : candidates.length === 1 ? candidates[0] : null;
      }
      
      const stream = { url: e.url, quality: e.name.match(/\b(\d{3,4}p)\b/)?.[1] || null, feed: null, labels: [], source: 'extra-m3u' };
      if (e.referrer) stream.referrer = e.referrer;
      if (e.userAgent) stream.userAgent = e.userAgent;

      if (ref) {
        const listForChannel = (byChannel[ref.id] ||= []);
        if (!listForChannel.some(x => x.url === stream.url)) {
          listForChannel.push(stream);
          matched++;
        }
      } else {
        // Création d'une chaîne personnalisée si absente d'iptv-org
        const customId = `extracustom-${dedupeName(cleanChannelName(e.name))}`;
        const listForChannel = (byChannel[customId] ||= []);
        if (!listForChannel.some(x => x.url === stream.url)) {
          listForChannel.push(stream);
          matched++;
        }
        if (!orphans.has(customId)) {
          orphans.set(customId, {
            id: customId,
            name: cleanChannelName(e.name),
            country: countryOf(e) || null,
            categories: [e.group?.toLowerCase() || 'general'],
            pureSport: false,
            logo: e.logo || null,
            streams: listForChannel,
          });
        }
      }
    }
    console.log(`EXTRA_M3U_URLS : ${matched} flux intégrés sur ${extraM3U.length} entrées.`);
  }

  const list = channels.filter(c => {
    if (c.closed || c.is_nsfw) return false;
    const cats = c.categories || [];
    if (cats.includes('xxx') || !byChannel[c.id]) return false;
    return true;
  }).map(c => {
    const channel = {
      id:c.id, name:c.name, country:c.country || null, categories:c.categories || [],
      pureSport:isPureSport(c.categories || []), logo:pickLogo(logosByChannel[c.id]),
      streams:byChannel[c.id],
    };
    if (c.alt_names?.length) channel.alt = c.alt_names;
    if (frenchIds.has(c.id)) channel.fr = true;
    return channel;
  });
  
  const existingIds = new Set(list.map(c => c.id));
  for (const c of [...orphans.values(), ...freeTvExtra.values(), ...ciExtraChannels]) {
    if (existingIds.has(c.id)) continue;
    existingIds.add(c.id);
    list.push(c);
  }
  
  const merged = [];
  const byKey = new Map();
  const aliases = new Map();
  for (const c of list) {
    const base = dedupeName(c.name);
    const key = base ? `${base}|${c.country || ''}` : `id:${c.id}`;
    const keep = byKey.get(key);
    if (!keep) {
      byKey.set(key, c);
      merged.push(c);
      continue;
    }
    const urls = new Set(keep.streams.map(s => s.url));
    keep.streams = [...keep.streams, ...c.streams.filter(s => !urls.has(s.url))];
    keep.logo ||= c.logo;
    if (c.fr) keep.fr = true;
    if (!keep.categories.length) keep.categories = c.categories;
    aliases.set(c.id, keep.id);
  }
  
  merged.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const streamsById = new Map();
  const catalogChannels = merged.map(({ streams: channelStreams, ...rest }) => {
    streamsById.set(rest.id, [...channelStreams].sort((a, b) => streamScore(b) - streamScore(a)));
    return rest;
  });
  for (const [from, to] of aliases) streamsById.set(from, streamsById.get(to));
  
  const shownIds = new Set([...streamsById.keys()]);
  const offline = channels.filter(c =>
    !shownIds.has(c.id) && !c.is_nsfw && !(c.categories || []).includes('xxx')
  ).map(c => ({
    id: c.id, name: c.name, country: c.country || null, categories: c.categories || [],
    pureSport: isPureSport(c.categories || []), logo: pickLogo(logosByChannel[c.id]),
    off: c.closed ? 'closed' : 'nostream',
    ...(c.alt_names?.length ? { alt: c.alt_names } : {}),
  })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
  const offlineCountries = [...new Set(offline.map(c => c.country))].filter(Boolean)
    .map(code => ({ code, name: countryNames[code] || code }));
  
  list.length = 0;
  list.push(...merged);
  const usedCountries = [...new Set(list.map(c=>c.country))].filter(Boolean)
    .map(code=>({code,name:countryNames[code]||code})).sort((a,b)=>a.name.localeCompare(b.name));
  
  const catalog = {
    channels:catalogChannels, countries:usedCountries,
    categories:[...new Set(list.flatMap(c=>c.categories))].sort(),
    sportCount:list.filter(c=>c.pureSport).length
  };

  const adultList = [
    ...channels.filter(c => isAdultChannel(c) && !c.closed && byChannel[c.id])
      .map(c => ({
        id: c.id, name: c.name, country: c.country || null, categories: ['xxx'],
        pureSport: false, logo: pickLogo(logosByChannel[c.id]), streams: byChannel[c.id],
      })),
    ...Object.values(adultOrphans).map(o => ({ ...o, country: null, categories: ['xxx'], pureSport: false, logo: null })),
  ];

  const nsfwById = new Map();
  const nsfwByName = new Map();
  for (const c of channels) {
    if (!isAdultChannel(c) || c.closed) continue;
    nsfwById.set(c.id.toLowerCase(), c);
    for (const n of [c.name, ...(c.alt_names || [])]) {
      const key = adultNameKey(n);
      if (key && !nsfwByName.has(key)) nsfwByName.set(key, c);
    }
  }

  const adultById = new Map(adultList.map(c => [c.id, c]));

  // Traitement optimisé et permissif pour ADULT_M3U_URLS
  for (const e of adultM3U) {
    if (!e.url || !/^https?:\/\//.test(e.url)) continue;

    const rawName = e.name || 'Sans nom';
    const cleanName = cleanChannelName(rawName);
    if (!cleanName) continue;

    const qualityMatch = rawName.match(/\b(4k|uhd|1080p|720p|540p|480p)\b/i);
    const quality = qualityMatch ? qualityMatch[1].toLowerCase() : null;

    let ref = nsfwById.get((e.id || '').split('@')[0].toLowerCase())
      || nsfwByName.get(adultNameKey(cleanName));

    let c;
    if (ref) {
      c = adultById.get(ref.id);
      if (!c) {
        c = {
          id: ref.id,
          name: ref.name,
          country: ref.country || null,
          categories: ['xxx'],
          pureSport: false,
          logo: pickLogo(logosByChannel[ref.id]) || e.logo || null,
          streams: [],
        };
        adultById.set(ref.id, c);
        adultList.push(c);
      }
    } else {
      // Création automatique si absente d'iptv-org (ex: iptvmate ou adultiptv)
      const customId = `adult-custom-${dedupeName(cleanName)}`;
      c = adultById.get(customId);
      if (!c) {
        c = {
          id: customId,
          name: cleanName,
          country: (e.country || '').split(/[;,]/)[0].trim().toUpperCase() || null,
          categories: ['xxx'],
          pureSport: false,
          logo: e.logo || null,
          streams: [],
        };
        adultById.set(customId, c);
        adultList.push(c);
      } else if (!c.logo && e.logo) {
        c.logo = e.logo;
      }
    }

    const stream = { url: e.url, quality, labels: [], source: 'adult-m3u' };
    if (e.referrer) stream.referrer = e.referrer;
    if (e.userAgent) stream.userAgent = e.userAgent;
    if (!c.streams.some(x => x.url === stream.url)) {
      c.streams.push(stream);
    }
  }

  const adultIds = new Set();
  const adultChannels = adultList.map(({ streams: channelStreams, ...rest }) => {
    streamsById.set(rest.id, [...channelStreams].sort((a, b) => streamScore(b) - streamScore(a)));
    adultIds.add(rest.id);
    return { ...rest, adult: true };
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return {
    catalog, streamsById,
    offline: { channels: offline, countries: offlineCountries },
    adult: { channels: adultChannels, ids: adultIds },
  };
}

export async function getOfflineChannels() {
  const { offline } = await buildAll();
  return offline || (await startBuild()).offline;
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