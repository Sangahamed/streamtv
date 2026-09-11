// lib/tmdb.js — Client TMDB
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function getMovies(query = 'popular', page = 1) {
  const res = await fetch(
    `${TMDB_BASE}/movie/${query}?api_key=${TMDB_KEY}&language=fr-FR&page=${page}`,
    { next: { revalidate: 3600 } }
  );
  return res.json();
}

export async function getMovieDetails(movieId) {
  const res = await fetch(
    `${TMDB_BASE}/movie/${movieId}?api_key=${TMDB_KEY}&language=fr-FR&append_to_response=watch/providers`,
    { next: { revalidate: 86400 } }
  );
  return res.json();
}

export async function searchMovies(query) {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&language=fr-FR&query=${encodeURIComponent(query)}&page=1`,
    { next: { revalidate: 3600 } }
  );
  return res.json();
}
