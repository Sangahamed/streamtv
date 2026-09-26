'use client';

import { memo, useState } from 'react';
import { flagEmoji } from '@/lib/flag';
import { categoryLabel } from '@/lib/labels';

function ChannelCard({ channel, index, onSelect, isFavorite, onFavorite }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const initials = (channel.name || '?').slice(0, 3).toUpperCase();

  return (
    <div className={`relative bg-card border border-border rounded-xl hover:bg-cardHover hover:border-gold hover:-translate-y-0.5 transition${channel.off ? ' opacity-60' : ''}`}>
      <button
        onClick={() => onSelect(channel)}
        className="w-full h-full text-left p-3.5 rounded-xl focus-visible:outline focus-visible:outline-gold"
      >
        <div className="flex justify-between items-start pr-7">
          <span className="font-mono text-[11px] text-dim">
            CH {String(index || 1).padStart(3, '0')}
            {channel.off && (
              <span className="ml-1.5 text-[10px] text-red uppercase">{channel.off === 'closed' ? 'Fermée' : 'Sans flux'}</span>
            )}
          </span>
          <span aria-hidden="true">{flagEmoji(channel.country)}</span>
        </div>
        <div className="w-full h-16 flex items-center justify-center bg-bg rounded-md overflow-hidden mt-2">
          {channel.logo && !logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.logo}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="max-w-[88%] max-h-[70%] object-contain"
            />
          ) : (
            <span className="font-display text-xl text-gold">{initials}</span>
          )}
        </div>
        <div className="text-sm font-semibold leading-tight mt-2 line-clamp-2">{channel.name}</div>
        <div className="flex justify-between items-center gap-2 text-xs text-dim mt-2">
          <span>{channel.country || ''}</span>
          {channel.categories?.[0] && (
            <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded uppercase truncate">
              {categoryLabel(channel.categories[0])}
            </span>
          )}
        </div>
      </button>
      {onFavorite && (
        <button
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Retirer ${channel.name} des favoris` : `Ajouter ${channel.name} aux favoris`}
          onClick={() => onFavorite(channel)}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-md text-lg text-gold hover:bg-bg hover:scale-110 transition focus-visible:outline focus-visible:outline-gold"
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      )}
    </div>
  );
}

export default memo(ChannelCard);
