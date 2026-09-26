'use client';

export default function Error({ error, reset }) {
  return (
    <main className="max-w-xl mx-auto px-6 py-24 text-center">
      <h1 className="font-display text-4xl tracking-wide mb-3">OUPS<span className="text-gold">.</span></h1>
      <p className="text-dim text-sm leading-relaxed mb-6">
        Une source de données est momentanément injoignable. Réessayez dans quelques instants.
      </p>
      {error?.digest && <p className="font-mono text-[11px] text-dim/60 mb-4">réf. {error.digest}</p>}
      <button onClick={reset} className="border border-gold text-gold font-mono text-sm px-6 py-2.5 rounded-lg hover:bg-gold/10">
        Réessayer
      </button>
    </main>
  );
}
