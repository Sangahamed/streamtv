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

  if (!matchUrl) return <div style={{ padding:40, textAlign:'center' }}>Aucun match sélectionné</div>;
  if (loading) return <div style={{ maxWidth:800, margin:'0 auto', padding:40, textAlign:'center' }}>Extraction du flux...</div>;
  if (error) return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:40 }}>
      <div style={{ padding:20, borderRadius:10, border:'1px solid color-mix(in srgb, var(--kimi-color-danger) 20%, transparent)', background:'color-mix(in srgb, var(--kimi-color-danger) 5%, transparent)' }}>
        <div style={{ fontSize:14, fontWeight:500, color:'var(--kimi-color-danger)', marginBottom:8 }}>Impossible de charger le flux</div>
        <div style={{ fontSize:12, color:'var(--kimi-color-text-secondary)' }}>{error}</div>
        <a href={matchUrl} target="_blank" rel="noopener noreferrer" style={{ display:'inline-block', marginTop:12, fontSize:12, textDecoration:'underline' }}>Ouvrir sur dzritv.com →</a>
      </div>
    </div>
  );

  const bestSource = streamData.sources.find(s => s.type === 'hls') || streamData.sources.find(s => s.type === 'iframe') || streamData.sources[0];

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>
      <div style={{ marginBottom:16 }}>
        <a href="/dzritv" style={{ fontSize:13, color:'var(--kimi-color-text-secondary)', textDecoration:'none' }}>← Retour aux matchs</a>
      </div>
      <div style={{ width:'100%', aspectRatio:'16/9', borderRadius:12, overflow:'hidden', border:'1px solid var(--kimi-color-border)', background:'#000' }}>
        <UniversalPlayer source={bestSource.url} type={bestSource.type === 'hls' ? 'hls' : 'iframe'} title="Match en direct" />
      </div>
      {streamData.sources.length > 1 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--kimi-color-text-secondary)', marginBottom:8 }}>Sources alternatives</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {streamData.sources.map((src, i) => (
              <button key={i} style={{ padding:'5px 12px', borderRadius:6, border:'1px solid var(--kimi-color-border)', background:'transparent', fontSize:11, color:'var(--kimi-color-text-secondary)', cursor:'pointer' }}>
                {src.type} {src.quality !== 'auto' ? `(${src.quality})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop:16, padding:10, borderRadius:8, background:'var(--kimi-color-surface-muted)', fontSize:11, color:'var(--kimi-color-text-quaternary)' }}>
        Source : dzritv.com — Ce lien expire rapidement. Rafraîchissez si le flux coupe.
      </div>
    </div>
  );
}
