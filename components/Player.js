'use client';

import { useEffect, useRef, useState } from 'react';
import { checkStreamHealth, isMixedContent } from '@/lib/health';

export default function Player({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [streamIndex, setStreamIndex] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    async function attach() {
      const video = videoRef.current;
      const stream = channel.streams[streamIndex];
      if (!video || !stream) {
        setError('no-stream');
        return;
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (isMixedContent(stream.url)) {
        console.warn(`Flux bloqué (contenu mixte http sur https): ${stream.url}`);
        tryNext();
        return;
      }

      const health = await checkStreamHealth(stream.url, 4000);
      if (cancelled) return;
      if (!health.ok) {
        console.warn(`Flux inaccessible (${health.error}): ${stream.url}`);
        tryNext();
        return;
      }

      const isM3u8 = stream.url.includes('.m3u8');

      if (isM3u8) {
        const { default: Hls } = await import('hls.js');
        if (cancelled) return;

        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(stream.url);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) tryNext();
          });
          video.play().catch(() => {});
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = stream.url;
          video.play().catch(() => {});
        } else {
          setError('unsupported');
        }
      } else {
        video.src = stream.url;
        video.onerror = tryNext;
        video.play().catch(() => {});
      }
    }

    function tryNext() {
      if (cancelled) return;
      if (streamIndex + 1 < channel.streams.length) {
        setStreamIndex((i) => i + 1);
      } else {
        setError('unavailable');
      }
    }

    attach();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, streamIndex]);

  const currentStream = channel.streams[streamIndex];

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex justify-between items-center px-4.5 py-3.5 border-b border-border">
          <div>
            <div className="font-semibold text-[15px]">{channel.name}</div>
            <div className="live-dot font-mono text-[11px] text-red tracking-wide">DIRECT</div>
          </div>
          <button onClick={onClose} className="text-dim hover:text-white text-2xl leading-none">
            &times;
          </button>
        </div>

        <video ref={videoRef} controls playsInline className="w-full aspect-video bg-black block" />

        <div className="px-4.5 py-3.5 text-[13px] text-dim">
          {error === 'unavailable' && (
            <p className="text-red">
              Ce flux est indisponible pour le moment.{' '}
              {currentStream && (
                <a
                  href={currentStream.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold underline"
                >
                  Ouvrir le lien brut
                </a>
              )}{' '}
              (ex. dans VLC), ou réessayez plus tard.
            </p>
          )}
          {error === 'no-stream' && <p className="text-red">Aucun flux disponible pour cette chaîne.</p>}
          {error === 'unsupported' && (
            <p className="text-red">Format de flux non pris en charge par ce navigateur.</p>
          )}
          {!error && currentStream && (
            <p>
              Source {streamIndex + 1}/{channel.streams.length} · qualité :{' '}
              {currentStream.quality || 'inconnue'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
