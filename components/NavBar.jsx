'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/tv', label: 'TV' },
  { href: '/sport', label: 'Sport TV' },
  { href: '/dzritv', label: 'Sport' },
  { href: '/anime', label: 'Anime' },
  { href: '/films', label: 'Films' },
];

// Liens <Link> (navigation client, sans rechargement complet) avec l'onglet
// actif mis en évidence ; défilement horizontal sur petit écran.
export default function NavBar() {
  const pathname = usePathname();
  const isActive = href => pathname === href || pathname.startsWith(`${href}/`);
  const linkClass = href =>
    `text-sm whitespace-nowrap transition ${isActive(href) ? 'text-gold' : 'text-dim hover:text-white'}`;

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur px-4 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center gap-4 sm:gap-5 overflow-x-auto">
        <Link href="/" className="font-display text-2xl tracking-wide shrink-0">STREAM<span className="text-gold">TV</span></Link>
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} className={linkClass(l.href)} aria-current={isActive(l.href) ? 'page' : undefined}>
            {l.label}
          </Link>
        ))}
        <Link href="/favoris" className={`ml-auto ${linkClass('/favoris')}`} aria-current={isActive('/favoris') ? 'page' : undefined}>
          ♥ Favoris
        </Link>
      </div>
    </nav>
  );
}
