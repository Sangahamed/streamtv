'use client';

import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import ChannelCard from './ChannelCard';
import Player from './Player';
import { useFavorites } from '@/hooks/useFavorites';
import { normalize } from '@/lib/labels';

const PAGE_SIZE = 30;

// Grille de chaînes en direct (sport, cinéma VF, anime VF…) avec recherche,
// filtre pays et le même lecteur que la page TV.
export default function ChannelGrid({ channels, countries, label = "une chaîne", emptyText = "Aucune chaîne pour ce filtre." }) {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [active, setActive] = useState(null);
  const { toggle, isFav } = useFavorites();
  const q = normalize(useDeferredValue(search).trim());
  const closePlayer = useCallback(() => setActive(null), []);

  const usedCountries = useMemo(() => {
    const used = new Set(channels.map(c => c.country));
    return countries.filter(c => used.has(c.code));
  }, [channels, countries]);

  const filtered = useMemo(() => channels.filter(c =>
    (!country || c.country === country) && (!q || normalize(c.name).includes(q))
  ), [channels, country, q]);

  return (
    <section>
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <input type="search" value={search} onChange={e => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
          placeholder={`Rechercher ${label}…`} aria-label={`Rechercher ${label}`}
          className="flex-1 min-w-[200px] bg-card border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gold" />
        <select value={country} onChange={e => { setCountry(e.target.value); setVisible(PAGE_SIZE); }} aria-label="Pays"
          className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold max-w-full">
          <option value="">Tous les pays ({channels.length})</option>
          {usedCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      {filtered.length === 0 && <p className="text-dim text-sm text-center py-10">{emptyText}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filtered.slice(0, visible).map((c, i) => (
          <ChannelCard key={c.id} channel={c} index={i + 1} onSelect={setActive} isFavorite={isFav(c.id)} onFavorite={toggle} />
        ))}
      </div>
      {visible < filtered.length && (
        <button onClick={() => setVisible(v => v + PAGE_SIZE)} className="block mx-auto mt-6 border border-gold text-gold font-mono text-sm px-6 py-2.5 rounded-lg hover:bg-gold/10">
          Charger plus ({filtered.length - visible} restantes)
        </button>
      )}
      {active && <Player channel={active} onClose={closePlayer} />}
    </section>
  );
}
