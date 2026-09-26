// lib/football.js — Calendrier et scores via l'API Football-Data (clé gratuite).
const BASE = 'https://api.football-data.org/v4';

const iso = d => d.toISOString().slice(0, 10);

const DAY = 86400000;

async function fetchRange(key, fromDays, toDays) {
  const from = iso(new Date(Date.now() + fromDays * DAY));
  const to = iso(new Date(Date.now() + toDays * DAY));
  const res = await fetch(`${BASE}/matches?dateFrom=${from}&dateTo=${to}`, {
    headers: { 'X-Auth-Token': key },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Football-Data HTTP ${res.status}`);
  return (await res.json()).matches || [];
}

// Matchs d'hier à J+8 (le plan gratuit limite chaque requête à 10 jours).
// Pendant les trêves, on va chercher les 10 jours suivants pour ne pas
// afficher une page vide.
export async function getMatches() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error('FOOTBALL_DATA_API_KEY manquante');
  let matches = await fetchRange(key, -1, 8);
  if (!matches.some(m => m.status !== 'FINISHED')) {
    matches = [...matches, ...(await fetchRange(key, 9, 18))];
  }
  return matches.map(m => ({
    id: m.id,
    date: m.utcDate,
    status: m.status,
    minute: m.minute || null,
    competition: m.competition?.name || 'Compétition',
    emblem: m.competition?.emblem || null,
    home: m.homeTeam?.shortName || m.homeTeam?.name || 'À définir',
    away: m.awayTeam?.shortName || m.awayTeam?.name || 'À définir',
    homeCrest: m.homeTeam?.crest || null,
    awayCrest: m.awayTeam?.crest || null,
    scoreHome: m.score?.fullTime?.home ?? null,
    scoreAway: m.score?.fullTime?.away ?? null,
  }));
}

export const isLive = s => s === 'IN_PLAY' || s === 'PAUSED' || s === 'LIVE';
