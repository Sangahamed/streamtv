// lib/iptv.js
// Récupère les chaînes, flux, pays, catégories et blocklist de l'annuaire
// communautaire ouvert iptv-org (https://github.com/iptv-org/iptv), qui ne
// référence que des flux diffusés librement en clair par leurs éditeurs.
// La blocklist officielle (signalements des ayants droit) est appliquée
// pour exclure automatiquement tout flux contesté.

const CHANNELS_URL = 'https://iptv-org.github.io/api/channels.json';
const STREAMS_URL = 'https://iptv-org.github.io/api/streams.json';
const COUNTRIES_URL = 'https://iptv-org.github.io/api/countries.json';
const BLOCKLIST_URL = 'https://iptv-org.github.io/api/blocklist.json';

const REVALIDATE_SECONDS = 3600; // 1h : les sources changent peu souvent

async function fetchJson(url) {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) {
    throw new Error(`Échec du chargement de ${url} (${res.status})`);
  }
  return res.json();
}

export const SPORT_CATEGORY = 'sports';

function isPureSport(categories) {
  return categories.length > 0 && categories.every((c) => c === SPORT_CATEGORY);
}

export async function getLiveTvData() {
  const [channels, streams, countries, blocklist] = await Promise.all([
    fetchJson(CHANNELS_URL),
    fetchJson(STREAMS_URL),
    fetchJson(COUNTRIES_URL),
    fetchJson(BLOCKLIST_URL),
  ]);

  const blocked = new Set(blocklist.map((b) => b.channel));
  const countryNames = Object.fromEntries(countries.map((c) => [c.code, c.name]));

  const streamsByChannel = {};
  for (const s of streams) {
    if (!s.channel || !s.url) continue;
    if (!streamsByChannel[s.channel]) streamsByChannel[s.channel] = [];
    streamsByChannel[s.channel].push({
      url: s.url,
      quality: s.quality || null,
    });
  }

  const channelsList = channels
    .filter((c) => {
      if (c.closed || c.is_nsfw) return false;
      if (blocked.has(c.id)) return false;
      const cats = c.categories || [];
      if (cats.includes('xxx')) return false;
      return !!streamsByChannel[c.id];
    })
    .map((c) => {
      const categories = c.categories || [];
      return {
        id: c.id,
        name: c.name,
        country: c.country || null,
        categories,
        pureSport: isPureSport(categories),
        logo: c.logo || null,
        streams: streamsByChannel[c.id],
      };
    });

  const usedCountries = [...new Set(channelsList.map((c) => c.country))]
    .filter(Boolean)
    .map((code) => ({ code, name: countryNames[code] || code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const usedCategories = [...new Set(channelsList.flatMap((c) => c.categories))].sort();

  return {
    channels: channelsList,
    countries: usedCountries,
    categories: usedCategories,
    sportCount: channelsList.filter((c) => c.pureSport).length,
  };
}
