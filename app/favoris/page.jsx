'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useFavorites } from '@/hooks/useFavorites';
import ChannelCard from '@/components/ChannelCard';
import Player from '@/components/Player';

export default function FavorisPage() {
  const { favs, toggle, isFav, exportJSON, importJSON, loaded } = useFavorites();
  const [active, setActive] = useState(null);
  const [message, setMessage] = useState(null);
  const closePlayer = useCallback(() => setActive(null), []);

  if (!loaded) return <div className="p-10 text-center text-dim">Chargement...</div>;

  const films = favs.filter((f) => f.type === 'film');
  const channels = favs.filter((f) => f.type !== 'film');

  function exportFile() {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'favoris-streamtv.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMessage(importJSON(ev.target.result)
        ? { ok: true, text: 'Favoris importés et fusionnés.' }
        : { ok: false, text: 'Fichier invalide : un export JSON de StreamTV est attendu.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl tracking-wide">MES <span className="text-gold">FAVORIS</span></h1>
          <p className="text-dim text-sm mt-1">Enregistrés dans ce navigateur. Exportez-les pour les retrouver ailleurs.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={exportFile} disabled={favs.length === 0} className="px-3 py-2 rounded-lg border border-border text-xs hover:border-gold disabled:opacity-40">
            Exporter JSON
          </button>
          <label className="px-3 py-2 rounded-lg border border-border text-xs hover:border-gold cursor-pointer">
            Importer JSON
            <input type="file" accept=".json,application/json" onChange={importFile} className="sr-only" />
          </label>
        </div>
      </div>

      {message && (
        <p role="status" className={`text-sm mb-5 ${message.ok ? 'text-gold' : 'text-red'}`}>{message.text}</p>
      )}

      {favs.length === 0 ? (
        <div className="p-10 text-center text-dim border border-dashed border-border rounded-xl">
          Aucun favori enregistré. Ajoutez des chaînes avec ♡ depuis la{' '}
          <Link href="/tv" className="text-gold underline">TV</Link> ou des films depuis leur fiche.
        </div>
      ) : (
        <>
          {channels.length > 0 && (
            <section className="mb-10">
              <h2 className="font-display text-2xl tracking-wide mb-4">📺 Chaînes ({channels.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {channels.map((c, i) => (
                  <ChannelCard
                    key={c.id}
                    channel={{ ...c, name: c.name || c.title || c.id }}
                    index={i + 1}
                    onSelect={setActive}
                    isFavorite={isFav(c.id)}
                    onFavorite={toggle}
                  />
                ))}
              </div>
            </section>
          )}
          {films.length > 0 && (
            <section>
              <h2 className="font-display text-2xl tracking-wide mb-4">🎬 Films ({films.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                {films.map((f) => (
                  <div key={f.id} className="relative">
                    <Link href={f.href || `/films/${f.id.replace(/^film-/, '')}`} className="block bg-card border border-border rounded-xl overflow-hidden hover:border-gold transition">
                      <div className="aspect-[2/3] bg-bg">
                        {(f.poster || f.poster_path) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.poster || `https://image.tmdb.org/t/p/w342${f.poster_path}`} alt="" loading="lazy" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-3 text-sm font-semibold line-clamp-2">{f.title}</div>
                    </Link>
                    <button onClick={() => toggle(f)} aria-label={`Retirer ${f.title} des favoris`} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-bg/80 text-gold">♥</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {active && <Player channel={active} onClose={closePlayer} />}
    </main>
  );
}
