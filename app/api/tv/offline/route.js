import { getOfflineChannels } from '@/lib/iptv';

// Chaînes de l'annuaire iptv-org sans aucun flux lisible, chargées à la
// demande par la page /tv (case « Chaînes sans flux ») : trop nombreuses
// (~21 000) pour être envoyées avec le catalogue principal.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await getOfflineChannels(), {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    return Response.json({ error: err.message, channels: [], countries: [] }, { status: 502 });
  }
}
