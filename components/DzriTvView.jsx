'use client';

import { useEffect, useRef, useState } from 'react';

// Certains sites bloquent l'affichage en iframe via l'en-tête HTTP
// X-Frame-Options ou Content-Security-Policy (frame-ancestors), précisément
// pour empêcher ce genre d'intégration. À cause des restrictions
// cross-origin, un script ne peut pas détecter de façon fiable si l'iframe a
// été bloquée : même bloqué, le navigateur charge une page d'erreur
// same-origin ou about:blank, ce qui déclenche quand même `onLoad`. On ne
// peut donc pas se fier à onLoad seul — on ajoute un délai : si rien de
// visible ne s'est passé après LOAD_TIMEOUT_MS, on affiche un message plus
// clair et un lien direct vers le site, plutôt que de laisser l'utilisateur
// face à un cadre vide sans explication ni action possible.
const LOAD_TIMEOUT_MS = 6000;

export default function DzriTvView({ src }) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timerRef.current);
  }, [src]);

  const handleLoad = () => {
    clearTimeout(timerRef.current);
    setLoaded(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-dim mb-2 shrink-0">
        Page officielle intégrée telle quelle. Si le cadre reste vide, le site bloque probablement l&rsquo;affichage en iframe (protection courante côté serveur) — repasse sur la « Vue StreamTV ».
      </div>
      <div className="border border-border overflow-hidden bg-card relative flex-1 min-h-0">
        <iframe
          key={src}
          src={src}
          title="dzritv.com — vue en direct"
          className="w-full h-full block"
          style={{ border: 0 }}
          onLoad={handleLoad}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
        />
      </div>
      {!loaded && !timedOut && (
        <div className="text-xs text-dim mt-2 shrink-0">Chargement du cadre…</div>
      )}
      {timedOut && (
        <div className="text-xs text-dim mt-2 flex items-center gap-3 flex-wrap shrink-0">
          <span>Toujours rien après {Math.round(LOAD_TIMEOUT_MS / 1000)}s — le site bloque probablement l&rsquo;affichage en cadre.</span>
          <a href={src} target="_blank" rel="noopener noreferrer" className="underline text-gold shrink-0">
            Ouvrir sur dzritv.com →
          </a>
        </div>
      )}
    </div>
  );
}