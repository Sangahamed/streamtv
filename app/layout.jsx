import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'StreamTV — TV Live, Sport, Anime & Films',
  description: 'Agrégateur de TV en direct, sport, anime et films',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#0d1b1e',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-bg text-white font-body min-h-screen">
        <NavBar />
        {children}
        {/* Le service worker met en cache le JS en "cache-first" : en dev, le
            bundle change à chaque modif mais l'ancien reste servi, ce qui
            désynchronise le JS hydraté du HTML rendu côté serveur et casse
            silencieusement tous les événements (clics, saisie) de la page.
            On ne l'enregistre donc qu'en production. */}
        {process.env.NODE_ENV === 'production' && (
          <script dangerouslySetInnerHTML={{__html:`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}`}} />
        )}
      </body>
    </html>
  );
}