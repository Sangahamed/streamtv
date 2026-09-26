import { adultEnabled, getAdultChannels } from '@/lib/iptv';

// Liste des chaînes adultes, servie seulement si ENABLE_ADULT_CHANNELS=1.
// Aucun cookie, aucun journal, aucune mise en cache partagée : la
// confirmation d'âge n'existe que dans l'onglet du visiteur.
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!adultEnabled()) return Response.json({ enabled: false, channels: [] }, { status: 404 });
  try {
    return Response.json(
      { enabled: true, channels: await getAdultChannels() },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    return Response.json({ error: err.message, channels: [] }, { status: 502 });
  }
}
