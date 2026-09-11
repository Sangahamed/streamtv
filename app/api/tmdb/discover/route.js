import { getMovies } from '@/lib/tmdb';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'popular';
  const page = parseInt(searchParams.get('page')) || 1;

  try {
    const data = await getMovies(query, page);
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
