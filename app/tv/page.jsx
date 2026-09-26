import { adultEnabled, getLiveTvData, getOfflineChannels } from '@/lib/iptv';
import TvApp from '@/components/TvApp';

// Rendu à la demande : les sources iptv-org sont lues en no-store (trop
// grosses pour le cache Next) et le résultat est mis en cache 1 h par
// lib/cache.js. Sans cette ligne, le build tente un rendu statique qui échoue.
export const dynamic = 'force-dynamic';

export default async function TVPage() {
  const [data, offline] = await Promise.all([
    getLiveTvData(),
    getOfflineChannels().catch(() => null),
  ]);
  return <TvApp channels={data.channels} countries={data.countries} categories={data.categories} sportCount={data.sportCount} offlineCount={offline?.channels.length || 0} adultAvailable={adultEnabled()} />;
}
