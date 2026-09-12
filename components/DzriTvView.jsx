'use client';

import { useState } from 'react';

// Certains sites bloquent l'affichage en iframe via l'en-tête HTTP
// X-Frame-Options ou Content-Security-Policy (frame-ancestors), précisément
// pour empêcher ce genre d'intégration. À cause des restrictions
// cross-origin, un script ne peut pas détecter de façon fiable si l'iframe a
// été bloquée (le navigateur affiche alors une page blanche ou une erreur
// silencieuse, sans déclencher onError). On affiche donc un avertissement
// permanent au lieu d'essayer de détecter l'échec.
export default function DzriTvView({ src }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div>
      <div className="text-xs text-dim mb-2">
        Page officielle intégrée telle quelle. Si le cadre reste vide, le site bloque probablement l'affichage en iframe (protection courante côté serveur) — repasse sur la "Vue StreamTV".
      </div>
      <div className="border border-border rounded-xl overflow-hidden bg-card" style={{ height: '75vh' }}>
        <iframe
          src={src}
          title="dzritv.com — vue en direct"
          className="w-full h-full"
          style={{ border: 0 }}
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
        />
      </div>
      {!loaded && (
        <div className="text-xs text-dim mt-2">Chargement du cadre… si rien n'apparaît après quelques secondes, l'intégration est probablement bloquée par le site.</div>
      )}
    </div>
  );
}
