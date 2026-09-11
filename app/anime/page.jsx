'use client';
import { useState } from 'react';
import AnimePlayer from '@/components/AnimePlayer';

export default function AnimePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const res = await fetch(`/api/anime/catalog?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results || []);
    setLoading(false);
  }

  async function loadEpisodes(url) {
    setLoading(true);
    const res = await fetch(`/api/anime/episode?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    setEpisodes(data.episodes || []);
    setLoading(false);
  }

  return (
    <main style={{ maxWidth:800, margin:'0 auto', padding:24 }}>
      <h1 style={{ fontSize:24, fontWeight:500, marginBottom:16 }}>Anime</h1>
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un anime..." style={{ flex:1, padding:'8px 12px', borderRadius:8, border:'1px solid var(--kimi-color-border)', background:'var(--kimi-color-surface)', color:'var(--kimi-color-text-primary)' }} />
        <button onClick={search} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--kimi-color-border)', background:'var(--kimi-color-text-primary)', color:'var(--kimi-color-surface)', cursor:'pointer' }}>Rechercher</button>
      </div>

      {results.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <h2 style={{ fontSize:16, fontWeight:500, marginBottom:12 }}>Résultats</h2>
          {results.map(r => (
            <button key={r.url} onClick={() => loadEpisodes(r.url)} style={{ display:'block', width:'100%', textAlign:'left', padding:10, marginBottom:6, borderRadius:8, border:'1px solid var(--kimi-color-border)', background:'transparent', color:'var(--kimi-color-text-primary)', cursor:'pointer' }}>
              {r.title}
            </button>
          ))}
        </div>
      )}

      {episodes.length > 0 && (
        <div>
          <h2 style={{ fontSize:16, fontWeight:500, marginBottom:12 }}>Épisodes</h2>
          {episodes.map((ep, i) => (
            <div key={i} style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:6 }}>Épisode {i + 1} — {ep.provider}</div>
              <AnimePlayer embedUrl={ep.embed} title={`Épisode ${i + 1}`} />
            </div>
          ))}
        </div>
      )}

      {loading && <div style={{ textAlign:'center', padding:20, color:'var(--kimi-color-text-quaternary)' }}>Chargement...</div>}
    </main>
  );
}
