import { getMovieDetails } from '@/lib/tmdb';
import Link from 'next/link';

export default async function MovieDetailsPage({ params }) {
  const movie = await getMovieDetails(params.id);
  const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : null;
  return <main className="max-w-5xl mx-auto px-6 py-10">
    <Link href="/films" className="text-sm text-dim hover:text-gold">← Retour aux films</Link>
    <div className="grid md:grid-cols-[280px_1fr] gap-8 mt-6">
      <div className="rounded-xl overflow-hidden bg-card">{poster && <img src={poster} alt="" className="w-full object-cover" />}</div>
      <div><h1 className="font-display text-5xl tracking-wide">{movie.title}</h1><p className="text-dim mt-2">{movie.release_date?.slice(0,4)} · ★ {movie.vote_average?.toFixed?.(1)}</p><p className="leading-relaxed mt-5 text-sm text-dim">{movie.overview || 'Synopsis indisponible.'}</p></div>
    </div>
  </main>;
}
