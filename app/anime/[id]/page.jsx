import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAnime, animeTitle, plainText } from '@/lib/anilist';
import AnimeCard from '@/components/AnimeCard';
import FavoriteButton from '@/components/FavoriteButton';

const STATUS = { FINISHED: 'Terminé', RELEASING: 'En cours', NOT_YET_RELEASED: 'À venir', CANCELLED: 'Annulé', HIATUS: 'En pause' };

export async function generateMetadata({ params }) {
  const { id } = await params;
  const anime = await getAnime(id).catch(() => null);
  return { title: anime ? `${animeTitle(anime)} — StreamTV` : 'Anime — StreamTV' };
}

export default async function AnimeDetailPage({ params }) {
  const { id } = await params;
  const anime = await getAnime(id);
  if (!anime) notFound();

  const title = animeTitle(anime);
  const streaming = (anime.externalLinks || []).filter(l => l.type === 'STREAMING');
  const episodes = anime.streamingEpisodes || [];
  const recommendations = (anime.recommendations?.nodes || [])
    .map(n => n.mediaRecommendation).filter(m => m && !m.isAdult);
  const trailer = anime.trailer?.site === 'youtube' ? anime.trailer.id : null;

  return (
    <main>
      {anime.bannerImage && (
        <div className="relative h-40 md:h-64 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={anime.bannerImage} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
        </div>
      )}
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 pb-12 ${anime.bannerImage ? '-mt-20 md:-mt-32 relative' : 'pt-10'}`}>
        <Link href="/anime" className="text-sm text-dim hover:text-gold">← Retour aux anime</Link>
        <div className="grid md:grid-cols-[230px_1fr] gap-8 mt-4">
          <div className="rounded-xl overflow-hidden bg-card border border-border self-start max-w-[230px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {anime.coverImage?.large && <img src={anime.coverImage.large} alt={`Affiche de ${title}`} className="w-full object-cover" />}
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide leading-none">{title}</h1>
            {anime.title?.english && anime.title.romaji !== anime.title.english && (
              <p className="text-dim text-sm mt-1">{anime.title.romaji}</p>
            )}
            <p className="text-dim mt-3 text-sm">
              {[anime.seasonYear, anime.format?.replace('_', ' '), anime.episodes ? `${anime.episodes} épisodes` : null,
                anime.duration ? `${anime.duration} min` : null, STATUS[anime.status],
                anime.averageScore ? `★ ${(anime.averageScore / 10).toFixed(1)}` : null].filter(Boolean).join(' · ')}
            </p>
            {anime.genres?.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-3">
                {anime.genres.map(g => <span key={g} className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded uppercase">{g}</span>)}
              </div>
            )}
            <div className="mt-4">
              <FavoriteButton item={{ id: `anime-${anime.id}`, type: 'film', title, poster: anime.coverImage?.large, href: `/anime/${anime.id}` }} />
            </div>
            <p className="leading-relaxed mt-5 text-sm text-dim whitespace-pre-line">{plainText(anime.description) || 'Synopsis indisponible.'}</p>

            <section className="mt-7">
              <h2 className="font-display text-2xl tracking-wide mb-3">Où regarder légalement</h2>
              {streaming.length ? (
                <div className="flex gap-2 flex-wrap">
                  {streaming.map(l => (
                    <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-xs hover:border-gold"
                      style={l.color ? { borderLeft: `3px solid ${l.color}` } : undefined}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {l.icon && <img src={l.icon} alt="" className="w-4 h-4" />}
                      {l.site}{l.language ? ` (${l.language})` : ''}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-dim">Aucune plateforme officielle référencée pour le moment.</p>
              )}
            </section>
          </div>
        </div>

        {trailer && (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-wide mb-3">Bande-annonce</h2>
            <div className="aspect-video rounded-xl overflow-hidden border border-border bg-black">
              <iframe src={`https://www.youtube-nocookie.com/embed/${trailer}`} title={`Bande-annonce de ${title}`} loading="lazy"
                className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          </section>
        )}

        {episodes.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-wide mb-3">Épisodes ({episodes.length})</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {episodes.map(ep => (
                <a key={ep.url} href={ep.url} target="_blank" rel="noopener noreferrer"
                  className="flex gap-3 bg-card border border-border rounded-lg overflow-hidden hover:border-gold">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {ep.thumbnail && <img src={ep.thumbnail} alt="" loading="lazy" className="w-28 aspect-video object-cover shrink-0" />}
                  <div className="py-2 pr-2 min-w-0">
                    <div className="text-xs font-semibold line-clamp-2">{ep.title}</div>
                    <div className="text-[11px] text-dim mt-1">▶ sur {ep.site}</div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {recommendations.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-wide mb-3">Vous aimerez aussi</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
              {recommendations.map(r => <AnimeCard key={r.id} anime={r} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
