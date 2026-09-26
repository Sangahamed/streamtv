import Link from 'next/link';
import { animeTitle } from '@/lib/anilist';

export default function AnimeCard({ anime }) {
  return (
    <Link href={`/anime/${anime.id}`} className="group block bg-card border border-border rounded-xl overflow-hidden hover:border-gold transition">
      <div className="aspect-[2/3] bg-bg overflow-hidden" style={{ backgroundColor: anime.coverImage?.color || undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {anime.coverImage?.large && <img src={anime.coverImage.large} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition" />}
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold line-clamp-2">{animeTitle(anime)}</div>
        <div className="text-xs text-dim mt-1">
          {[anime.seasonYear, anime.format?.replace('_', ' '), anime.averageScore ? `★ ${(anime.averageScore / 10).toFixed(1)}` : null].filter(Boolean).join(' · ')}
        </div>
      </div>
    </Link>
  );
}
