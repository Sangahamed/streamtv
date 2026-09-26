import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFreeFilm } from '@/lib/archive';
import FavoriteButton from '@/components/FavoriteButton';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const film = await getFreeFilm(decodeURIComponent(id)).catch(() => null);
  return { title: film ? `${film.title} — StreamTV` : 'Film — StreamTV' };
}

export default async function FreeFilmPage({ params }) {
  const { id } = await params;
  const film = await getFreeFilm(decodeURIComponent(id));
  if (!film) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/films?list=libres" className="text-sm text-dim hover:text-gold">← Films à regarder gratuitement</Link>
      <h1 className="font-display text-4xl md:text-5xl tracking-wide leading-none mt-4">{film.title}</h1>
      <p className="text-dim text-sm mt-2">{film.year || 'Année inconnue'} · Domaine public / Creative Commons</p>

      <div className="mt-5 aspect-video rounded-xl overflow-hidden border border-border bg-black">
        <video src={film.videoUrl} poster={film.poster} controls playsInline preload="metadata" className="w-full h-full" />
      </div>

      <div className="flex gap-3 flex-wrap items-center mt-4">
        <FavoriteButton item={{ id: `libre-${film.id}`, type: 'film', title: film.title, poster: film.poster, href: `/films/libre/${film.id}` }} />
        <a href={film.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-dim underline hover:text-gold">
          Source : Internet Archive
        </a>
        <a href={film.license} target="_blank" rel="noopener noreferrer" className="text-xs text-dim underline hover:text-gold">
          Licence
        </a>
      </div>

      {film.description && (
        <p className="leading-relaxed mt-6 text-sm text-dim max-w-3xl whitespace-pre-line">{film.description}</p>
      )}
    </main>
  );
}
