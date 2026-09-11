import Link from 'next/link';

export const metadata = {
  title: 'Matchs en direct — DZriTV',
  description: 'Tous les matchs de football et sports en direct'
};

export default async function DzriTVPage({ searchParams }) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  const sport = searchParams?.sport || 'football';

  const res = await fetch(`${baseUrl}/api/dzritv/matches?sport=${sport}`, {
    next: { revalidate: 300 }
  });
  const data = await res.json();
  const competitions = data.competitions || [];

  return (
    <main style={{ maxWidth:960, margin:'0 auto', padding:'24px 16px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:500 }}>Matchs en direct</h1>
        <div style={{ fontSize:13, color:'var(--kimi-color-text-secondary)', marginTop:4 }}>
          Source : {data.source || 'inconnue'} {data.fallback && '(fallback)'} {data.cached && '— cache'}
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {['football', 'basketball', 'tennis', 'volleyball', 'ice-hockey'].map(s => (
          <Link key={s} href={`/dzritv?sport=${s}`} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--kimi-color-border)', fontSize:12, fontWeight:500, textDecoration:'none', color:'var(--kimi-color-text-secondary)', textTransform:'capitalize', background: sport === s ? 'var(--kimi-color-text-primary)' : 'transparent', color: sport === s ? 'var(--kimi-color-surface)' : 'var(--kimi-color-text-secondary)' }}>
            {s.replace('-', ' ')}
          </Link>
        ))}
      </div>

      {competitions.length === 0 && (
        <div style={{ textAlign:'center', padding:60, color:'var(--kimi-color-text-quaternary)' }}>
          <div style={{ fontSize:14, marginBottom:8 }}>Aucun match trouvé</div>
          <div style={{ fontSize:12 }}>Toutes les sources sont temporairement indisponibles</div>
        </div>
      )}

      {competitions.map(comp => (
        <div key={comp.name} style={{ marginBottom:20 }}>
          <div style={{ padding:'8px 14px', borderRadius:8, background:'color-mix(in srgb, var(--kimi-chart-1) 10%, transparent)', color:'var(--kimi-chart-1)', fontSize:13, fontWeight:500, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
            <span>⚽</span>{comp.name}
          </div>
          <div style={{ border:'1px solid var(--kimi-color-border)', borderRadius:10, overflow:'hidden' }}>
            {comp.matches.map((match, idx) => (
              <div key={match.id} style={{ display:'flex', alignItems:'center', padding:'12px 16px', gap:12, borderBottom: idx < comp.matches.length - 1 ? '1px solid var(--kimi-color-border)' : 'none', background: match.isLive ? 'color-mix(in srgb, var(--kimi-color-danger) 3%, transparent)' : 'transparent' }}>
                <div style={{ width:90, flexShrink:0 }}>
                  {match.dateTime ? (
                    <div style={{ fontSize:12, color:'var(--kimi-color-text-secondary)', fontVariantNumeric:'tabular-nums' }}>
                      {new Date(match.dateTime).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
                    </div>
                  ) : (
                    <div style={{ fontSize:11, color:'var(--kimi-color-text-quaternary)' }}>{match.dateRaw || '—'}</div>
                  )}
                  {match.isLive && (
                    <div style={{ fontSize:10, color:'var(--kimi-color-danger)', fontWeight:500, marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--kimi-color-danger)', display:'inline-block' }}></span>LIVE
                    </div>
                  )}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {match.homeTeam} <span style={{ color:'var(--kimi-color-text-quaternary)', margin:'0 6px' }}>—</span> {match.awayTeam}
                  </div>
                </div>
                <div style={{ width:100, flexShrink:0, textAlign:'right' }}>
                  {match.matchUrl ? (
                    <Link href={`/dzritv/watch?url=${encodeURIComponent(match.matchUrl)}`} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, padding:'5px 12px', borderRadius:6, background:'color-mix(in srgb, var(--kimi-color-positive) 10%, transparent)', color:'var(--kimi-color-positive)', fontWeight:500, textDecoration:'none' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg>Voir
                    </Link>
                  ) : (
                    <span style={{ fontSize:11, color:'var(--kimi-color-text-quaternary)' }}>Pas de lien</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
