import { getLiveTvData } from '@/lib/iptv';
import TvApp from '@/components/TvApp';

export const revalidate = 3600;

export default async function TVPage() {
  const data = await getLiveTvData();
  return <TvApp channels={data.channels} countries={data.countries} categories={data.categories} sportCount={data.sportCount} />;
}
