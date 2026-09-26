'use client';

import { useFavorites } from '@/hooks/useFavorites';

// Bouton favori réutilisable pour les contenus hors chaînes TV (films…).
export default function FavoriteButton({ item }) {
  const { toggle, isFav, loaded } = useFavorites();
  const active = isFav(item.id);
  return (
    <button
      onClick={() => toggle(item)}
      disabled={!loaded}
      aria-pressed={active}
      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
        active ? 'border-gold text-gold bg-gold/10' : 'border-border text-dim hover:text-white hover:border-gold'
      }`}
    >
      {active ? '♥ Dans mes favoris' : '♡ Ajouter aux favoris'}
    </button>
  );
}
