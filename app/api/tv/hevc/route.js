import { startTranscode, transcodeEnabled } from '@/lib/hevc-transcode';
import { verifyProxyParams } from '@/lib/stream-proxy';

// Démarre la conversion HEVC → H.264 d'un flux (lien signé par le serveur,
// comme le relais) et renvoie vers sa playlist HLS. Voir lib/hevc-transcode.js.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!transcodeEnabled()) return new Response('Conversion HEVC indisponible sur ce serveur', { status: 503 });
  const target = verifyProxyParams(new URL(request.url).searchParams);
  if (!target) return new Response('Lien de conversion invalide', { status: 403 });
  const id = startTranscode(target);
  return new Response(null, {
    status: 302,
    headers: { Location: `/api/tv/hevc/${id}/index.m3u8`, 'Cache-Control': 'no-store' },
  });
}
