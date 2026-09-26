import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTvDetails } from '@/lib/tmdb';
import FavoriteButton from '@/components/FavoriteButton';

const IMG = 'https://image.tmdb.org/t/p';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const show = await getTvDetails(id).catch(() => null);
  return { title: show?.name ? `${show.name} — StreamTV` : 'Anime — StreamTV' };
}

// Fiche d'une série anime disponible gratuitement en France (données TMDB /
// JustWatch) : synopsis en français, saisons et plateformes pour la regarder.
export default async function FreeAnimePage({ params }) {
  const { id } = await params;
  const show = await getTvDetails(id);
  if (!show?.id) notFound();

  const providers = show['watch/providers']?.results?.FR;
  const free = [...(providers?.free || []), ...(providers?.ads || [])];
  const subscription = providers?.flatrate || [];
  const trailer = show.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')
    || show.videos?.results?.find(v => v.site === 'YouTube');
  const seasons = (show.seasons || []).filter(s => s.season_number > 0);
  const backdrop = show.backdrop_path ? `${IMG}/w1280${show.backdrop_path}` : null;

  return (
    <main>
      {backdrop && (
        <div className="relative h-40 md:h-64 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdrop} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
        </div>
      )}
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 pb-12 ${backdrop ? '-mt-20 md:-mt-32 relative' : 'pt-10'}`}>
        <Link href="/anime?sort=gratuits" className="text-sm text-dim hover:text-gold">← Anime gratuits en VF</Link>
        <div className="grid md:grid-cols-[230px_1fr] gap-8 mt-4">
          <div className="rounded-xl overflow-hidden bg-card border border-border self-start max-w-[230px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {show.poster_path && <img src={`${IMG}/w500${show.poster_path}`} alt={`Affiche de ${show.name}`} className="w-full object-cover" />}
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide leading-none">{show.name}</h1>
            {show.original_name && show.original_name !== show.name && <p className="text-dim text-sm mt-1">{show.original_name}</p>}
            <p className="text-dim mt-3 text-sm">
              {[show.first_air_date?.slice(0, 4), show.number_of_seasons ? `${show.number_of_seasons} saison(s)` : null,
                show.number_of_episodes ? `${show.number_of_episodes} épisodes` : null,
                show.vote_average ? `★ ${show.vote_average.toFixed(1)}` : null].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-4 flex gap-3 flex-wrap">
              {free[0] && (
                <a href={providers.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gold text-bg font-semibold pl-2 pr-4 py-2 rounded-lg text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/w92${free[0].logo_path}`} alt="" className="w-6 h-6 rounded" />
                  ▶ Regarder gratuitement sur {free[0].provider_name}
                </a>
              )}
              <FavoriteButton item={{ id: `anime-tmdb-${show.id}`, type: 'film', title: show.name, poster_path: show.poster_path, href: `/anime/tmdb/${show.id}` }} />
            </div>
            <p className="leading-relaxed mt-5 text-sm text-dim">{show.overview || 'Synopsis indisponible.'}</p>

            <section className="mt-7">
              <h2 className="font-display text-2xl tracking-wide mb-3">Où regarder en France</h2>
              {[{ label: 'Gratuit', items: free }, { label: 'Abonnement', items: subscription }].filter(o => o.items.length).map(o => (
                <div key={o.label} className="flex items-center gap-3 flex-wrap mb-3">
                  <span className="text-xs text-dim w-24 shrink-0 uppercase tracking-wide">{o.label}</span>
                  {o.items.map(p => (
                    <a key={p.provider_id} href={providers.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-card border border-border rounded-lg pr-3 hover:border-gold">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${IMG}/w92${p.logo_path}`} alt="" className="w-8 h-8 rounded-l-lg" />
                      <span className="text-xs">{p.provider_name}</span>
                    </a>
                  ))}
                </div>
              ))}
              {!free.length && !subscription.length && <p className="text-sm text-dim">Aucune plateforme référencée en France pour le moment.</p>}
              <p className="text-[11px] text-dim/70">Disponibilités en France, fournies par JustWatch. VF ou VOSTFR selon la plateforme.</p>
            </section>
          </div>
        </div>

        {trailer && (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-wide mb-3">Bande-annonce</h2>
            <div className="aspect-video rounded-xl overflow-hidden border border-border bg-black">
              <iframe src={`https://www.youtube-nocookie.com/embed/${trailer.key}`} title={`Bande-annonce de ${show.name}`} loading="lazy"
                className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          </section>
        )}

        {seasons.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-wide mb-3">Saisons</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {seasons.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="aspect-[2/3] bg-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.poster_path && <img src={`${IMG}/w185${s.poster_path}`} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-semibold line-clamp-1">{s.name}</div>
                    <div className="text-[11px] text-dim">{s.episode_count} épisodes</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
