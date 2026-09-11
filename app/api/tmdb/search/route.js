import { searchMovies } from '@/lib/tmdb';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  if (!query) return Response.json({ error: 'Query manquante' }, { status: 400 });

  try {
    const data = await searchMovies(query);
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
