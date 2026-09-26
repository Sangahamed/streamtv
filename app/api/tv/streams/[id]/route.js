import { getChannelStreams, isAdultChannelId } from '@/lib/iptv';
import { checkStreams } from '@/lib/stream-check';
import { proxyUrl } from '@/lib/stream-proxy';

// Flux d'une chaîne, chargés par le lecteur à l'ouverture : évite d'embarquer
// les ~15 000 URL de flux dans les pages /tv et d'accueil. Chaque source est
// testée côté serveur pour proposer d'abord celles qui répondent.
export async function GET(_request, { params }) {
  const { id } = await params;
  const channelId = decodeURIComponent(id);
  try {
    const checked = await checkStreams(await getChannelStreams(channelId));
    // Chaque flux vidéo reçoit un lien de relais serveur, utilisé par le
    // lecteur quand la lecture directe est impossible. Les en-têtes exigés par
    // le diffuseur restent dans le lien signé, pas dans la réponse.
    const streams = checked.map(({ referrer, userAgent, ...s }) => {
      if (s.kind === 'youtube' || s.kind === 'twitch') return s;
      return {
        ...s,
        proxy: proxyUrl(s.url, { referrer, userAgent }),
        ...(referrer || userAgent ? { needsProxy: true } : {}),
      };
    });
    return Response.json(
      { streams },
      {
        headers: {
          // Rien n'est mis en cache pour les chaînes adultes, ni partagé.
          'Cache-Control': isAdultChannelId(channelId)
            ? 'private, no-store'
            : 'public, s-maxage=600, stale-while-revalidate=3600',
        },
      }
    );
  } catch (err) {
    return Response.json({ error: err.message, streams: [] }, { status: 502 });
  }
}
