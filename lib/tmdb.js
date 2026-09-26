// lib/tmdb.js — Client TMDB
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

// Listes autorisées pour /movie/{list} : évite qu'un paramètre arbitraire
// (ex. ?q=../..) soit injecté tel quel dans le chemin de l'API.
export const MOVIE_LISTS = ['popular', 'now_playing', 'top_rated', 'upcoming'];

async function tmdb(path, params = {}, revalidate = 3600) {
  if (!TMDB_KEY) throw new Error('TMDB_API_KEY manquante');
  const qs = new URLSearchParams({ api_key: TMDB_KEY, language: 'fr-FR', ...params });
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`, { next: { revalidate } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
  return res.json();
}

export async function getMovies(list = 'popular', page = 1) {
  const safeList = MOVIE_LISTS.includes(list) ? list : 'popular';
  return (await tmdb(`/movie/${safeList}`, { page: String(page), region: 'FR' })) || { results: [] };
}

export async function getMovieDetails(movieId) {
  if (!/^\d+$/.test(String(movieId))) return null;
  return tmdb(
    `/movie/${movieId}`,
    { append_to_response: 'watch/providers,videos,credits', include_video_language: 'fr,en' },
    86400
  );
}

// Titres proposés gratuitement (avec ou sans publicité) par un service légal
// en France : TF1+, M6+, france.tv, Arte, Pluto TV, Rakuten TV, Crunchyroll…
// Ces services diffusent en VF (et en VOSTFR pour l'anime).
export async function discoverFreeInFrance(type = 'movie', page = 1, extra = {}) {
  const kind = type === 'tv' ? 'tv' : 'movie';
  return (await tmdb(`/discover/${kind}`, {
    watch_region: 'FR',
    with_watch_monetization_types: 'free|ads',
    sort_by: 'popularity.desc',
    include_adult: 'false',
    page: String(page),
    ...extra,
  })) || { results: [] };
}

// Anime (animation japonaise) gratuits en France.
export const discoverFreeAnime = page =>
  discoverFreeInFrance('tv', page, { with_genres: '16', with_original_language: 'ja' });

export async function getTvDetails(tvId) {
  if (!/^\d+$/.test(String(tvId))) return null;
  return tmdb(
    `/tv/${tvId}`,
    { append_to_response: 'watch/providers,videos', include_video_language: 'fr,en,ja' },
    86400
  );
}

export async function searchMovies(query, page = 1) {
  return (await tmdb('/search/movie', { query, page: String(page) })) || { results: [] };
}
