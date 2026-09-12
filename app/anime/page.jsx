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
    <main className="max-w-3xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-semibold mb-4">Anime</h1>
      <div className="flex gap-2 mb-5">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un anime..."
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-white"
        />
        <button onClick={search} className="px-4 py-2 rounded-lg border border-border bg-gold text-bg font-medium">Rechercher</button>
      </div>

      {results.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-medium mb-3">Résultats</h2>
          {results.map(r => (
            <button
              key={r.url}
              onClick={() => loadEpisodes(r.url)}
              className="block w-full text-left p-2.5 mb-1.5 rounded-lg border border-border bg-transparent text-white"
            >
              {r.title}
            </button>
          ))}
        </div>
      )}

      {episodes.length > 0 && (
        <div>
          <h2 className="text-base font-medium mb-3">Épisodes</h2>
          {episodes.map((ep, i) => (
            <div key={i} className="mb-4">
              <div className="text-sm font-medium mb-1.5">Épisode {i + 1} — {ep.provider}</div>
              <AnimePlayer embedUrl={ep.embed} title={`Épisode ${i + 1}`} />
            </div>
          ))}
        </div>
      )}

      {loading && <div className="text-center p-5 text-dim/60">Chargement...</div>}
    </main>
  );
}
