import Link from 'next/link';
import { listAnime, SORTS } from '@/lib/anilist';
import { discoverFreeAnime } from '@/lib/tmdb';
import { getLiveTvData } from '@/lib/iptv';
import AnimeCard from '@/components/AnimeCard';
import ChannelGrid from '@/components/ChannelGrid';

export const metadata = { title: 'Anime — StreamTV' };

// Onglets VF en tête, puis les classements AniList.
const TABS = [
  { id: 'gratuits', label: '▶ Gratuits en VF', title: 'GRATUITS EN VF' },
  { id: 'chaines', label: '📺 Chaînes anime VF', title: 'CHAÎNES ANIME VF' },
  ...Object.entries(SORTS).map(([id, s]) => ({ id, label: s.label, title: s.label.toUpperCase() })),
];
const INTROS = {
  gratuits: 'Séries anime proposées gratuitement et légalement en France (Crunchyroll, ADN, Pluto TV, france.tv…), en VF ou VOSTFR. Ouvrez une fiche pour lancer les épisodes sur la plateforme.',
  chaines: 'Chaînes anime diffusées en français, gratuites et en clair : lecture directe dans StreamTV.',
};
const ANIME_NAME = /anim|manga|japan|otaku|conan|one piece|naruto|pok[eé]mon|dragon ball/i;

export default async function AnimePage({ searchParams }) {
  const params = await searchParams;
  const q = (params?.q || '').trim();
  const tab = TABS.some(t => t.id === params?.sort) ? params.sort : 'gratuits';
  const page = Math.min(Math.max(parseInt(params?.page || '1', 10) || 1, 1), 200);
  const current = q ? null : TABS.find(t => t.id === tab);

  let items = [];
  let tmdbItems = null;
  let liveChannels = null;
  let countries = [];
  let lastPage = 1;
  let error = null;
  try {
    if (!q && tab === 'chaines') {
      const tv = await getLiveTvData();
      liveChannels = tv.channels.filter(c => c.fr && (c.categories.includes('animation') || ANIME_NAME.test(c.name || '')));
      countries = tv.countries;
    } else if (!q && tab === 'gratuits') {
      const data = await discoverFreeAnime(page);
      tmdbItems = data.results || [];
      lastPage = Math.min(data.total_pages || 1, 500);
    } else {
      const data = await listAnime({ sort: SORTS[tab] ? tab : 'trending', search: q, page });
      items = data.items;
      lastPage = data.lastPage;
    }
  } catch (err) {
    error = err.message;
  }
  const pageHref = p => `/anime?${new URLSearchParams({ ...(q ? { q } : { sort: tab }), page: String(p) })}`;
  const empty = !error && !liveChannels && (tmdbItems ? tmdbItems.length === 0 : items.length === 0);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
        <h1 className="font-display text-4xl tracking-wide">
          {q ? <>RÉSULTATS POUR « <span className="text-gold">{q}</span> »</> : <>ANIME <span className="text-gold">{current.title}</span></>}
        </h1>
        <form action="/anime" className="flex gap-2 w-full sm:w-auto">
          <input name="q" type="search" defaultValue={q} placeholder="Rechercher un anime…" aria-label="Rechercher un anime"
            className="flex-1 sm:w-64 bg-card border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gold" />
          <button className="bg-gold text-bg font-semibold px-4 rounded-lg text-sm">OK</button>
        </form>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <Link key={t.id} href={`/anime?sort=${t.id}`}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium ${current?.id === t.id ? 'bg-gold text-bg border-gold' : 'border-border text-dim hover:text-white'}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {current && INTROS[current.id] && <p className="text-dim text-xs mb-5 max-w-3xl leading-relaxed">{INTROS[current.id]}</p>}
      {error && <p className="text-red text-sm py-10 text-center">Catalogue anime indisponible ({error}).</p>}
      {empty && <p className="text-dim text-sm py-10 text-center">Aucun anime trouvé.</p>}

      {liveChannels ? (
        <ChannelGrid channels={liveChannels} countries={countries} label="une chaîne anime" emptyText="Aucune chaîne anime VF pour ce filtre." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {tmdbItems
            ? tmdbItems.map(s => <FreeAnimeCard key={s.id} show={s} />)
            : items.map(a => <AnimeCard key={a.id} anime={a} />)}
        </div>
      )}

      {!liveChannels && lastPage > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          {page > 1 && <Link href={pageHref(page - 1)} className="border border-border px-4 py-2 rounded-lg text-sm hover:border-gold">← Précédent</Link>}
          <span className="text-sm text-dim">Page {page} / {lastPage}</span>
          {page < lastPage && <Link href={pageHref(page + 1)} className="border border-border px-4 py-2 rounded-lg text-sm hover:border-gold">Suivant →</Link>}
        </div>
      )}
      <p className="text-[11px] text-dim/70 mt-8">
        Données : AniList, TMDB et JustWatch. Les épisodes se regardent sur les plateformes officielles indiquées dans chaque fiche.
      </p>
    </main>
  );
}

function FreeAnimeCard({ show }) {
  return (
    <Link href={`/anime/tmdb/${show.id}`} className="group block bg-card border border-border rounded-xl overflow-hidden hover:border-gold transition">
      <div className="aspect-[2/3] bg-bg relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {show.poster_path && <img src={`https://image.tmdb.org/t/p/w342${show.poster_path}`} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition" />}
        <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-gold text-bg font-semibold px-1.5 py-0.5 rounded">▶ GRATUIT</span>
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold line-clamp-2">{show.name}</div>
        <div className="text-xs text-dim mt-1">
          {[show.first_air_date?.slice(0, 4), show.vote_average ? `★ ${show.vote_average.toFixed(1)}` : null].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
    </Link>
  );
}
