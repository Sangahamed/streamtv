'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import ChannelCard from './ChannelCard';
import Player from './Player';
import { useFavorites } from '@/hooks/useFavorites';
import { categoryLabel, normalize } from '@/lib/labels';

const PAGE_SIZE = 60;
const ADULT_OPTION = '__adult';

export default function TvApp({ channels: liveChannels, countries: liveCountries, categories, sportCount, offlineCount = 0, adultAvailable = false }) {
  const [search,setSearch]=useState('');
  const [country,setCountry]=useState('');
  const [category,setCategory]=useState('');
  const [includeSport,setIncludeSport]=useState(false);
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  // Chaînes de l'annuaire sans aucun flux, chargées seulement à la demande.
  const [showOffline,setShowOffline]=useState(false);
  const [offline,setOffline]=useState(null);
  const [offlineError,setOfflineError]=useState(false);
  // Mode adulte : confirmation d'âge gardée seulement en mémoire de la page
  // (rien dans le navigateur ni sur le serveur), redemandée à chaque visite.
  const [adultMode,setAdultMode]=useState(false);
  const [ageGate,setAgeGate]=useState(false);
  const [adult,setAdult]=useState(null);
  const [adultError,setAdultError]=useState(false);
  const [visibleCount,setVisibleCount]=useState(PAGE_SIZE);
  const [active,setActive]=useState(null);
  const { favs, toggle, isFav } = useFavorites();

  useEffect(()=>{
    if(!showOffline || offline) return;
    let cancelled=false;
    setOfflineError(false);
    fetch('/api/tv/offline').then(r=>r.ok?r.json():Promise.reject())
      .then(d=>{ if(!cancelled) setOffline(d); })
      .catch(()=>{ if(!cancelled){ setOfflineError(true); setShowOffline(false); } });
    return ()=>{ cancelled=true; };
  },[showOffline,offline]);

  useEffect(()=>{
    if(!adultMode || adult) return;
    let cancelled=false;
    setAdultError(false);
    fetch('/api/tv/adult',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject())
      .then(d=>{ if(!cancelled) setAdult(d.channels||[]); })
      .catch(()=>{ if(!cancelled){ setAdultError(true); setAdultMode(false); } });
    return ()=>{ cancelled=true; };
  },[adultMode,adult]);

  const channels=useMemo(()=>{
    if(adultMode) return adult||[];
    return showOffline&&offline ? [...liveChannels, ...offline.channels] : liveChannels;
  },[liveChannels,showOffline,offline,adultMode,adult]);
  const countries=useMemo(()=>{
    if(adultMode){
      const codes=new Set((adult||[]).map(c=>c.country).filter(Boolean));
      return liveCountries.filter(c=>codes.has(c.code));
    }
    if(!showOffline||!offline) return liveCountries;
    const known=new Set(liveCountries.map(c=>c.code));
    return [...liveCountries, ...offline.countries.filter(c=>!known.has(c.code))]
      .sort((a,b)=>a.name.localeCompare(b.name));
  },[liveCountries,showOffline,offline,adultMode,adult]);
  // La saisie reste fluide même en filtrant ~10 000 chaînes.
  const deferredSearch = useDeferredValue(search);

  // Index de recherche calculé une fois : nom + noms alternatifs, sans accents.
  const searchIndex=useMemo(
    ()=>new Map(channels.map(c=>[c.id, normalize([c.name, ...(c.alt||[])].join(' '))])),
    [channels]
  );

  const sortedCategories=useMemo(
    ()=>categories.filter(c=>c!=='sports').sort((a,b)=>categoryLabel(a).localeCompare(categoryLabel(b),'fr')),
    [categories]
  );

  const filtered=useMemo(()=>{
    const q=normalize(deferredSearch.trim());
    const favIds=favoritesOnly&&!adultMode ? new Set(favs.map(f=>f.id)) : null;
    return channels.filter(c=>{
      if(favIds && !favIds.has(c.id)) return false;
      if(country && c.country!==country) return false;
      if(category && !(c.categories||[]).includes(category)) return false;
      if(!category && !includeSport && c.pureSport && !adultMode) return false;
      return !q || searchIndex.get(c.id).includes(q);
    });
  },[channels,searchIndex,deferredSearch,country,category,includeSport,favoritesOnly,favs,adultMode]);
  const offlineLoading=showOffline&&!offline;

  // Tout changement de filtre repart de la première page.
  useEffect(()=>{ setVisibleCount(PAGE_SIZE); },[deferredSearch,country,category,includeSport,favoritesOnly,showOffline,adultMode]);

  const closePlayer=useCallback(()=>setActive(null),[]);
  const hasFilters=search||country||category||includeSport||favoritesOnly||showOffline||adultMode;
  function resetFilters(){ setSearch(''); setCountry(''); setCategory(''); setIncludeSport(false); setFavoritesOnly(false); setShowOffline(false); setAdultMode(false); }
  // Le 18+ est une entrée discrète du menu des catégories : la choisir ouvre
  // la confirmation d'âge, choisir une autre catégorie quitte le mode adulte.
  function selectCategory(value){
    if(value===ADULT_OPTION){ if(!adultMode) setAgeGate(true); return; }
    if(adultMode){ setAdultMode(false); setCountry(''); }
    setCategory(value);
  }
  function confirmAge(){ setAgeGate(false); setCountry(''); setCategory(''); setAdultMode(true); }
  const adultLoading=adultMode&&!adult;

  return <div>
    <header className="border-b border-border px-4 sm:px-6 pt-10 pb-7 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <span className="font-mono text-xs bg-red text-white font-semibold px-2 py-1 rounded tracking-wider">LIVE·01</span>
        <h1 className="font-display text-5xl md:text-6xl tracking-wide leading-none mt-2">STREAM<span className="text-gold">TV</span></h1>
        <p className="text-dim text-sm max-w-2xl leading-relaxed mt-2">
          TV en direct, sport, anime et films dans une interface unique. Les chaînes live sont
          référencées depuis l&rsquo;annuaire ouvert <b className="text-white">iptv-org</b> sans hébergement des flux.
        </p>
        <div className="flex gap-7 flex-wrap font-mono mt-5">
          <Stat label="chaînes" value={liveChannels.length+(offline?.channels.length??offlineCount)}/><Stat label="avec flux" value={liveChannels.length}/><Stat label="affichées" value={filtered.length}/><Stat label="pays" value={countries.length}/><Stat label="sport" value={sportCount}/>
        </div>
      </div>
    </header>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 flex flex-wrap gap-3 items-center">
      <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une chaîne…" aria-label="Rechercher une chaîne" className="flex-1 min-w-[220px] bg-card border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-gold"/>
      <select value={country} onChange={e=>setCountry(e.target.value)} aria-label="Pays" className="bg-card border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-gold max-w-full">
        <option value="">Tous les pays</option>{countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
      <select value={adultMode?ADULT_OPTION:category} onChange={e=>selectCategory(e.target.value)} aria-label="Catégorie" className="bg-card border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-gold max-w-full">
        <option value="">{includeSport ? 'Toutes catégories' : 'Toutes catégories (hors sport)'}</option>
        {sortedCategories.map(c=><option key={c} value={c}>{categoryLabel(c)}</option>)}
        <option value="sports">Sport uniquement</option>
        {adultAvailable&&<option value={ADULT_OPTION}>Adulte (18+)</option>}
      </select>
      <button onClick={()=>setFavoritesOnly(v=>!v)} aria-pressed={favoritesOnly} className={`border rounded-lg px-3 py-3 text-sm transition ${favoritesOnly?'border-gold text-gold bg-gold/10':'border-border bg-card text-dim hover:text-white'}`}>
        ♥ Favoris ({favs.length})
      </button>
      <label className="flex items-center gap-2 text-xs text-dim font-mono cursor-pointer"><input type="checkbox" checked={includeSport} onChange={e=>setIncludeSport(e.target.checked)} className="accent-[#e8b04b]"/> Inclure le sport ({sportCount})</label>
      <label className="flex items-center gap-2 text-xs text-dim font-mono cursor-pointer"><input type="checkbox" checked={showOffline} onChange={e=>setShowOffline(e.target.checked)} className="accent-[#e8b04b]"/> Afficher les chaînes sans flux ({(offline?.channels.length??offlineCount).toLocaleString('fr-FR')}){offlineLoading&&' · chargement…'}</label>
      {adultLoading&&<span className="text-xs text-dim font-mono">Chargement…</span>}
      {offlineError&&<span className="text-xs text-red font-mono">Impossible de charger les chaînes sans flux. Réessayez.</span>}
      {adultError&&<span className="text-xs text-red font-mono">Impossible de charger les chaînes 18+.</span>}
    </div>
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 mt-6">
      {filtered.length===0?
        <div className="text-dim font-mono text-sm text-center py-16 space-y-3">
          <p>{favoritesOnly && favs.length===0 ? 'Aucun favori pour l’instant : cliquez sur ♡ sur une chaîne.' : 'Aucune chaîne ne correspond à ces filtres.'}</p>
          {hasFilters && <button onClick={resetFilters} className="text-gold underline">Réinitialiser les filtres</button>}
        </div>:
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filtered.slice(0,visibleCount).map((c,i)=><ChannelCard key={c.id} channel={c} index={i+1} onSelect={setActive} isFavorite={isFav(c.id)} onFavorite={c.adult?undefined:toggle}/>)}
      </div>}
      {visibleCount<filtered.length&&<button onClick={()=>setVisibleCount(v=>v+PAGE_SIZE)} className="block mx-auto mt-7 border border-gold text-gold font-mono text-sm px-6 py-2.5 rounded-lg hover:bg-gold/10">Charger plus ({(filtered.length-visibleCount).toLocaleString('fr-FR')} restantes)</button>}
    </main>
    <footer className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 pt-5 border-t border-border text-dim text-xs leading-relaxed">
      StreamTV ne stocke ni n&rsquo;héberge les flux. Les contenus sont référencés à partir de sources publiques et la blocklist officielle d&rsquo;iptv-org est appliquée côté serveur.
    </footer>
    {active&&<Player channel={active} onClose={closePlayer}/>}
    {ageGate&&<AgeGate onConfirm={confirmAge} onCancel={()=>setAgeGate(false)}/>}
  </div>;
}
function AgeGate({onConfirm,onCancel}){
  useEffect(()=>{
    const onKey=e=>{ if(e.key==='Escape') onCancel(); };
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[onCancel]);
  return <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={e=>{ if(e.target===e.currentTarget) onCancel(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="age-title" className="w-full max-w-md bg-card border border-border rounded-xl p-6 space-y-4">
      <h2 id="age-title" className="font-display text-3xl tracking-wide">Contenu <span className="text-red">18+</span></h2>
      <p className="text-sm text-dim leading-relaxed">
        Cette section contient des chaînes pour adultes. Elle est réservée aux personnes majeures.
        Aucune donnée n&rsquo;est enregistrée : ce choix est oublié dès que vous quittez la page,
        et ces chaînes ne sont ni ajoutées aux favoris ni mémorisées.
      </p>
      <div className="flex gap-3 justify-end">
        <button autoFocus onClick={onCancel} className="border border-border rounded-lg px-4 py-2 text-sm hover:border-dim">Annuler</button>
        <button onClick={onConfirm} className="border border-red text-red rounded-lg px-4 py-2 text-sm hover:bg-red/10">J&rsquo;ai 18 ans ou plus</button>
      </div>
    </div>
  </div>;
}
function Stat({label,value}){return <div><b className="block text-2xl text-gold">{value.toLocaleString('fr-FR')}</b><span className="text-[11px] text-dim uppercase tracking-wide">{label}</span></div>}
