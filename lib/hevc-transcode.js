// lib/hevc-transcode.js — Conversion à la volée des flux HEVC/H.265 en H.264
// avec ffmpeg, pour les navigateurs qui ne décodent pas le HEVC (ils ne
// jouent que le son). Le navigateur reçoit un HLS H.264 ordinaire, décodé par
// la carte graphique.
// Uniquement sur un serveur qui garde des processus (local, VPS) : désactivé
// sur Vercel. Très gourmand en processeur : mesuré le 27/09/2026 sur un
// i3-2350M, un flux 1080p HEVC converti en 720p « ultrafast » tourne à ~1,1x
// le temps réel → une seule conversion à la fois par défaut.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const IDLE_MS = 30000; // plus aucune requête du lecteur → conversion arrêtée
const MAX_SESSIONS = Math.max(1, Number(process.env.HEVC_MAX_SESSIONS) || 1);
const ROOT = path.join(os.tmpdir(), 'streamtv-hevc');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36';

const store = (globalThis.__streamtvHevc ||= { sessions: new Map(), reaper: null, ffmpeg: undefined });

// Chemin de ffmpeg : FFMPEG_PATH, sinon « ffmpeg » dans le PATH, sinon
// l'installation winget (Gyan.FFmpeg) que le PATH d'un serveur déjà lancé
// ne voit pas encore. null si introuvable.
export function ffmpegPath() {
  if (store.ffmpeg !== undefined) return store.ffmpeg;
  const candidates = [process.env.FFMPEG_PATH, 'ffmpeg'];
  const winget = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
  try {
    for (const pkg of winget ? readdirSync(winget).filter(d => /^Gyan\.FFmpeg/i.test(d)) : []) {
      for (const build of readdirSync(path.join(winget, pkg))) {
        candidates.push(path.join(winget, pkg, build, 'bin', 'ffmpeg.exe'));
      }
    }
  } catch { /* pas de winget */ }
  store.ffmpeg = candidates.filter(Boolean).find(p => {
    try {
      return spawnSync(p, ['-version'], { stdio: 'ignore', timeout: 5000 }).status === 0;
    } catch {
      return false;
    }
  }) || null;
  return store.ffmpeg;
}

export function transcodeEnabled() {
  return !process.env.VERCEL && process.env.HEVC_TRANSCODE !== '0' && !!ffmpegPath();
}

export function sessionId(url) {
  return createHash('sha1').update(url).digest('hex').slice(0, 16);
}

function stop(session) {
  store.sessions.delete(session.id);
  try { session.proc.kill('SIGKILL'); } catch { /* déjà arrêté */ }
  // Windows garde le dossier verrouillé un instant après l'arrêt de ffmpeg.
  setTimeout(() => rmSync(session.dir, { recursive: true, force: true }), 2000);
}

function startReaper() {
  store.reaper ||= setInterval(() => {
    for (const s of store.sessions.values()) {
      if (Date.now() - s.lastAccess > IDLE_MS) stop(s);
    }
  }, 5000);
  store.reaper.unref?.();
}

// Démarre (ou réutilise) la conversion de `url`. Renvoie l'id de session.
export function startTranscode({ url, referrer = null, userAgent = null }) {
  const id = sessionId(url);
  const existing = store.sessions.get(id);
  if (existing && existing.exitCode === null) {
    existing.lastAccess = Date.now();
    return id;
  }
  if (existing) stop(existing);

  // Place pour la nouvelle conversion : on arrête la plus anciennement utilisée.
  const bySeniority = [...store.sessions.values()].sort((a, b) => a.lastAccess - b.lastAccess);
  while (bySeniority.length >= MAX_SESSIONS) stop(bySeniority.shift());

  const dir = path.join(ROOT, id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const args = [
    '-hide_banner', '-loglevel', 'error',
    '-user_agent', userAgent || UA,
    ...(referrer ? ['-headers', `Referer: ${referrer}\r\n`] : []),
    '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5',
    '-i', url,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
    '-vf', "scale=-2:'min(720,ih)'", '-g', '50', '-sc_threshold', '0',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6',
    '-hls_flags', 'delete_segments+omit_endlist+independent_segments',
    '-hls_segment_filename', path.join(dir, 'seg%05d.ts'),
    path.join(dir, 'index.m3u8'),
  ];
  const proc = spawn(ffmpegPath(), args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  const session = { id, url, dir, proc, lastAccess: Date.now(), exitCode: null, error: '' };
  proc.stderr.on('data', d => { session.error = (session.error + d).slice(-500); });
  proc.on('exit', code => {
    session.exitCode = code ?? -1;
    if (code) console.warn(`Conversion HEVC arrêtée (code ${code}) : ${session.error.trim()}`);
  });
  store.sessions.set(id, session);
  startReaper();
  return id;
}

// Session active (et marquée comme utilisée), ou null.
export function touchSession(id) {
  const s = store.sessions.get(id);
  if (s) s.lastAccess = Date.now();
  return s || null;
}

export function sessionFile(session, name) {
  const file = path.join(session.dir, name);
  return existsSync(file) ? file : null;
}
