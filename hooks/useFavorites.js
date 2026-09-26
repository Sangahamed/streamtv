'use client';
import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'st_favorites';
const EMPTY = [];

// Store partagé : toutes les instances du hook (grille, lecteur, page
// Favoris…) et tous les onglets restent synchronisés, au lieu que chacune
// garde sa propre copie qui écrase celle des autres dans le localStorage.
let current = null;
const listeners = new Set();

// On ne garde que ce qui sert à afficher/relancer un favori : les anciennes
// versions stockaient la chaîne entière, flux compris (lourd et vite périmé).
function slim(item) {
  if (!item || typeof item !== 'object' || item.id == null) return null;
  const { id, name, title, logo, country, categories, type, poster_path, poster, href, addedAt } = item;
  const entry = { id: String(id), addedAt: addedAt || Date.now() };
  if (name) entry.name = name;
  if (title) entry.title = title;
  if (logo) entry.logo = logo;
  if (country) entry.country = country;
  if (Array.isArray(categories)) entry.categories = categories;
  if (type) entry.type = type;
  if (poster_path) entry.poster_path = poster_path;
  // Seules les URL https et les chemins internes sont conservés (import JSON).
  if (typeof poster === 'string' && poster.startsWith('https://')) entry.poster = poster;
  if (typeof href === 'string' && /^\/[\w/-]/.test(href) && !href.startsWith('//')) entry.href = href;
  return entry;
}

function read() {
  if (current) return current;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    current = Array.isArray(parsed) ? parsed.map(slim).filter(Boolean) : [];
  } catch {
    current = [];
  }
  return current;
}

function write(next) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible (navigation privée, quota) : favoris en mémoire.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      current = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useFavorites() {
  const favs = useSyncExternalStore(subscribe, read, () => EMPTY);
  // Côté serveur et pendant l'hydratation, le snapshot vaut EMPTY.
  const loaded = favs !== EMPTY;

  const toggle = useCallback((item) => {
    const id = String(typeof item === 'string' ? item : item.id);
    const list = read();
    if (list.some((f) => f.id === id)) {
      write(list.filter((f) => f.id !== id));
    } else {
      const entry = slim(typeof item === 'string' ? { id } : item);
      if (entry) write([...list, entry]);
    }
  }, []);

  const isFav = useCallback((id) => favs.some((f) => f.id === String(id)), [favs]);

  const exportJSON = useCallback(() => JSON.stringify(read(), null, 2), []);

  const importJSON = useCallback((json) => {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) return false;
      // Fusion sans doublons avec les favoris existants.
      const byId = new Map(read().map((f) => [f.id, f]));
      for (const e of data.map(slim).filter(Boolean)) byId.set(e.id, e);
      write([...byId.values()]);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { favs, toggle, isFav, exportJSON, importJSON, loaded };
}
