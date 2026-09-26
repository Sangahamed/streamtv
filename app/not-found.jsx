import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="max-w-xl mx-auto px-6 py-24 text-center">
      <h1 className="font-display text-6xl tracking-wide">4<span className="text-gold">0</span>4</h1>
      <p className="text-dim text-sm mt-3 mb-6">Cette page n&rsquo;existe pas ou plus.</p>
      <Link href="/" className="bg-gold text-bg font-semibold px-5 py-3 rounded-lg text-sm">Retour à l&rsquo;accueil</Link>
    </main>
  );
}
