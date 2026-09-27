import { notFound } from 'next/navigation';
import { adultEnabled } from '@/lib/iptv';
import AdultList from '@/components/AdultList';

// Liste des chaînes 18+ qui fonctionnent, chacune avec son lien direct
// (/tv/adulte?c=<id>). N'existe que si ENABLE_ADULT_CHANNELS=1 ; la liste
// elle-même n'est chargée qu'après la confirmation d'âge.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chaînes 18+',
  robots: { index: false, follow: false },
};

export default function AdultPage() {
  if (!adultEnabled()) notFound();
  return <AdultList />;
}
