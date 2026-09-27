'use client';

import { useCallback, useEffect, useState } from 'react';
import Player from './Player';
import { AgeGate } from './TvApp';

// Chaînes 18+ en liste, chacune avec un lien /tv/adulte?c=<id> qui ouvre
// directement le lecteur. Comme sur /tv, la confirmation d'âge n'est gardée
// qu'en mémoire de la page et redemandée à chaque visite.
export default function AdultList() {
  const [confirmed, setConfirmed] = useState(false);
  const [channels, setChannels] = useState(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!confirmed || channels) return;
    let cancelled = false;
    fetch('/api/tv/adult', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (cancelled) return;
        const list = d.channels || [];
        setChannels(list);
        // Lien direct : ouvre la chaîne demandée dans l'URL.
        const wanted = new URLSearchParams(window.location.search).get('c');
        const match = wanted && list.find(c => c.id === wanted);
        if (match) setActive(match);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [confirmed, channels]);

  const open = useCallback((c) => {
    setActive(c);
    window.history.replaceState(null, '', `/tv/adulte?c=${encodeURIComponent(c.id)}`);
  }, []);
  const close = useCallback(() => {
    setActive(null);
    window.history.replaceState(null, '', '/tv/adulte');
  }, []);
  const copy = useCallback((c) => {
    const link = `${window.location.origin}/tv/adulte?c=${encodeURIComponent(c.id)}`;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(c.id);
      setTimeout(() => setCopied(id => (id === c.id ? null : id)), 1500);
    }).catch(() => {});
  }, []);

  if (!confirmed) {
    return <div className="min-h-[60vh]">
      <AgeGate onConfirm={() => setConfirmed(true)} onCancel={() => { window.location.href = '/tv'; }} />
    </div>;
  }

  return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
    <a href="/tv" className="text-xs text-dim font-mono hover:text-white">← Retour à la TV</a>
    <h1 className="font-display text-4xl tracking-wide mt-3">Chaînes <span className="text-red">18+</span></h1>
    <p className="text-dim text-sm mt-2 leading-relaxed">
      Seules les chaînes dont au moins un flux répond sont listées (test refait toutes les 10 minutes).
    </p>

    {error && <p className="text-red font-mono text-sm mt-8">Impossible de charger les chaînes 18+.</p>}
    {!channels && !error && <p className="text-dim font-mono text-sm mt-8">Test des flux en cours… (jusqu&rsquo;à ~20 s)</p>}
    {channels && channels.length === 0 && <p className="text-dim font-mono text-sm mt-8">Aucune chaîne ne fonctionne en ce moment.</p>}

    {channels && channels.length > 0 && <>
      <p className="font-mono text-xs text-gold mt-6">{channels.length} chaînes fonctionnelles</p>
      <ul className="mt-3 divide-y divide-border border border-border rounded-xl overflow-hidden">
        {channels.map((c, i) => {
          const href = `/tv/adulte?c=${encodeURIComponent(c.id)}`;
          return <li key={c.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-cardHover">
            <span className="font-mono text-[11px] text-dim w-8 shrink-0">{String(i + 1).padStart(2, '0')}</span>
            <a href={href} onClick={e => { e.preventDefault(); open(c); }} className="flex-1 min-w-0 truncate hover:text-gold">
              {c.name}
            </a>
            <span className="font-mono text-[11px] text-dim shrink-0">{c.live} {c.live > 1 ? 'sources' : 'source'}</span>
            <button onClick={() => copy(c)} className="font-mono text-[11px] border border-border rounded px-2 py-1 text-dim hover:text-white shrink-0">
              {copied === c.id ? 'Copié ✓' : 'Copier le lien'}
            </button>
          </li>;
        })}
      </ul>
    </>}

    {active && <Player channel={active} onClose={close} />}
  </div>;
}
