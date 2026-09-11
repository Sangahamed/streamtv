// lib/anime-sama.js — Wrapper POC scraping
const ANIME_SAMA_BASE = 'https://anime-sama.fr';

export async function searchAnime(query) {
  const res = await fetch(`${ANIME_SAMA_BASE}/catalogue/?search=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();

  // Extraction basique — adapter selon le DOM réel
  const results = [];
  const regex = /<a[^>]*href="(\/catalogue\/[^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([^<]*)<\/h3>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push({ title: match[2].trim(), url: `${ANIME_SAMA_BASE}${match[1]}` });
  }
  return results;
}

export async function getAnimeEpisodes(animeUrl) {
  const res = await fetch(animeUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();

  // Extraction des liens Vidmoly / Sendvid
  const episodes = [];
  const vidmolyRegex = /vidmoly\.to\/embed\/([a-zA-Z0-9]+)/g;
  const sendvidRegex = /sendvid\.com\/embed\/([a-zA-Z0-9]+)/g;

  let match;
  while ((match = vidmolyRegex.exec(html)) !== null) {
    episodes.push({ provider: 'vidmoly', embed: `https://vidmoly.to/embed/${match[1]}` });
  }
  while ((match = sendvidRegex.exec(html)) !== null) {
    episodes.push({ provider: 'sendvid', embed: `https://sendvid.com/embed/${match[1]}` });
  }

  return episodes;
}
