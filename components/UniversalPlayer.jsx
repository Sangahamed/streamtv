'use client';

import { useEffect, useRef, useState } from 'react';

// Démarrage du flux : si rien ne joue au bout de ce délai, on affiche l'erreur.
const START_TIMEOUT_MS = 20000;

export default function UniversalPlayer({ source, type = 'hls', title = 'StreamTV', onRetry }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  // loading | playing | error
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    const video = videoRef.current;
    if (!video || !source || type === 'iframe') return;

    const fail = (msg) => {
      if (cancelled) return;
      setMessage(msg);
      setStatus('error');
    };
    // Lecture automatique : avec le son si le navigateur l'autorise, sinon en
    // muet (Chrome bloque l'autoplay sonore sans clic préalable).
    const autoplay = async () => {
      try {
        await video.play();
      } catch (err) {
        if (err?.name !== 'NotAllowedError') return;
        video.muted = true;
        video.play().catch(() => {});
      }
    };
    const onPlaying = () => { if (!cancelled) setStatus('playing'); };
    const onError = () => fail('Le flux ne répond pas ou le lien a expiré.');
    const timer = setTimeout(() => {
      if (video.readyState < 3) fail('Le flux met trop de temps à démarrer.');
    }, START_TIMEOUT_MS);

    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);
    video.addEventListener('canplay', autoplay, { once: true });

    async function init() {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      // Lecteur HLS natif quand le navigateur en a un (Safari, Chrome récent) :
      // constaté le 27/09/2026, hls.js rechargeait en boucle la playlist de
      // ces flux sans jamais télécharger de segment, le natif les lit.
      if (source.includes('.m3u8') && !video.canPlayType('application/vnd.apple.mpegurl')) {
        const { default: Hls } = await import('hls.js');
        if (cancelled) return;
        if (!Hls.isSupported()) return fail('Ce navigateur ne peut pas lire ce flux.');
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) fail('Le flux ne répond pas ou le lien a expiré.');
        });
        hls.loadSource(source);
        hls.attachMedia(video);
      } else {
        video.src = source;
      }
    }
    init();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
      video.removeEventListener('canplay', autoplay);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [source, type]);

  if (type === 'iframe') {
    return <iframe src={source} title={title} className="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />;
  }
  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} title={title} controls playsInline className="w-full h-full bg-black" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-mono text-dim bg-black/60 px-3 py-1.5 rounded">Chargement du flux…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <p className="text-sm text-red font-medium">Lecture impossible</p>
          <p className="text-xs text-dim max-w-xs">{message}</p>
          {onRetry && (
            <button onClick={onRetry} className="border border-gold text-gold text-xs font-mono px-4 py-2 rounded-lg hover:bg-gold/10">
              Réessayer avec un nouveau lien
            </button>
          )}
        </div>
      )}
    </div>
  );
}
