'use client';

import { useEffect, useRef } from 'react';

export default function UniversalPlayer({ source, type = 'hls', title = 'StreamTV' }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const video = videoRef.current;
      if (!video || !source || type === 'iframe') return;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

      if (source.includes('.m3u8') && !video.canPlayType('application/vnd.apple.mpegurl')) {
        const { default: Hls } = await import('hls.js');
        if (cancelled) return;
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(source);
          hls.attachMedia(video);
        }
      } else {
        video.src = source;
      }
    }
    init();
    return () => {
      cancelled = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [source, type]);

  if (type === 'iframe') {
    return <iframe src={source} title={title} className="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />;
  }
  return <video ref={videoRef} title={title} controls playsInline className="w-full h-full bg-black" />;
}
