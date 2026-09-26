// lib/anilist.js — Catalogue anime via l'API publique GraphQL d'AniList.
// Fournit fiches, bandes-annonces et liens vers les plateformes officielles
// (Crunchyroll, ADN, Netflix…). Les contenus adultes sont exclus.
const ENDPOINT = 'https://graphql.anilist.co';
export const PER_PAGE = 24;

export const SORTS = {
  trending: { label: 'Tendances', sort: 'TRENDING_DESC' },
  season: { label: 'Saison en cours', sort: 'POPULARITY_DESC', season: true },
  popular: { label: 'Populaires', sort: 'POPULARITY_DESC' },
  top: { label: 'Mieux notés', sort: 'SCORE_DESC' },
};

async function query(q, variables, revalidate = 3600) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: q, variables }),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

function currentSeason() {
  const now = new Date();
  const m = now.getMonth();
  const season = m < 3 ? 'WINTER' : m < 6 ? 'SPRING' : m < 9 ? 'SUMMER' : 'FALL';
  return { season, seasonYear: now.getFullYear() };
}

const CARD_FIELDS = `id title { romaji english } coverImage { large color } averageScore format episodes seasonYear`;

export async function listAnime({ sort = 'trending', search = '', page = 1 } = {}) {
  const conf = SORTS[sort] || SORTS.trending;
  const variables = {
    page, perPage: PER_PAGE,
    sort: search ? ['SEARCH_MATCH'] : [conf.sort],
    search: search || undefined,
    ...(conf.season && !search ? currentSeason() : {}),
  };
  const data = await query(
    `query ($page:Int,$perPage:Int,$sort:[MediaSort],$search:String,$season:MediaSeason,$seasonYear:Int) {
      Page(page:$page, perPage:$perPage) {
        pageInfo { lastPage }
        media(type:ANIME, isAdult:false, sort:$sort, search:$search, season:$season, seasonYear:$seasonYear) { ${CARD_FIELDS} }
      }
    }`,
    variables
  );
  return { items: data.Page.media, lastPage: Math.min(data.Page.pageInfo.lastPage || 1, 200) };
}

export async function getAnime(id) {
  if (!/^\d+$/.test(String(id))) return null;
  try {
    const data = await query(
      `query ($id:Int) {
        Media(id:$id, type:ANIME, isAdult:false) {
          ${CARD_FIELDS} bannerImage description(asHtml:false) genres status duration studios(isMain:true){ nodes { name } }
          trailer { id site }
          externalLinks { site type url language icon color }
          streamingEpisodes { title thumbnail url site }
          recommendations(perPage:6, sort:RATING_DESC) { nodes { mediaRecommendation { ${CARD_FIELDS} isAdult } } }
        }
      }`,
      { id: Number(id) }
    );
    return data.Media;
  } catch (err) {
    if (/not found/i.test(err.message)) return null;
    throw err;
  }
}

export const animeTitle = a => a?.title?.english || a?.title?.romaji || 'Sans titre';

// Les descriptions AniList contiennent quelques balises (<br>, <i>…).
export const plainText = str => (str || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
