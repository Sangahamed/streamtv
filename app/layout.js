import './globals.css';

export const metadata = {
  title: 'DZTV Live — Chaînes IPTV légales, au-delà du sport',
  description:
    "Toutes les chaînes algériennes et internationales diffusées légalement en clair, agrégées via l'annuaire ouvert iptv-org. Complète DZTV avec de l'actu, du cinéma, du divertissement et plus.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-white font-body min-h-screen">{children}</body>
    </html>
  );
}
