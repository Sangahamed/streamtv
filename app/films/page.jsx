import { getMovies } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';

export default async function FilmsPage() {
  const data = await getMovies('popular', 1);

  return (
    <main style={{ maxWidth:1200, margin:'0 auto', padding:24 }}>
      <h1 style={{ fontSize:24, fontWeight:500, marginBottom:16 }}>Films populaires</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:16 }}>
        {data.results?.map(movie => <MovieCard key={movie.id} movie={movie} />)}
      </div>
    </main>
  );
}
