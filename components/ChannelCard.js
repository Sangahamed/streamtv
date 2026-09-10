'use client';

import { useState } from 'react';
import { flagEmoji } from '@/lib/flag';

export default function ChannelCard({ channel, index, onSelect }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const initials = channel.name.slice(0, 3).toUpperCase();

  return (
    <button
      onClick={onSelect}
      className="text-left bg-card border border-border rounded-[10px] p-3.5 flex flex-col gap-2.5 hover:bg-cardHover hover:border-gold hover:-translate-y-0.5 transition focus-visible:outline focus-visible:outline-gold"
    >
      <div className="flex justify-between items-start">
        <span className="font-mono text-[11px] text-dim">CH {String(index).padStart(3, '0')}</span>
        <span>{flagEmoji(channel.country)}</span>
      </div>
      <div className="w-full h-16 flex items-center justify-center bg-bg rounded-md overflow-hidden">
        {channel.logo && !logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            onError={() => setLogoFailed(true)}
            className="max-w-[88%] max-h-[70%] object-contain"
          />
        ) : (
          <span className="font-display text-xl text-gold tracking-wide">{initials}</span>
        )}
      </div>
      <div className="text-sm font-semibold leading-tight">{channel.name}</div>
      <div className="flex justify-between items-center text-xs text-dim">
        <span>{channel.country || ''}</span>
        {channel.categories[0] && (
          <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded uppercase tracking-wide">
            {channel.categories[0]}
          </span>
        )}
      </div>
    </button>
  );
}
