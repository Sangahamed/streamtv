import { getDzriMatches } from '@/lib/dzritv-matches';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'football';
  const data = await getDzriMatches(sport, { skipCache: searchParams.get('refresh') === '1' });
  return Response.json(data, { status: data.error ? 503 : 200 });
}
