import Link from 'next/link';

export default function MovieCard({ movie }) {
  const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
  return (
    <Link href={movie.id ? `/films/${movie.id}` : '/films'} className="group block bg-card border border-border rounded-xl overflow-hidden hover:border-gold transition">
      <div className="aspect-[2/3] bg-bg flex items-center justify-center overflow-hidden">
        {poster ? <img src={poster} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition" /> : <span className="text-dim text-xs">Affiche indisponible</span>}
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold line-clamp-2">{movie.title || movie.name}</div>
        <div className="text-xs text-dim mt-1">{movie.release_date?.slice(0,4) || '—'} · ★ {movie.vote_average?.toFixed?.(1) || '—'}</div>
      </div>
    </Link>
  );
}
