'use client';

import { useMemo, useState } from 'react';
import ChannelCard from './ChannelCard';
import Player from './Player';
import { useFavorites } from '@/hooks/useFavorites';

const PAGE_SIZE = 60;

export default function TvApp({ channels, countries, categories, sportCount }) {
  const [search,setSearch]=useState('');
  const [country,setCountry]=useState('');
  const [category,setCategory]=useState('');
  const [includeSport,setIncludeSport]=useState(false);
  const [visibleCount,setVisibleCount]=useState(PAGE_SIZE);
  const [active,setActive]=useState(null);
  const { favs, toggle, isFav } = useFavorites();

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return channels.filter(c=>{
      if(country && c.country!==country) return false;
      if(category && !c.categories.includes(category)) return false;
      if(!category && !includeSport && c.pureSport) return false;
      return !q || c.name.toLowerCase().includes(q);
    });
  },[channels,search,country,category,includeSport]);

  return <div>
    <header className="border-b border-border px-6 pt-10 pb-7 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <span className="font-mono text-xs bg-red text-white font-semibold px-2 py-1 rounded tracking-wider">LIVE·01</span>
        <h1 className="font-display text-5xl md:text-6xl tracking-wide leading-none mt-2">STREAM<span className="text-gold">TV</span></h1>
        <p className="text-dim text-sm max-w-2xl leading-relaxed mt-2">
          TV en direct, sport, anime et films dans une interface unique. Les chaînes live sont
          référencées depuis l'annuaire ouvert <b className="text-white">iptv-org</b> sans hébergement des flux.
        </p>
        <div className="flex gap-7 flex-wrap font-mono mt-5">
          <Stat label="chaînes" value={channels.length}/><Stat label="affichées" value={filtered.length}/><Stat label="pays" value={countries.length}/><Stat label="sport" value={sportCount}/>
        </div>
      </div>
    </header>
    <div className="max-w-6xl mx-auto px-6 mt-6 flex flex-wrap gap-3 items-center">
      <input value={search} onChange={e=>{setSearch(e.target.value);setVisibleCount(PAGE_SIZE)}} placeholder="Rechercher une chaîne…" className="flex-1 min-w-[220px] bg-card border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-gold"/>
      <select value={country} onChange={e=>{setCountry(e.target.value);setVisibleCount(PAGE_SIZE)}} className="bg-card border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-gold">
        <option value="">Tous les pays</option>{countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
      <select value={category} onChange={e=>{setCategory(e.target.value);setVisibleCount(PAGE_SIZE)}} className="bg-card border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-gold">
        <option value="">Toutes catégories</option>{categories.filter(c=>c!=='sports').map(c=><option key={c} value={c}>{c[0].toUpperCase()+c.slice(1)}</option>)}<option value="sports">Sport uniquement</option>
      </select>
      <label className="flex items-center gap-2 text-xs text-dim font-mono cursor-pointer"><input type="checkbox" checked={includeSport} onChange={e=>{setIncludeSport(e.target.checked);setVisibleCount(PAGE_SIZE)}}/> Inclure le sport ({sportCount})</label>
    </div>
    <main className="max-w-6xl mx-auto px-6 pb-16 mt-6">
      {filtered.length===0?<p className="text-dim font-mono text-sm text-center py-16">Aucune chaîne ne correspond à ces filtres.</p>:
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filtered.slice(0,visibleCount).map((c,i)=><ChannelCard key={c.id} channel={c} index={i+1} onSelect={()=>setActive(c)} isFavorite={isFav(c.id)} onFavorite={toggle}/>)}
      </div>}
      {visibleCount<filtered.length&&<button onClick={()=>setVisibleCount(v=>v+PAGE_SIZE)} className="block mx-auto mt-7 border border-gold text-gold font-mono text-sm px-6 py-2.5 rounded-lg hover:bg-gold/10">Charger plus</button>}
    </main>
    <footer className="max-w-6xl mx-auto px-6 pb-12 pt-5 border-t border-border text-dim text-xs leading-relaxed">
      StreamTV ne stocke ni n'héberge les flux. Les contenus sont référencés à partir de sources publiques et la blocklist officielle d'iptv-org est appliquée côté serveur.
    </footer>
    {active&&<Player channel={active} onClose={()=>setActive(null)}/>}
  </div>;
}
function Stat({label,value}){return <div><b className="block text-2xl text-gold">{value.toLocaleString('fr-FR')}</b><span className="text-[11px] text-dim uppercase tracking-wide">{label}</span></div>}
