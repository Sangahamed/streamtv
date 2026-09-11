'use client';
import { useState, useEffect } from 'react';

export function useFavorites() {
  const [favs, setFavs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('st_favorites');
      if (raw) setFavs(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('st_favorites', JSON.stringify(favs));
    }
  }, [favs, loaded]);

  const toggle = (item) => {
    const id = typeof item === 'string' ? item : item.id;
    const exists = favs.find(f => f.id === id);
    if (exists) {
      setFavs(favs.filter(f => f.id !== id));
    } else {
      setFavs([...favs, { id, ...item, addedAt: Date.now() }]);
    }
  };

  const isFav = (id) => favs.some(f => f.id === id);
  const exportJSON = () => JSON.stringify(favs, null, 2);
  const importJSON = (json) => {
    try {
      const data = JSON.parse(json);
      setFavs(data);
      return true;
    } catch { return false; }
  };

  return { favs, toggle, isFav, exportJSON, importJSON, loaded };
}
