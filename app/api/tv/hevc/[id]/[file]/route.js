import { readFile } from 'node:fs/promises';
import { sessionFile, touchSession } from '@/lib/hevc-transcode';

// Playlist et segments H.264 produits par ffmpeg pour une conversion en cours.
// Chaque requête du lecteur maintient la conversion en vie.
export const dynamic = 'force-dynamic';

const FIRST_PLAYLIST_WAIT_MS = 25000;

export async function GET(_request, { params }) {
  const { id, file } = await params;
  if (!/^[0-9a-f]{16}$/.test(id) || !/^(index\.m3u8|seg\d{5}\.ts)$/.test(file)) {
    return new Response('Introuvable', { status: 404 });
  }
  const session = touchSession(id);
  if (!session) return new Response('Conversion terminée', { status: 404 });

  if (file === 'index.m3u8') {
    // ffmpeg met quelques secondes à produire la première playlist : on
    // attend qu'elle liste au moins deux segments plutôt que de faire échouer
    // le lecteur.
    const started = Date.now();
    while (Date.now() - started < FIRST_PLAYLIST_WAIT_MS) {
      if (session.exitCode !== null) {
        return new Response(`Conversion impossible : ${session.error.trim() || 'flux illisible'}`, { status: 502 });
      }
      const path = sessionFile(session, file);
      const text = path ? await readFile(path, 'utf8').catch(() => '') : '';
      if ((text.match(/\.ts/g) || []).length >= 2) {
        return new Response(text, {
          headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' },
        });
      }
      await new Promise(r => setTimeout(r, 500));
      touchSession(id);
    }
    return new Response('La conversion ne démarre pas', { status: 504 });
  }

  const path = sessionFile(session, file);
  const data = path ? await readFile(path).catch(() => null) : null;
  if (!data) return new Response('Segment expiré', { status: 404 });
  return new Response(data, { headers: { 'Content-Type': 'video/mp2t', 'Cache-Control': 'no-store' } });
}
