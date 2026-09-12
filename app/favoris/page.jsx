'use client';
import { useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';

export default function FavorisPage() {
  const { favs, toggle, exportJSON, importJSON, loaded } = useFavorites();

  if (!loaded) return <div className="p-10 text-center text-dim">Chargement...</div>;

  return (
    <main className="max-w-3xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-semibold mb-4">Mes favoris</h1>

      {favs.length === 0 ? (
        <div className="p-10 text-center text-dim/60">Aucun favori enregistré</div>
      ) : (
        <div className="flex flex-col gap-2 mb-5">
          {favs.map(f => (
            <div key={f.id} className="flex justify-between items-center p-3 border border-border rounded-xl">
              <div>
                <div className="text-sm font-medium">{f.title || f.name || f.id}</div>
                <div className="text-xs text-dim/60">{f.type || 'chaîne'}</div>
              </div>
              <button onClick={() => toggle(f)} className="px-2.5 py-1 rounded-md border border-red bg-transparent text-red text-xs">Retirer</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            const blob = new Blob([exportJSON()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'favoris-streamtv.json';
            a.click();
          }}
          className="px-3 py-1.5 rounded-md border border-border bg-transparent text-xs"
        >
          Exporter JSON
        </button>
        <input
          type="file"
          accept=".json"
          onChange={e => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = ev => { if (importJSON(ev.target.result)) alert('Importé !'); else alert('Format invalide'); };
              reader.readAsText(file);
            }
          }}
          className="text-xs"
        />
      </div>
    </main>
  );
}
