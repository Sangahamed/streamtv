import { getMovies } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import Link from 'next/link';

export default async function FilmsPage({ searchParams }) {
  const params = await searchParams;
  const page = Math.min(Math.max(parseInt(params?.page || '1', 10) || 1, 1), 500); // TMDB limite à 500 pages
  const data = await getMovies('popular', page);
  const totalPages = Math.min(data.total_pages || 1, 500);

  return (
    <main style={{ maxWidth:1200, margin:'0 auto', padding:24 }}>
      <h1 style={{ fontSize:24, fontWeight:500, marginBottom:16 }}>Films populaires</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:16 }}>
        {data.results?.map(movie => <MovieCard key={movie.id} movie={movie} />)}
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:12, marginTop:32 }}>
        {page > 1 && (
          <Link href={`/films?page=${page - 1}`} className="border border-border px-4 py-2 rounded-lg text-sm">
            ← Précédent
          </Link>
        )}
        <span style={{ padding:'8px 0', fontSize:14, opacity:0.7 }}>Page {page} / {totalPages}</span>
        {page < totalPages && (
          <Link href={`/films?page=${page + 1}`} className="border border-border px-4 py-2 rounded-lg text-sm">
            Suivant →
          </Link>
        )}
      </div>
    </main>
  );
}
