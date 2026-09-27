'use client';

import { useEffect, useId, useRef } from 'react';

// Décodeur HEVC/H.265 logiciel (h265web.js, WebAssembly), utilisé en dernier
// recours quand le navigateur ne décode pas le HEVC : il reçoit alors le son
// sans l'image. Gourmand en processeur ; ~8 Mo chargés à la première lecture.
// Fichiers dans public/vendor/h265web (dépôt numberwolf/h265web.js, licence
// CYL_Free-1.0 : voir LICENSE-Free_EN.MD dans ce dossier).
const BASE = '/vendor/h265web';
const READY_TIMEOUT_MS = 30000;

let scriptPromise = null;
function loadScript() {
  if (typeof window !== 'undefined' && window.H265webjsPlayer) return Promise.resolve();
  scriptPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${BASE}/h265web.js`;
    s.async = true;
    s.onload = () => (window.H265webjsPlayer ? resolve() : reject(new Error('h265web.js introuvable')));
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('chargement de h265web.js impossible'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function HevcPlayer({ src, onReady, onError }) {
  const containerId = `hevc-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const boxRef = useRef(null);
  // Rappels gardés à jour sans relancer le lecteur.
  const cb = useRef({ onReady, onError });
  cb.current = { onReady, onError };

  useEffect(() => {
    let player = null;
    let done = false;
    let cancelled = false;
    const finish = (ok, reason) => {
      if (done || cancelled) return;
      done = true;
      clearTimeout(timer);
      if (ok) cb.current.onReady?.();
      else cb.current.onError?.(reason);
    };
    const timer = setTimeout(() => finish(false, 'aucune image décodée à temps'), READY_TIMEOUT_MS);

    loadScript().then(() => {
      if (cancelled) return;
      const box = boxRef.current;
      const width = box?.clientWidth || 960;
      player = window.H265webjsPlayer();
      const built = player.build({
        player_id: containerId,
        wasm_js_uri: `${BASE}/h265web_wasm.js`,
        wasm_wasm_uri: `${BASE}/h265web_wasm.wasm`,
        ext_src_js_uri: `${BASE}/extjs.js`,
        ext_wasm_js_uri: `${BASE}/extwasm.js`,
        width,
        height: Math.round((width * 9) / 16),
        color: 'black',
        auto_play: true,
        ignore_audio: false,
        core: null,
        // Le format se devine d'après l'extension de l'URL, absente derrière
        // le relais (/api/tv/proxy?u=…) : sans ceci, rien n'est décodé.
        // « legacy » = décodage logiciel direct, sans tenter d'abord le
        // décodeur du navigateur qui échoue en silence sur le HEVC
        // (constaté le 27/09/2026).
        format_type: 'hls',
        hls_strategy: 'legacy',
      });
      if (!built) return finish(false, 'initialisation du décodeur impossible');
      player.on_ready_show_done_callback = () => finish(true);
      player.on_error_callback = (payload) => finish(false, `erreur du décodeur ${JSON.stringify(payload)}`);
      // Le clic sur la chaîne vaut geste utilisateur : le son peut démarrer.
      player.notify_user_gesture?.();
      player.load_media(src);
    }).catch((err) => finish(false, err.message));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      try { player?.release(); } catch { /* déjà libéré */ }
    };
  }, [src, containerId]);

  return <div ref={boxRef} id={containerId} className="w-full aspect-video bg-black overflow-hidden" />;
}
