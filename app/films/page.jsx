import { getMovies, searchMovies, discoverFreeInFrance } from '@/lib/tmdb';
import { searchFreeFilms, thumbnailUrl, PAGE_SIZE as FREE_PAGE_SIZE } from '@/lib/archive';
import { getLiveTvData } from '@/lib/iptv';
import MovieCard from '@/components/MovieCard';
import ChannelGrid from '@/components/ChannelGrid';
import Link from 'next/link';

export const metadata = { title: 'Films — StreamTV' };

const PUBLIC_DOMAIN = 'libres';
const FREE_FR = 'gratuits';
const LIVE = 'chaines';
const LISTS = [
  { id: FREE_FR, label: '▶ Gratuits en VF', title: 'GRATUITS EN VF' },
  { id: LIVE, label: '📺 Chaînes cinéma VF', title: 'CHAÎNES CINÉMA VF' },
  { id: PUBLIC_DOMAIN, label: 'Domaine public', title: 'DU DOMAINE PUBLIC' },
  { id: 'popular', label: 'Populaires', title: 'POPULAIRES' },
  { id: 'now_playing', label: 'Au cinéma', title: 'AU CINÉMA' },
  { id: 'top_rated', label: 'Mieux notés', title: 'MIEUX NOTÉS' },
  { id: 'upcoming', label: 'Prochainement', title: 'PROCHAINEMENT' },
];
const INTROS = {
  [FREE_FR]: 'Films proposés gratuitement et légalement en France (TF1+, M6+, france.tv, Arte, Pluto TV, Rakuten TV…), en VF. Ouvrez une fiche pour lancer le film sur la plateforme.',
  [LIVE]: 'Chaînes cinéma et séries diffusées en français, gratuites et en clair : lecture directe dans StreamTV.',
  [PUBLIC_DOMAIN]: 'Classiques tombés dans le domaine public, hébergés par Internet Archive : lecture intégrale dans StreamTV (surtout en version originale).',
};
const MOVIE_CATEGORIES = ['movies', 'series', 'classic'];

export default async function FilmsPage({ searchParams }) {
  const params = await searchParams;
  const q = (params?.q || '').trim();
  const list = LISTS.some(l => l.id === params?.list) ? params.list : FREE_FR;
  const publicDomain = list === PUBLIC_DOMAIN;
  const page = Math.min(Math.max(parseInt(params?.page || '1', 10) || 1, 1), 500); // TMDB limite à 500 pages
  // Une recherche porte sur tout TMDB, sauf dans l'onglet domaine public.
  const searching = q && !publicDomain;
  const current = searching ? null : LISTS.find(l => l.id === list);

  let data = { results: [], total_pages: 1 };
  let freeFilms = [];
  let liveChannels = null;
  let countries = [];
  let error = null;
  try {
    if (list === LIVE && !searching) {
      const tv = await getLiveTvData();
      liveChannels = tv.channels.filter(c => c.fr && c.categories.some(k => MOVIE_CATEGORIES.includes(k)));
      countries = tv.countries;
    } else if (publicDomain) {
      const res = await searchFreeFilms({ q, page });
      freeFilms = res.films;
      data = { results: [], total_pages: Math.ceil(res.total / FREE_PAGE_SIZE) };
    } else if (searching) {
      data = await searchMovies(q, page);
    } else if (list === FREE_FR) {
      data = await discoverFreeInFrance('movie', page);
    } else {
      data = await getMovies(list, page);
    }
  } catch (err) {
    error = err.message;
  }
  const totalPages = liveChannels ? 1 : Math.min(data.total_pages || 1, 500);
  const pageHref = p => `/films?${new URLSearchParams({
    ...(q ? { q } : {}), ...(searching ? {} : { list }), page: String(p),
  })}`;
  const empty = !error && !liveChannels && (publicDomain ? freeFilms.length === 0 : data.results?.length === 0);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
        <h1 className="font-display text-4xl tracking-wide">
          {searching || (publicDomain && q)
            ? <>RÉSULTATS POUR « <span className="text-gold">{q}</span> »</>
            : <>FILMS <span className="text-gold">{current.title}</span></>}
        </h1>
        <form action="/films" className="flex gap-2 w-full sm:w-auto">
          {publicDomain && <input type="hidden" name="list" value={PUBLIC_DOMAIN} />}
          <input name="q" type="search" defaultValue={q} placeholder="Rechercher un film…" aria-label="Rechercher un film"
            className="flex-1 sm:w-64 bg-card border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gold" />
          <button className="bg-gold text-bg font-semibold px-4 rounded-lg text-sm">OK</button>
        </form>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {LISTS.map(l => (
          <Link key={l.id} href={`/films?list=${l.id}`}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium ${current?.id === l.id ? 'bg-gold text-bg border-gold' : 'border-border text-dim hover:text-white'}`}>
            {l.label}
          </Link>
        ))}
      </div>

      {current && INTROS[current.id] && <p className="text-dim text-xs mb-5 max-w-3xl leading-relaxed">{INTROS[current.id]}</p>}

      {error && (
        <p className="text-red text-sm py-10 text-center">
          Catalogue indisponible ({error}).{!publicDomain && !liveChannels && ' Vérifiez la variable TMDB_API_KEY dans .env.local.'}
        </p>
      )}
      {empty && <p className="text-dim text-sm py-10 text-center">Aucun film trouvé.</p>}

      {liveChannels ? (
        <ChannelGrid channels={liveChannels} countries={countries} label="une chaîne cinéma" emptyText="Aucune chaîne cinéma VF pour ce filtre." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {publicDomain
            ? freeFilms.map(f => <FreeFilmCard key={f.id} film={f} />)
            : data.results?.map(movie => <MovieCard key={movie.id} movie={movie} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          {page > 1 && <Link href={pageHref(page - 1)} className="border border-border px-4 py-2 rounded-lg text-sm hover:border-gold">← Précédent</Link>}
          <span className="text-sm text-dim">Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={pageHref(page + 1)} className="border border-border px-4 py-2 rounded-lg text-sm hover:border-gold">Suivant →</Link>}
        </div>
      )}
    </main>
  );
}

function FreeFilmCard({ film }) {
  return (
    <Link href={`/films/libre/${encodeURIComponent(film.id)}`} className="group block bg-card border border-border rounded-xl overflow-hidden hover:border-gold transition">
      <div className="aspect-[2/3] bg-bg relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnailUrl(film.id)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition" />
        <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-gold text-bg font-semibold px-1.5 py-0.5 rounded">▶ GRATUIT</span>
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold line-clamp-2">{film.title}</div>
        <div className="text-xs text-dim mt-1">{film.year || '—'}</div>
      </div>
    </Link>
  );
}
