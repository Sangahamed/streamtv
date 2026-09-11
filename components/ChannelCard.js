'use client';

import { useState } from 'react';
import { flagEmoji } from '@/lib/flag';

export default function ChannelCard({ channel, index, onSelect, isFavorite, onFavorite }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const initials = channel.name.slice(0, 3).toUpperCase();

  return (
    <div className="relative text-left bg-card border border-border rounded-xl p-3.5 hover:bg-cardHover hover:border-gold hover:-translate-y-0.5 transition">
      <button onClick={onSelect} className="w-full text-left">
        <div className="flex justify-between items-start">
          <span className="font-mono text-[11px] text-dim">CH {String(index || 1).padStart(3, '0')}</span>
          <span>{flagEmoji(channel.country)}</span>
        </div>
        <div className="w-full h-16 flex items-center justify-center bg-bg rounded-md overflow-hidden mt-2">
          {channel.logo && !logoFailed ? (
            <img src={channel.logo} alt="" loading="lazy" onError={() => setLogoFailed(true)} className="max-w-[88%] max-h-[70%] object-contain" />
          ) : <span className="font-display text-xl text-gold">{initials}</span>}
        </div>
        <div className="text-sm font-semibold leading-tight mt-2">{channel.name}</div>
        <div className="flex justify-between items-center text-xs text-dim mt-2">
          <span>{channel.country || ''}</span>
          {channel.categories?.[0] && <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded uppercase">{channel.categories[0]}</span>}
        </div>
      </button>
      {onFavorite && (
        <button aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => onFavorite(channel)}
          className="absolute top-2 right-8 text-lg text-gold hover:scale-110 transition">
          {isFavorite ? '♥' : '♡'}
        </button>
      )}
    </div>
  );
}
