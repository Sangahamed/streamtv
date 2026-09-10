'use client';

import { useMemo, useState } from 'react';
import ChannelCard from './ChannelCard';
import Player from './Player';

const PAGE_SIZE = 60;

export default function TvApp({ channels, countries, categories, sportCount }) {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('DZ');
  const [category, setCategory] = useState('');
  const [includeSport, setIncludeSport] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [active, setActive] = useState(null);

  const nonSportCategories = useMemo(
    () => categories.filter((c) => c !== 'sports'),
    [categories]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter((c) => {
      if (country && c.country !== country) return false;

      if (category) {
        if (!c.categories.includes(category)) return false;
      } else if (!includeSport && c.pureSport) {
        // Par défaut on masque les chaînes 100% sport : DZTV les couvre déjà.
        return false;
      }

      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [channels, search, country, category, includeSport]);

  const visible = filtered.slice(0, visibleCount);

  function resetPaging() {
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div>
      <header className="border-b border-border px-6 pt-9 pb-5 relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <span className="font-mono text-xs bg-red text-white font-semibold px-2 py-1 rounded tracking-wider">
            SIG·01
          </span>
          <h1 className="font-display text-5xl md:text-6xl tracking-wide leading-none mt-2 mb-1">
            DZTV <span className="text-gold">LIVE</span>
          </h1>
          <p className="text-dim text-sm max-w-xl leading-relaxed mb-4">
            DZTV officielle ne diffuse que du sport en direct. Ici : le reste — actu,
            cinéma, divertissement, musique, enfants et bien plus — via des chaînes
            légalement diffusées en clair, agrégées depuis l&rsquo;annuaire ouvert{' '}
            <b className="text-white">iptv-org</b>.
          </p>
          <div className="flex gap-6 flex-wrap font-mono">
            <Stat label="chaînes chargées" value={channels.length} />
            <Stat label="affichées" value={filtered.length} />
            <Stat label="pays" value={countries.length} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 mt-6 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPaging();
          }}
          placeholder="Rechercher une chaîne (ex: France 24, Al Jazeera, MBC...)"
          className="flex-1 min-w-[220px] bg-card border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-gold"
        />
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            resetPaging();
          }}
          className="bg-card border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-gold"
        >
          <option value="">Tous les pays</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            resetPaging();
          }}
          className="bg-card border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-gold"
        >
          <option value="">Toutes catégories (hors sport)</option>
          {nonSportCategories.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
          <option value="sports">Sport uniquement</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-dim font-mono cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeSport}
            onChange={(e) => {
              setIncludeSport(e.target.checked);
              resetPaging();
            }}
          />
          Inclure le sport ({sportCount})
        </label>
      </div>

      <main className="max-w-6xl mx-auto px-6 pb-16 mt-6">
        {filtered.length === 0 ? (
          <p className="text-dim font-mono text-sm text-center py-16">
            Aucune chaîne ne correspond à ces filtres.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {visible.map((c, i) => (
              <ChannelCard key={c.id} channel={c} index={i + 1} onSelect={() => setActive(c)} />
            ))}
          </div>
        )}

        {visibleCount < filtered.length && (
          <button
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="block mx-auto mt-7 border border-gold text-gold font-mono text-sm px-6 py-2.5 rounded-lg hover:bg-gold/10"
          >
            Charger plus de chaînes
          </button>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-12 pt-5 border-t border-border text-dim text-xs leading-relaxed">
        Cette application n&rsquo;héberge ni ne diffuse aucun flux : elle référence des
        chaînes déjà librement diffusées en clair par leurs éditeurs, listées dans
        l&rsquo;annuaire communautaire open-source iptv-org/iptv. Les chaînes signalées pour
        atteinte aux droits d&rsquo;auteur (blocklist officielle du projet) sont
        automatiquement exclues. Le sport est masqué par défaut pour se concentrer sur ce
        que DZTV ne propose pas.
      </footer>

      {active && <Player channel={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <b className="block text-2xl text-gold">{value.toLocaleString('fr-FR')}</b>
      <span className="text-[11px] text-dim uppercase tracking-wide">{label}</span>
    </div>
  );
}
