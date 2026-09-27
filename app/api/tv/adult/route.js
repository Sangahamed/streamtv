import { adultEnabled, getAdultChannels, getChannelStreams } from '@/lib/iptv';
import { checkStreams } from '@/lib/stream-check';

// Liste des chaînes adultes, servie seulement si ENABLE_ADULT_CHANNELS=1.
// Aucun cookie, aucun journal, aucune mise en cache partagée : la
// confirmation d'âge n'existe que dans l'onglet du visiteur.
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!adultEnabled()) return Response.json({ enabled: false, channels: [] }, { status: 404 });
  try {
    // Les playlists adultes vieillissent vite (domaines disparus, clés
    // payantes) : seules les chaînes dont au moins un flux a répondu sont
    // listées. Chaque test va jusqu'au bout (8 s max), en cache 10 min.
    const all = await getAdultChannels();
    const playable = await Promise.all(all.map(async (c) => {
      const streams = await checkStreams(await getChannelStreams(c.id), { wait: true });
      const live = streams.filter(s => s.alive === true).length;
      return live ? { ...c, live } : null;
    }));
    return Response.json(
      { enabled: true, channels: playable.filter(Boolean) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    return Response.json({ error: err.message, channels: [] }, { status: 502 });
  }
}
