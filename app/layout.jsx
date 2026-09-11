import './globals.css';

export const metadata = {
  title: 'StreamTV — TV Live, Sport, Anime & Films',
  description: 'Agrégateur de TV en direct, sport, anime et films',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#0d1b1e',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-bg text-white font-body min-h-screen">
        <nav className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-5">
            <a href="/" className="font-display text-2xl tracking-wide">STREAM<span className="text-gold">TV</span></a>
            <a href="/tv" className="text-sm text-dim hover:text-white">TV</a>
            <a href="/dzritv" className="text-sm text-dim hover:text-white">Sport</a>
            <a href="/anime" className="text-sm text-dim hover:text-white">Anime</a>
            <a href="/films" className="text-sm text-dim hover:text-white">Films</a>
            <a href="/favoris" className="ml-auto text-sm text-dim hover:text-gold">♥ Favoris</a>
          </div>
        </nav>
        {children}
        <script dangerouslySetInnerHTML={{__html:`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}`}} />
      </body>
    </html>
  );
}
