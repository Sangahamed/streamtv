// lib/archive.js — Films libres de droits (domaine public / Creative Commons)
// de la collection « Feature Films » d'Internet Archive, lisibles légalement
// et directement dans l'app.
//
// Attention : la licence d'un item est déclarée par la personne qui le dépose,
// sans vérification. On y trouve des films récents toujours protégés (Godard
// 1967, films des années 80…) et des films érotiques. D'où des garde-fous :
// licence déclarée + sortie avant 1964 (l'essentiel du vrai domaine public :
// films anciens non renouvelés) + exclusion des contenus adultes.
const SEARCH_URL = 'https://archive.org/advancedsearch.php';
const MAX_YEAR = 1963;
const ADULT_TERMS = '(erotic OR erotica OR sex OR sexy OR adult OR porn OR sexploitation OR nudity OR nudist OR nude OR XXX OR striptease OR burlesque)';
const ADULT_RE = /erotic|sex|porn|nud(e|ist|ity)|xxx|striptease|burlesque/i;
const BASE_QUERY =
  'collection:(feature_films) AND mediatype:(movies) AND licenseurl:(*publicdomain* OR *creativecommons*)' +
  ` AND year:[1890 TO ${MAX_YEAR}] AND -subject:${ADULT_TERMS} AND -title:${ADULT_TERMS}`;
export const PAGE_SIZE = 24;

const escapeQuery = str => str.replace(/[\\+\-!(){}[\]^"~*?:/]/g, ' ').trim();

export async function searchFreeFilms({ q = '', page = 1 } = {}) {
  const params = new URLSearchParams({
    q: q ? `${BASE_QUERY} AND title:(${escapeQuery(q)})` : BASE_QUERY,
    rows: String(PAGE_SIZE),
    page: String(page),
    output: 'json',
  });
  for (const f of ['identifier', 'title', 'year', 'description']) params.append('fl[]', f);
  params.append('sort[]', 'downloads desc');
  const res = await fetch(`${SEARCH_URL}?${params}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Internet Archive HTTP ${res.status}`);
  const data = await res.json();
  return {
    total: data.response?.numFound || 0,
    films: (data.response?.docs || []).map(d => ({
      id: d.identifier,
      title: Array.isArray(d.title) ? d.title[0] : d.title,
      year: d.year || null,
    })).filter(f => !ADULT_RE.test(f.title || '')),
  };
}

export const thumbnailUrl = id => `https://archive.org/services/img/${encodeURIComponent(id)}`;

// Choisit le meilleur fichier MP4 lisible par un navigateur.
function pickVideo(files = []) {
  const mp4 = files.filter(f => /\.mp4$/i.test(f.name) && /h\.264|mpeg4/i.test(f.format || ''));
  const score = f => (/^h\.264$/i.test(f.format) ? 2e10 : 0) + Math.min(Number(f.size) || 0, 2e9);
  return mp4.sort((a, b) => score(b) - score(a))[0] || null;
}

const stripHtml = str => (str || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export async function getFreeFilm(id) {
  if (!/^[\w.-]+$/.test(id)) return null;
  const res = await fetch(`https://archive.org/metadata/${id}`, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = await res.json();
  const meta = data.metadata;
  if (!meta || !/publicdomain|creativecommons/i.test(meta.licenseurl || '')) return null;
  const first = v => (Array.isArray(v) ? v[0] : v);
  // Mêmes garde-fous que la recherche, pour un accès direct par URL.
  const year = Number(first(meta.year) || first(meta.date)?.slice(0, 4));
  if (!year || year > MAX_YEAR) return null;
  if (ADULT_RE.test([first(meta.title), [].concat(meta.subject || []).join(' ')].join(' '))) return null;
  const video = pickVideo(data.files);
  if (!video) return null;
  return {
    id,
    title: first(meta.title),
    year,
    description: stripHtml(first(meta.description)),
    license: meta.licenseurl,
    videoUrl: `https://archive.org/download/${id}/${encodeURIComponent(video.name)}`,
    poster: thumbnailUrl(id),
    sourceUrl: `https://archive.org/details/${id}`,
  };
}

// Cherche la version libre de droits d'un film TMDB (même titre, même année).
export async function findFreeFilm(title, year) {
  if (!title || !year) return null;
  try {
    const params = new URLSearchParams({
      q: `${BASE_QUERY} AND title:("${escapeQuery(title)}") AND year:(${Number(year)})`,
      rows: '1',
      output: 'json',
    });
    params.append('fl[]', 'identifier');
    params.append('sort[]', 'downloads desc');
    const res = await fetch(`${SEARCH_URL}?${params}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()).response?.docs?.[0]?.identifier || null;
  } catch {
    return null;
  }
}
