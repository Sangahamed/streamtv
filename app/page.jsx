import Link from 'next/link';
import { getLiveTvData } from '@/lib/iptv';
import { getMovies } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import HomeChannelsPreview from '@/components/HomeChannelsPreview';

export default async function HomePage() {
  const tvPromise = getLiveTvData().catch(() => ({channels:[],countries:[],categories:[],sportCount:0}));
  const moviePromise = process.env.TMDB_API_KEY ? getMovies('popular',1).catch(()=>({results:[]})) : Promise.resolve({results:[]});
  const [tv,movies] = await Promise.all([tvPromise,moviePromise]);
  const channels = tv.channels.filter(c=>!c.pureSport).slice(0,8);

  return <main className="max-w-6xl mx-auto px-6 py-10">
    <section className="rounded-2xl border border-border bg-card p-7 md:p-10 mb-10">
      <span className="font-mono text-xs text-gold tracking-widest">ONE PLATFORM · LIVE</span>
      <h1 className="font-display text-6xl md:text-8xl tracking-wide leading-none mt-2">STREAM<span className="text-gold">TV</span></h1>
      <p className="text-dim max-w-2xl mt-3 leading-relaxed">TV live, sport, anime et films — réunis dans une expérience simple, rapide et adaptée au mobile.</p>
      <div className="flex gap-3 mt-6 flex-wrap"><Link href="/tv" className="bg-gold text-bg font-semibold px-5 py-3 rounded-lg">Explorer la TV</Link><Link href="/dzritv" className="border border-border px-5 py-3 rounded-lg text-sm">Voir le sport</Link></div>
    </section>
    <SectionTitle title="📺 En direct" href="/tv"/>
    <HomeChannelsPreview channels={channels} />
    {movies.results?.length>0 && <><SectionTitle title="🎬 Films populaires" href="/films"/><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5"><>{movies.results.slice(0,6).map(m=><MovieCard key={m.id} movie={m}/>)}</></div></>}
  </main>;
}
function SectionTitle({title,href}){return <div className="flex items-center justify-between mb-4"><h2 className="font-display text-2xl tracking-wide">{title}</h2><Link href={href} className="text-xs text-dim hover:text-gold">Voir tout →</Link></div>}
