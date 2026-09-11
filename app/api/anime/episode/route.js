import { getAnimeEpisodes } from '@/lib/anime-sama';
export async function GET(request) {
  const url = new URL(request.url).searchParams.get('url');
  if (!url) return Response.json({error:'URL manquante',episodes:[]},{status:400});
  try { return Response.json({episodes:await getAnimeEpisodes(url)}); }
  catch (e) { return Response.json({error:e.message,episodes:[]},{status:502}); }
}
