import { getChannelStreams, getLiveTvData, getAdultChannels, isAdultChannelId } from '@/lib/iptv';

// Playlist .m3u d'une chaîne, téléchargée comme fichier : le système l'ouvre
// avec VLC (ou le lecteur associé aux .m3u) au lieu du navigateur. Utile pour
// les flux HEVC/H.265 dont le navigateur ne lit que le son. Toutes les
// sources de la chaîne y sont listées : VLC passe à la suivante si une échoue.
export async function GET(_request, { params }) {
  const { id } = await params;
  const channelId = decodeURIComponent(id);
  const streams = (await getChannelStreams(channelId))
    .filter(s => s.kind !== 'youtube' && s.kind !== 'twitch');
  if (!streams.length) return new Response('Aucun flux pour cette chaîne', { status: 404 });

  const adult = isAdultChannelId(channelId);
  const channels = adult ? await getAdultChannels() : (await getLiveTvData()).channels;
  const name = channels.find(c => c.id === channelId)?.name || channelId;
  const clean = s => String(s).replace(/[\r\n,]+/g, ' ').trim();

  const lines = ['#EXTM3U'];
  streams.forEach((s, i) => {
    lines.push(`#EXTINF:-1,${clean(name)}${streams.length > 1 ? ` (source ${i + 1})` : ''}`);
    if (s.referrer) lines.push(`#EXTVLCOPT:http-referrer=${clean(s.referrer)}`);
    if (s.userAgent) lines.push(`#EXTVLCOPT:http-user-agent=${clean(s.userAgent)}`);
    lines.push(s.url);
  });

  const filename = `${name.replace(/[^\p{L}\p{N} _.-]+/gu, '').trim() || 'chaine'}.m3u`;
  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'audio/x-mpegurl; charset=utf-8',
      'Content-Disposition': `attachment; filename="chaine.m3u"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': adult ? 'private, no-store' : 'public, max-age=300',
    },
  });
}
