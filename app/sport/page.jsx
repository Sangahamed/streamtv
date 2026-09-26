import Link from 'next/link';
import { getLiveTvData, SPORT_CATEGORY } from '@/lib/iptv';
import { getMatches, isLive } from '@/lib/football';
import ChannelGrid from '@/components/ChannelGrid';

export const metadata = { title: 'Sport TV & résultats — StreamTV' };
// Voir app/tv/page.jsx : catalogue mis en cache par lib/cache.js.
export const dynamic = 'force-dynamic';

const TZ = 'Africa/Algiers';
const STATUS = { FINISHED: 'Terminé', POSTPONED: 'Reporté', CANCELLED: 'Annulé', SUSPENDED: 'Suspendu', PAUSED: 'Mi-temps' };
const TABS = [
  { id: 'chaines', label: '📺 Chaînes sport en direct' },
  { id: 'matchs', label: '⚽ Matchs & résultats' },
];

export default async function SportPage({ searchParams }) {
  const params = await searchParams;
  const tab = params?.tab === 'matchs' ? 'matchs' : 'chaines';

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-4xl tracking-wide">SPORT <span className="text-gold">TV</span></h1>
      <p className="text-dim text-sm mt-1 mb-5">Chaînes sport gratuites diffusées en clair, calendrier et scores en direct.</p>
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <Link key={t.id} href={`/sport?tab=${t.id}`}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium ${t.id === tab ? 'bg-gold text-bg border-gold' : 'border-border text-dim hover:text-white'}`}>
            {t.label}
          </Link>
        ))}
      </div>
      {tab === 'chaines' ? <ChannelsTab /> : <MatchesTab />}
    </main>
  );
}

async function ChannelsTab() {
  const data = await getLiveTvData();
  const channels = data.channels.filter(c => (c.categories || []).includes(SPORT_CATEGORY));
  return <ChannelGrid channels={channels} countries={data.countries} label="une chaîne sport" emptyText="Aucune chaîne sport pour ce filtre." />;
}

async function MatchesTab() {
  let matches = [];
  try {
    matches = await getMatches();
  } catch (err) {
    return <p className="text-red text-sm text-center py-10">Résultats indisponibles ({err.message}).</p>;
  }
  if (!matches.length) return <p className="text-dim text-sm text-center py-10">Aucun match programmé sur les prochains jours.</p>;

  // Regroupement par jour puis par compétition ; matchs en cours mis en avant.
  const dayKey = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
  const live = matches.filter(m => isLive(m.status));
  const days = new Map();
  for (const m of matches) {
    const day = dayKey(m.date);
    if (!days.has(day)) days.set(day, new Map());
    const comps = days.get(day);
    if (!comps.has(m.competition)) comps.set(m.competition, { emblem: m.emblem, matches: [] });
    comps.get(m.competition).matches.push(m);
  }

  return (
    <div className="space-y-8">
      {live.length > 0 && (
        <section>
          <h2 className="font-display text-2xl tracking-wide mb-3 text-red">● En direct ({live.length})</h2>
          <MatchList matches={live} />
        </section>
      )}
      {[...days].map(([day, comps]) => (
        <section key={day}>
          <h2 className="font-display text-2xl tracking-wide mb-3 capitalize">{day}</h2>
          <div className="space-y-4">
            {[...comps].map(([name, comp]) => (
              <div key={name}>
                <div className="px-3.5 py-2 rounded-lg bg-gold/10 text-gold text-sm font-medium mb-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {comp.emblem && <img src={comp.emblem} alt="" className="w-5 h-5 object-contain" />}
                  {name}
                </div>
                <MatchList matches={comp.matches} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="text-[11px] text-dim/70">
        Données : football-data.org · heures d&rsquo;Alger. Pour regarder un match, consultez le diffuseur officiel de la compétition dans votre pays.
      </p>
    </div>
  );
}

function MatchList({ matches }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {matches.map((m, i) => {
        const liveNow = isLive(m.status);
        return (
          <div key={m.id} className={`flex items-center px-3 sm:px-4 py-3 gap-2 sm:gap-3 ${i < matches.length - 1 ? 'border-b border-border' : ''} ${liveNow ? 'bg-red/5' : ''}`}>
            <div className="w-[64px] shrink-0 text-xs tabular-nums">
              {liveNow
                ? <span className="text-red font-medium">● {m.minute ? `${m.minute}'` : 'LIVE'}</span>
                : <span className="text-dim">{STATUS[m.status] || new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })}</span>}
            </div>
            <Team name={m.home} crest={m.homeCrest} right />
            <div className="w-14 text-center font-mono text-sm font-semibold shrink-0">
              {m.scoreHome !== null ? `${m.scoreHome} - ${m.scoreAway}` : <span className="text-dim">vs</span>}
            </div>
            <Team name={m.away} crest={m.awayCrest} />
          </div>
        );
      })}
    </div>
  );
}

function Team({ name, crest, right }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = crest && <img src={crest} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />;
  return (
    <div className={`flex-1 min-w-0 flex items-center gap-2 text-sm ${right ? 'justify-end text-right' : ''}`}>
      {right ? <><span className="truncate">{name}</span>{img}</> : <>{img}<span className="truncate">{name}</span></>}
    </div>
  );
}
