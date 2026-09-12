'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import UniversalPlayer from '@/components/UniversalPlayer';

export default function DzriTVWatchPage() {
  const searchParams = useSearchParams();
  const matchUrl = searchParams.get('url');
  const [streamData, setStreamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!matchUrl) return;
    async function fetchStream() {
      try {
        const res = await fetch(`/api/dzritv/stream?url=${encodeURIComponent(matchUrl)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.sources.length === 0) throw new Error('Aucun flux trouvé');
        setStreamData(data);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }
    fetchStream();
  }, [matchUrl]);

  if (!matchUrl) return <div className="p-10 text-center text-dim">Aucun match sélectionné</div>;
  if (loading) return <div className="max-w-3xl mx-auto p-10 text-center text-dim">Extraction du flux...</div>;
  if (error) return (
    <div className="max-w-3xl mx-auto p-10">
      <div className="p-5 rounded-xl border border-red/20 bg-red/5">
        <div className="text-sm font-medium text-red mb-2">Impossible de charger le flux</div>
        <div className="text-xs text-dim">{error}</div>
        <a href={matchUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs underline text-dim">Ouvrir sur dzritv.com →</a>
      </div>
    </div>
  );

  const bestSource = streamData.sources.find(s => s.type === 'hls') || streamData.sources.find(s => s.type === 'iframe') || streamData.sources[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-4">
        <a href="/dzritv" className="text-sm text-dim">← Retour aux matchs</a>
      </div>
      <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-black">
        <UniversalPlayer source={bestSource.url} type={bestSource.type === 'hls' ? 'hls' : 'iframe'} title="Match en direct" />
      </div>
      {streamData.sources.length > 1 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-dim mb-2">Sources alternatives</div>
          <div className="flex gap-2 flex-wrap">
            {streamData.sources.map((src, i) => (
              <button key={i} className="px-3 py-1.5 rounded-md border border-border bg-transparent text-xs text-dim">
                {src.type} {src.quality !== 'auto' ? `(${src.quality})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 p-2.5 rounded-lg bg-card text-xs text-dim/70">
        Source : dzritv.com — Ce lien expire rapidement. Rafraîchissez si le flux coupe.
      </div>
    </div>
  );
}
