'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkStreamHealth, isMixedContent } from '@/lib/health';
import { useFavorites } from '@/hooks/useFavorites';

// Chien de garde : on ne passe à la source suivante qu'après ce délai SANS
// AUCUN progrès (playlist, segment, métadonnées). Un flux lent mais vivant
// (playlist en 3 à 6 s mesurée le 25/09/2026) n'est donc plus abandonné.
const STALL_TIMEOUT_MS = 20000;
const HLS_MIME = 'application/vnd.apple.mpegurl';

// Réglages hls.js orientés démarrage rapide : commence en qualité basse
// puis monte, précharge le premier segment et se cale près du direct.
const HLS_CONFIG = {
  startLevel: 0,
  startFragPrefetch: true,
  capLevelToPlayerSize: true,
  liveSyncDurationCount: 2,
  maxBufferLength: 20,
  manifestLoadingTimeOut: 8000,
  fragLoadingTimeOut: 12000,
};

export default function Player({ channel, onClose }) {
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  const [streams, setStreams] = useState(null);
  const [skippedInsecure, setSkippedInsecure] = useState(0);
  const [fetchError, setFetchError] = useState(false);
  const [streamIndex, setStreamIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [reload, setReload] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | playing | unavailable | unsupported
  const [autoMuted, setAutoMuted] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { toggle, isFav } = useFavorites();
  const favorite = isFav(channel.id);

  // Fermeture au clavier, verrouillage du défilement et focus initial.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Les flux sont chargés à la demande (ils ne sont plus dans la page).
  useEffect(() => {
    const controller = new AbortController();
    // Télécharge hls.js pendant que le serveur teste les sources.
    import('hls.js').catch(() => {});
    setStreams(null);
    setFetchError(false);
    setStreamIndex(0);
    setStatus('loading');

    fetch(`/api/tv/streams/${encodeURIComponent(channel.id)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        const all = data.streams || [];
        // Une page HTTPS ne peut pas charger de flux HTTP (contenu mixte
        // bloqué) : ceux-là ne sont gardés que s'ils peuvent passer par le relais.
        const usable = all.filter((s) => s.proxy || !isMixedContent(s.url));
        setSkippedInsecure(all.length - usable.length);
        setStreams(withLastWorkingFirst(channel.id, usable));
        if (usable.length === 0) setStatus('unavailable');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setFetchError(true);
      });

    return () => controller.abort();
  }, [channel.id, reload]);

  // Beaucoup de flux ratent au premier essai puis passent quand on revient
  // (lenteur passagère) : avant d'afficher « aucune source », on refait
  // automatiquement un tour complet des sources.
  const roundRef = useRef(0);
  useEffect(() => {
    roundRef.current = 0;
    setRetrying(false);
  }, [streams]);

  const goToNextSource = useCallback(() => {
    setStreamIndex((i) => {
      if (streams && i + 1 < streams.length) return i + 1;
      if (streams?.length && roundRef.current < 1) {
        roundRef.current += 1;
        setRetrying(true);
        setAttempt((a) => a + 1);
        return 0;
      }
      setStatus('unavailable');
      return i;
    });
  }, [streams]);

  // Lecture de la source courante, avec repli automatique sur la suivante.
  useEffect(() => {
    const video = videoRef.current;
    const stream = streams?.[streamIndex];
    const channelId = channel.id;
    if (!video || !stream) return;
    // Directs YouTube / Twitch officiels : c'est leur lecteur intégré qui gère la lecture.
    if (embedUrl(stream)) {
      setStatus('playing');
      return;
    }
    if (stream.kind === 'youtube' || stream.kind === 'twitch') {
      goToNextSource(); // direct introuvable (chaîne hors antenne)
      return;
    }

    let cancelled = false;
    let hls = null;
    let started = false;
    let watchdog = null;
    setStatus('loading');
    setAutoMuted(false);
    const canNative = video.canPlayType(HLS_MIME) !== '';
    // Relais serveur d'emblée quand le navigateur ne peut pas lire le flux
    // seul : en-têtes exigés, http:// sur un site https, ou CORS refusé sans
    // lecteur natif pour le contourner.
    let viaProxy = !!stream.proxy && (
      stream.needsProxy || isMixedContent(stream.url) || (stream.cors === false && !canNative)
    );
    const src = () => (viaProxy ? stream.proxy : stream.url);

    const fail = (reason) => {
      if (cancelled || started) return;
      // Erreur en lecture directe : on retente une fois via le relais, sauf si
      // le serveur a déjà constaté que la source est morte.
      if (!viaProxy && stream.proxy && stream.alive !== false && reason !== 'aucun progrès') {
        console.warn(`Lecture directe impossible (${reason}), passage par le relais : ${stream.url}`);
        viaProxy = true;
        teardown();
        bump();
        attach();
        return;
      }
      console.warn(`Source abandonnée (${reason}) : ${stream.url}`);
      goToNextSource();
    };
    const teardown = () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
      video.removeEventListener('error', onNativeError);
      video.removeAttribute('src');
    };
    // Relancé à chaque signe de vie du flux.
    const bump = () => {
      clearTimeout(watchdog);
      if (!started) watchdog = setTimeout(() => fail('aucun progrès'), STALL_TIMEOUT_MS);
    };
    const onStarted = () => {
      if (cancelled || started) return;
      started = true;
      clearTimeout(watchdog);
      setStatus('playing');
      // Aucun historique gardé pour les chaînes adultes.
      if (!channel.adult) rememberWorkingSource(channelId, stream.url);
    };
    // Lecture auto avec le son refusée (fréquent sur mobile) : on relance en
    // muet plutôt que de laisser le délai expirer sur une source saine.
    const play = () => {
      video.play().catch((err) => {
        if (cancelled || err?.name !== 'NotAllowedError') return;
        video.muted = true;
        setAutoMuted(true);
        video.play().catch(() => {});
      });
    };
    // Lecteur natif (Safari, Android, Chrome récent) : pas soumis au CORS, ce
    // qui lit aussi les flux que le diffuseur interdit à hls.js.
    const playNative = () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
      video.addEventListener('error', onNativeError);
      video.src = src();
      bump();
      play();
    };
    const onNativeError = () => fail('erreur du lecteur natif');

    video.addEventListener('loadeddata', onStarted);
    video.addEventListener('playing', onStarted);
    video.addEventListener('progress', bump);
    video.addEventListener('loadedmetadata', bump);
    bump();

    async function attach() {
      // Pour le HLS, pas de pré-check HEAD : beaucoup de CDN/liens raccourcis
      // (ex. jmp2.uk) y répondent mal alors que le flux se charge très bien via
      // hls.js. On ne change de source que sur erreur définitive ou sans progrès.
      if (stream.url.includes('.m3u8')) {
        if (stream.cors === false && canNative && !viaProxy) {
          playNative();
          return;
        }
        const { default: Hls } = await import('hls.js');
        if (cancelled) return;
        if (!Hls.isSupported()) {
          if (canNative) playNative();
          else {
            clearTimeout(watchdog);
            setStatus('unsupported');
          }
          return;
        }
        let networkRetries = 0;
        let mediaRecoveries = 0;
        let fragments = 0;
        hls = new Hls(HLS_CONFIG);
        hls.on(Hls.Events.MANIFEST_LOADED, bump);
        hls.on(Hls.Events.LEVEL_LOADED, bump);
        hls.on(Hls.Events.FRAG_LOADED, () => {
          fragments += 1;
          bump();
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Rien chargé du tout : souvent un blocage CORS → lecteur natif,
            // sinon relais serveur (via fail).
            if (fragments === 0 && canNative && !viaProxy && !data.response?.code) return playNative();
            if (fragments === 0 && !viaProxy && stream.proxy) return fail(`erreur réseau ${data.details}`);
            if (networkRetries < 2) {
              networkRetries += 1;
              hls.startLoad();
              return;
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            if (mediaRecoveries < 2) {
              if (mediaRecoveries === 1) hls.swapAudioCodec();
              mediaRecoveries += 1;
              hls.recoverMediaError();
              return;
            }
          }
          fail(`erreur hls.js ${data.details}`);
        });
        hls.loadSource(src());
        hls.attachMedia(video);
        play();
      } else {
        // Pour le mp4 direct, le HEAD reste utile pour écarter vite un lien mort.
        if (!viaProxy) {
          const health = await checkStreamHealth(stream.url, 6000);
          if (cancelled) return;
          if (!health.ok) return fail(`inaccessible (${health.error})`);
        }
        playNative();
      }
    }

    attach();

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      video.removeEventListener('loadeddata', onStarted);
      video.removeEventListener('playing', onStarted);
      video.removeEventListener('progress', bump);
      video.removeEventListener('loadedmetadata', bump);
      video.removeEventListener('error', onNativeError);
      if (hls) hls.destroy();
      // Coupe réellement le téléchargement du flux précédent.
      video.removeAttribute('src');
      video.load();
    };
  }, [channel.id, channel.adult, streams, streamIndex, attempt, goToNextSource]);

  function selectSource(i) {
    setStreamIndex(i);
    setAttempt((a) => a + 1);
  }

  const currentStream = streams?.[streamIndex];
  const currentEmbed = currentStream ? embedUrl(currentStream) : null;
  // Toutes les sources ont échoué et au moins une est bloquée par le diffuseur
  // (CORS) sur un navigateur sans lecteur HLS natif pour le contourner.
  const corsBlocked = !!streams?.some((s) => s.cors === false)
    && typeof document !== 'undefined'
    && document.createElement('video').canPlayType(HLS_MIME) === '';
  const showSpinner = !fetchError && !currentEmbed && (streams === null || status === 'loading');

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-title"
        className="w-full max-w-3xl max-h-full overflow-y-auto bg-card border border-border rounded-xl"
      >
        <div className="flex justify-between items-center gap-3 px-[18px] py-3.5 border-b border-border">
          <div className="min-w-0">
            <div id="player-title" className="font-semibold text-[15px] truncate">{channel.name}</div>
            <div className="live-dot font-mono text-[11px] text-red tracking-wide">DIRECT</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!channel.adult && <button
              onClick={() => toggle(channel)}
              aria-pressed={favorite}
              aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className="text-xl leading-none px-2 py-1 rounded text-gold hover:bg-cardHover"
            >
              {favorite ? '♥' : '♡'}
            </button>}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Fermer le lecteur"
              className="text-dim hover:text-white text-2xl leading-none px-2 py-1 rounded hover:bg-cardHover"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="relative bg-black">
          <video ref={videoRef} controls playsInline className={`w-full aspect-video ${currentEmbed ? 'hidden' : 'block'}`} />
          {currentEmbed && (
            <iframe
              key={currentEmbed}
              src={currentEmbed}
              title={`${channel.name} — direct`}
              className="w-full aspect-video block"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
          {autoMuted && status === 'playing' && !currentEmbed && (
            <button
              onClick={() => {
                const video = videoRef.current;
                if (video) video.muted = false;
                setAutoMuted(false);
              }}
              className="absolute top-3 left-3 bg-black/70 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-black"
            >
              🔇 Activer le son
            </button>
          )}
          {showSpinner && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <span className="h-9 w-9 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
              <span className="font-mono text-[11px] text-dim tracking-wide">
                {streams === null
                  ? 'RECHERCHE DES SOURCES…'
                  : `${retrying ? '2E TENTATIVE · ' : ''}SOURCE ${streamIndex + 1}/${streams.length} · CONNEXION…`}
              </span>
            </div>
          )}
        </div>

        <div className="px-[18px] py-3.5 text-[13px] text-dim space-y-2.5">
          {fetchError && (
            <p className="text-red">
              Impossible de récupérer les sources de cette chaîne.{' '}
              <button onClick={() => setReload((r) => r + 1)} className="text-gold underline">Réessayer</button>
            </p>
          )}
          {status === 'unavailable' && !fetchError && streams && (
            <p className="text-red">
              {streams.length === 0
                ? skippedInsecure > 0
                  ? 'Cette chaîne ne propose que des flux HTTP, bloqués par le navigateur sur un site HTTPS.'
                  : 'Aucun flux lisible dans un navigateur pour cette chaîne.'
                : corsBlocked
                  ? 'Le diffuseur interdit la lecture de ce flux depuis un autre site : il se lit dans VLC ou via le lien direct.'
                  : 'Aucune source ne répond pour le moment.'}{' '}
              {streams.length > 0 && (
                <button onClick={() => { roundRef.current = 0; setRetrying(false); selectSource(0); }} className="text-gold underline">Réessayer</button>
              )}
              {currentStream && (
                <>
                  {' · '}
                  <a href={currentStream.url} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                    Ouvrir le lien brut
                  </a>{' '}
                  (ex. dans VLC)
                </>
              )}
            </p>
          )}
          {status === 'unsupported' && (
            <p className="text-red">Format de flux non pris en charge par ce navigateur.</p>
          )}

          {streams && streams.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wide">Sources :</span>
              {streams.map((s, i) => {
                const labels = s.labels || [];
                return (
                  <button
                    key={s.url}
                    onClick={() => selectSource(i)}
                    aria-pressed={i === streamIndex}
                    title={s.url}
                    className={`font-mono text-[11px] px-2 py-1 rounded border transition ${
                      i === streamIndex
                        ? 'border-gold text-gold bg-gold/10'
                        : 'border-border hover:border-dim hover:text-white'
                    } ${s.alive === false ? 'opacity-50 line-through decoration-dim/60' : ''}`}
                  >
                    {i + 1}
                    {s.kind === 'youtube' && ' · YouTube'}
                    {s.kind === 'twitch' && ' · Twitch'}
                    {s.feed && ` · ${s.feed}`} · {s.quality || 'auto'}
                    {labels.includes('Geo-blocked') && ' · géo'}
                    {labels.includes('Not 24/7') && ' · non 24/7'}
                    {s.needsProxy && ' · relais'}
                    {s.alive === false && ' · hors ligne'}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// URL du lecteur intégré officiel pour les directs YouTube / Twitch.
// Dernière source qui a réellement démarré, par chaîne, gardée dans ce
// navigateur : la chaîne redémarre directement dessus la fois suivante.
const LAST_SOURCE_KEY = 'st_last_sources';
const LAST_SOURCE_MAX = 300;

function readLastSources() {
  try {
    const data = JSON.parse(localStorage.getItem(LAST_SOURCE_KEY) || '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function rememberWorkingSource(channelId, url) {
  try {
    const data = readLastSources();
    delete data[channelId]; // réinsérée en dernier = la plus récente
    data[channelId] = url;
    const ids = Object.keys(data);
    for (const id of ids.slice(0, Math.max(0, ids.length - LAST_SOURCE_MAX))) delete data[id];
    localStorage.setItem(LAST_SOURCE_KEY, JSON.stringify(data));
  } catch {
    // Stockage indisponible (navigation privée) : on s'en passe.
  }
}

function withLastWorkingFirst(channelId, streams) {
  const url = readLastSources()[channelId];
  const index = url ? streams.findIndex((s) => s.url === url) : -1;
  if (index <= 0) return streams;
  return [streams[index], ...streams.slice(0, index), ...streams.slice(index + 1)];
}

function embedUrl(stream) {
  if (stream.kind === 'youtube') return stream.embed || null;
  if (stream.kind === 'twitch' && stream.twitchChannel && typeof window !== 'undefined') {
    return `https://player.twitch.tv/?channel=${stream.twitchChannel}&parent=${window.location.hostname}`;
  }
  return null;
}
