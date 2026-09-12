import Link from 'next/link';
import DzriTvView from '@/components/DzriTvView';
import { SPORT_SLUG_MAP } from '@/lib/dzritv-sports';

export const metadata = {
  title: 'Matchs en direct — DZriTV',
  description: 'Tous les matchs de football et sports en direct'
};

export default async function DzriTVPage({ searchParams }) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  const params = await searchParams;
  const sport = params?.sport || 'football';
  const view = params?.view === 'live' ? 'live' : 'cards';

  const res = await fetch(`${baseUrl}/api/dzritv/matches?sport=${sport}`, {
    next: { revalidate: 300 }
  });
  const data = await res.json();
  const competitions = data.competitions || [];
  const iframeSrc = `https://dzritv.com/sport/${SPORT_SLUG_MAP[sport] || sport}`;

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Matchs en direct</h1>
          <div className="text-xs text-dim mt-1">
            Source : {data.source || 'inconnue'} {data.fallback && '(fallback)'} {data.cached && '— cache'}
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <Link
            href={`/dzritv?sport=${sport}&view=cards`}
            className={`px-3 py-1.5 rounded-lg border border-border font-medium ${view === 'cards' ? 'bg-gold text-bg border-gold' : 'text-dim'}`}
          >
            Vue StreamTV
          </Link>
          <Link
            href={`/dzritv?sport=${sport}&view=live`}
            className={`px-3 py-1.5 rounded-lg border border-border font-medium ${view === 'live' ? 'bg-gold text-bg border-gold' : 'text-dim'}`}
          >
            Vue intégrée (site officiel)
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {['football', 'basketball', 'tennis', 'volleyball', 'ice-hockey'].map(s => (
          <Link
            key={s}
            href={`/dzritv?sport=${s}&view=${view}`}
            className={`px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium capitalize ${sport === s ? 'bg-white text-bg' : 'text-dim'}`}
          >
            {s.replace('-', ' ')}
          </Link>
        ))}
      </div>

      {view === 'live' ? (
        <DzriTvView src={iframeSrc} />
      ) : (
        <>
          {competitions.length === 0 && (
            <div className="text-center py-16 text-dim">
              <div className="text-sm mb-2">Aucun match trouvé</div>
              <div className="text-xs">Toutes les sources sont temporairement indisponibles</div>
            </div>
          )}

          {competitions.map(comp => (
            <div key={comp.name} className="mb-5">
              <div className="px-3.5 py-2 rounded-lg bg-gold/10 text-gold text-sm font-medium mb-2 flex items-center gap-2">
                <span>⚽</span>{comp.name}
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                {comp.matches.map((match, idx) => (
                  <div
                    key={match.id}
                    className={`flex items-center px-4 py-3 gap-3 ${idx < comp.matches.length - 1 ? 'border-b border-border' : ''} ${match.isLive ? 'bg-red/5' : ''}`}
                  >
                    <div className="w-[90px] shrink-0">
                      {match.dateTime ? (
                        <div className="text-xs text-dim tabular-nums">
                          {new Date(match.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      ) : (
                        <div className="text-xs text-dim/60">{match.dateRaw || '—'}</div>
                      )}
                      {match.isLive && (
                        <div className="text-[10px] text-red font-medium mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red inline-block" />LIVE
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {match.homeTeam} <span className="text-dim/60 mx-1.5">—</span> {match.awayTeam}
                      </div>
                    </div>
                    <div className="w-[100px] shrink-0 text-right">
                      {match.matchUrl ? (
                        <Link
                          href={`/dzritv/watch?url=${encodeURIComponent(match.matchUrl)}`}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gold/10 text-gold font-medium"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="5 3 19 12 5 21 5 3" /></svg>Voir
                        </Link>
                      ) : (
                        <span className="text-xs text-dim/60">Pas de lien</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
