import * as cheerio from 'cheerio';
import { cacheGet, cacheSet } from '@/lib/cache';
import { SPORT_SLUG_MAP } from '@/lib/dzritv-sports';

const DZRI_BASE = 'https://dzritv.com';
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_API_KEY;


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'football';
  const cacheKey = `dzritv:matches:${sport}`;
  const skipCache = searchParams.get('refresh') === '1';

  if (!skipCache) {
    const cached = await cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true, age: 'from cache' });
  }

  try {
    const data = await scrapeDzriTV(sport);
    if (!data.competitions || data.competitions.length === 0) {
      throw new Error('Scraping réussi mais 0 compétition trouvée (sélecteurs probablement obsolètes)');
    }
    await cacheSet(cacheKey, data, 300);
    await cacheSet(`${cacheKey}:stale`, data, 86400);
    return Response.json({ ...data, source: 'dzritv', cached: false });
  } catch (dzriError) {
    console.error('DZriTV failed:', dzriError.message);
    if (sport !== 'football') {
      const stale = await cacheGet(`${cacheKey}:stale`);
      if (stale) return Response.json({ ...stale, source: 'stale-cache', stale: true, warning: 'Données périmées' });
      return Response.json({ error: 'Source indisponible pour ce sport (pas de fallback hors football)', competitions: [], sport }, { status: 503 });
    }
    try {
      const fallbackData = await fetchFootballData();
      const transformed = transformFootballDataToDzriFormat(fallbackData);
      await cacheSet(cacheKey, transformed, 600);
      await cacheSet(`${cacheKey}:stale`, transformed, 86400);
      return Response.json({ ...transformed, source: 'football-data-fallback', fallback: true, reason: dzriError.message, cached: false });
    } catch (fbError) {
      console.error('Fallback failed:', fbError.message);
      const stale = await cacheGet(`${cacheKey}:stale`);
      if (stale) return Response.json({ ...stale, source: 'stale-cache', stale: true, warning: 'Données périmées' });
      return Response.json({ error: 'Toutes les sources sont indisponibles', competitions: [] }, { status: 503 });
    }
  }
}

async function scrapeDzriTV(sport) {
  const slug = SPORT_SLUG_MAP[sport] || sport;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(`${DZRI_BASE}/sport/${slug}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Accept-Language': 'fr-FR' },
    signal: controller.signal
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const competitions = [];

  // Structure réelle (confirmée par inspection du HTML brut le 11/09/2026) :
  // chaque bloc de sport est un <div class="sport_matches_desk"> contenant,
  // en enfants directs : le titre du sport, un en-tête de colonnes
  // (.football_desk.desc_title_wrapper), puis une alternance de
  // <div class="league">Nom de la compétition</div> (répété seulement quand
  // la compétition change) et <div class="football_desk desc_item"><a
  // href="/match/...-<id>">...</a></div> pour chaque match.
  $('.sport_matches_desk').each((_, section) => {
    const $section = $(section);
    let currentCompetition = 'Compétition';
    const compMap = new Map();

    $section.children().each((__, child) => {
      const $child = $(child);

      if ($child.hasClass('league')) {
        const name = $child.text().trim();
        if (name) currentCompetition = name;
        return;
      }

      if ($child.hasClass('football_desk') && $child.hasClass('desc_item')) {
        const link = $child.find('a').first();
        const href = link.attr('href') || '';
        const dateRaw = link.find('.txt_date_time').text().replace(/\s+/g, ' ').trim();
        const matchText = link.find('.matches').text().trim();
        if (!dateRaw || !matchText || !href) return;

        const teams = matchText.split(/\s+-\s+/).map(t => t.trim()).filter(Boolean);
        const dateTime = parseDateTime(dateRaw);
        // Le HTML ne distingue pas visuellement "en direct" de "à venir" dans
        // le code source (l'indicateur "live" semble être animé côté client
        // en JS/CSS selon l'heure). On déduit isLive du fait que l'heure de
        // début est déjà passée — approximation raisonnable, pas une donnée
        // exacte du site.
        const isLive = dateTime ? new Date(dateTime).getTime() <= Date.now() : false;
        const id = href.match(/-(\d+)$/)?.[1] || Math.random().toString(36).slice(2);
        const matchUrl = href.startsWith('http') ? href : `${DZRI_BASE}${href}`;

        if (!compMap.has(currentCompetition)) compMap.set(currentCompetition, []);
        compMap.get(currentCompetition).push({
          id,
          homeTeam: teams[0] || matchText,
          awayTeam: teams[1] || 'TBD',
          dateTime,
          dateRaw,
          matchUrl,
          isLive,
          competition: currentCompetition,
        });
      }
    });

    for (const [name, matches] of compMap) {
      if (matches.length > 0) competitions.push({ name, matches });
    }
  });

  return { competitions, sport, count: competitions.reduce((a, c) => a + c.matches.length, 0) };
}

function parseDateTime(raw) {
  try {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return new Date(cleaned).toISOString();
    return null;
  } catch { return null; }
}

async function fetchFootballData() {
  const today = new Date().toISOString().split('T')[0];
  const res = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY },
    next: { revalidate: 0 }
  });
  if (!res.ok) throw new Error(`Football-Data HTTP ${res.status}`);
  return res.json();
}

function transformFootballDataToDzriFormat(data) {
  const matches = (data.matches || []).map(m => ({
    id: `fd-${m.id}`,
    homeTeam: m.homeTeam?.name || 'TBD',
    awayTeam: m.awayTeam?.name || 'TBD',
    dateTime: m.utcDate,
    dateRaw: new Date(m.utcDate).toLocaleString('fr-FR'),
    matchUrl: null,
    isLive: m.status === 'IN_PLAY' || m.status === 'LIVE',
    competition: m.competition?.name || 'Compétition inconnue'
  }));
  const byComp = {};
  matches.forEach(m => { if (!byComp[m.competition]) byComp[m.competition] = []; byComp[m.competition].push(m); });
  const competitions = Object.entries(byComp).map(([name, matches]) => ({ name, matches }));
  return { competitions, sport: 'football', count: matches.length };
}
