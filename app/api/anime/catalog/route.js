import { searchAnime } from '@/lib/anime-sama';
export async function GET(request) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q) return Response.json({results:[]});
  try { return Response.json({results:await searchAnime(q)}); }
  catch (e) { return Response.json({error:e.message,results:[]},{status:502}); }
}
