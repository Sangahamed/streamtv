import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMovieDetails } from '@/lib/tmdb';
import { findFreeFilm } from '@/lib/archive';
import FavoriteButton from '@/components/FavoriteButton';

const IMG = 'https://image.tmdb.org/t/p';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const movie = await getMovieDetails(id).catch(() => null);
  return { title: movie?.title ? `${movie.title} — StreamTV` : 'Film — StreamTV' };
}

export default async function MovieDetailsPage({ params }) {
  const { id } = await params;
  const movie = await getMovieDetails(id);
  if (!movie?.id) notFound();

  const poster = movie.poster_path ? `${IMG}/w780${movie.poster_path}` : null;
  const backdrop = movie.backdrop_path ? `${IMG}/w1280${movie.backdrop_path}` : null;
  // Plateformes légales où le film est disponible en France (données JustWatch via TMDB).
  const providers = movie['watch/providers']?.results?.FR;
  const offers = [
    { label: 'Abonnement', items: providers?.flatrate },
    { label: 'Gratuit', items: [...(providers?.free || []), ...(providers?.ads || [])] },
    { label: 'Location', items: providers?.rent },
    { label: 'Achat', items: providers?.buy },
  ].filter(o => o.items?.length);
  const freeOffer = providers?.free?.[0] || providers?.ads?.[0] || null;
  const trailer = movie.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')
    || movie.videos?.results?.find(v => v.site === 'YouTube');
  const cast = movie.credits?.cast?.slice(0, 8) || [];
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)} h ${String(movie.runtime % 60).padStart(2, '0')}` : null;
  // Les films libres de droits sont presque tous anciens : inutile de chercher au-delà.
  const year = Number(movie.release_date?.slice(0, 4));
  const freeFilmId = year && year < 1964
    ? (await findFreeFilm(movie.original_title, year)) || (await findFreeFilm(movie.title, year))
    : null;

  return (
    <main>
      {backdrop && (
        <div className="relative h-48 md:h-72 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdrop} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
        </div>
      )}
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 pb-12 ${backdrop ? '-mt-24 md:-mt-40 relative' : 'pt-10'}`}>
        <Link href="/films" className="text-sm text-dim hover:text-gold">← Retour aux films</Link>
        <div className="grid md:grid-cols-[260px_1fr] gap-8 mt-4">
          <div className="rounded-xl overflow-hidden bg-card border border-border self-start max-w-[260px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {poster ? <img src={poster} alt={`Affiche de ${movie.title}`} className="w-full object-cover" /> : <div className="aspect-[2/3]" />}
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide leading-none">{movie.title}</h1>
            {movie.tagline && <p className="text-gold text-sm mt-2 italic">{movie.tagline}</p>}
            <p className="text-dim mt-3 text-sm">
              {[movie.release_date?.slice(0, 4), runtime, movie.genres?.map(g => g.name).join(', '),
                movie.vote_average ? `★ ${movie.vote_average.toFixed(1)}` : null].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-4 flex gap-3 flex-wrap">
              {freeFilmId && (
                <Link href={`/films/libre/${encodeURIComponent(freeFilmId)}`} className="bg-gold text-bg font-semibold px-4 py-2.5 rounded-lg text-sm">
                  ▶ Regarder le film (domaine public)
                </Link>
              )}
              {freeOffer && (
                <a href={providers.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gold text-bg font-semibold pl-2 pr-4 py-2 rounded-lg text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/w92${freeOffer.logo_path}`} alt="" className="w-6 h-6 rounded" />
                  ▶ Regarder gratuitement sur {freeOffer.provider_name}
                </a>
              )}
              <FavoriteButton item={{ id: `film-${movie.id}`, type: 'film', title: movie.title, poster_path: movie.poster_path }} />
            </div>
            <p className="leading-relaxed mt-5 text-sm text-dim">{movie.overview || 'Synopsis indisponible.'}</p>

            <section className="mt-7">
              <h2 className="font-display text-2xl tracking-wide mb-3">Où regarder légalement</h2>
              {offers.length ? (
                <div className="space-y-3">
                  {offers.map(o => (
                    <div key={o.label} className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-dim w-24 shrink-0 uppercase tracking-wide">{o.label}</span>
                      {o.items.map(p => (
                        <a key={p.provider_id} href={providers.link} target="_blank" rel="noopener noreferrer" title={p.provider_name}
                          className="flex items-center gap-2 bg-card border border-border rounded-lg pr-3 hover:border-gold">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`${IMG}/w92${p.logo_path}`} alt="" className="w-8 h-8 rounded-l-lg" />
                          <span className="text-xs">{p.provider_name}</span>
                        </a>
                      ))}
                    </div>
                  ))}
                  <p className="text-[11px] text-dim/70">Disponibilités en France, fournies par JustWatch.</p>
                </div>
              ) : (
                <p className="text-sm text-dim">Aucune offre de streaming référencée en France pour le moment.</p>
              )}
            </section>
          </div>
        </div>

        {trailer && (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-wide mb-3">Bande-annonce</h2>
            <div className="aspect-video rounded-xl overflow-hidden border border-border bg-black">
              <iframe src={`https://www.youtube-nocookie.com/embed/${trailer.key}`} title={`Bande-annonce de ${movie.title}`}
                className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
            </div>
          </section>
        )}

        {cast.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-wide mb-3">Distribution</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {cast.map(p => (
                <div key={p.credit_id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-2">
                  {p.profile_path
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={`${IMG}/w92${p.profile_path}`} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover" />
                    : <div className="w-10 h-10 rounded-full bg-bg" />}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-dim truncate">{p.character}</div>
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
