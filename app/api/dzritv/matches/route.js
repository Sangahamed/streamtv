import * as cheerio from 'cheerio';
import { cacheGet, cacheSet } from '@/lib/cache';

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(`${DZRI_BASE}/sport/${sport}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Accept-Language': 'fr-FR' },
    signal: controller.signal
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const competitions = [];

  $('h3, h4, .competition-title').each((_, compEl) => {
    const compName = $(compEl).text().trim();
    if (!compName || compName.length < 3) return;
    const table = $(compEl).next('table').length ? $(compEl).next('table') : $(compEl).parent().find('table').first();
    const matches = [];
    table.find('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;
      const dateText = $(cells[0]).text().trim();
      const matchText = $(cells[1]).text().trim();
      const linkEl = $(cells[2]).find('a');
      const matchPath = linkEl.attr('href') || '';
      const isLive = $(cells[2]).text().toLowerCase().includes('live');
      const teams = matchText.split(/[-–—vs]+/).map(t => t.trim()).filter(Boolean);
      if (matchText && matchPath) {
        matches.push({
          id: matchPath.split('-').pop() || Math.random().toString(36).slice(2),
          homeTeam: teams[0] || matchText,
          awayTeam: teams[1] || 'TBD',
          dateTime: parseDateTime(dateText),
          dateRaw: dateText,
          matchUrl: matchPath.startsWith('http') ? matchPath : `${DZRI_BASE}${matchPath}`,
          isLive,
          competition: compName
        });
      }
    });
    if (matches.length > 0) competitions.push({ name: compName, matches });
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
