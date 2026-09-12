'use client';

import { useState } from 'react';
import ChannelCard from './ChannelCard';
import Player from './Player';
import { useFavorites } from '@/hooks/useFavorites';

// Aperçu "En direct" de la page d'accueil. Reprend exactement le même
// comportement de clic (ouverture du lecteur) que TvApp sur /tv, pour que
// l'aperçu ne soit pas une impasse — cliquer une chaîne ici doit fonctionner
// comme sur la page complète.
export default function HomeChannelsPreview({ channels }) {
  const [active, setActive] = useState(null);
  const { toggle, isFav } = useFavorites();

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 mb-10">
        {channels.map((c, i) => (
          <ChannelCard
            key={c.id}
            channel={c}
            index={i + 1}
            onSelect={() => setActive(c)}
            isFavorite={isFav(c.id)}
            onFavorite={toggle}
          />
        ))}
      </div>
      {active && <Player channel={active} onClose={() => setActive(null)} />}
    </>
  );
}
