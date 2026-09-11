'use client';
import { useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';

export default function FavorisPage() {
  const { favs, toggle, isFav, exportJSON, importJSON, loaded } = useFavorites();
  const [importText, setImportText] = useState('');

  if (!loaded) return <div style={{ padding:40, textAlign:'center' }}>Chargement...</div>;

  return (
    <main style={{ maxWidth:800, margin:'0 auto', padding:24 }}>
      <h1 style={{ fontSize:24, fontWeight:500, marginBottom:16 }}>Mes favoris</h1>

      {favs.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--kimi-color-text-quaternary)' }}>Aucun favori enregistré</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {favs.map(f => (
            <div key={f.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:12, border:'1px solid var(--kimi-color-border)', borderRadius:10 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:500 }}>{f.title || f.name || f.id}</div>
                <div style={{ fontSize:11, color:'var(--kimi-color-text-quaternary)' }}>{f.type || 'chaîne'}</div>
              </div>
              <button onClick={() => toggle(f)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--kimi-color-danger)', background:'transparent', color:'var(--kimi-color-danger)', fontSize:12, cursor:'pointer' }}>Retirer</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={() => { const blob = new Blob([exportJSON()], { type:'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'favoris-streamtv.json'; a.click(); }} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid var(--kimi-color-border)', background:'transparent', fontSize:12, cursor:'pointer' }}>Exporter JSON</button>
        <input type="file" accept=".json" onChange={e => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = ev => { if (importJSON(ev.target.result)) alert('Importé !'); else alert('Format invalide'); }; reader.readAsText(file); } }} style={{ fontSize:12 }} />
      </div>
    </main>
  );
}
