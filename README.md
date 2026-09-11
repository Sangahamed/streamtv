# StreamTV

Migration de **DZTV Live → StreamTV** : l'application conserve le moteur TV live et son interface, tout en réunissant TV, sport, anime, films, favoris, PWA et cache.

## Fonctionnalités

- TV live multi-pays via iptv-org, avec blocklist et exclusion NSFW.
- Lecteur HLS/MP4 avec fallback entre plusieurs sources.
- Recherche, filtres pays/catégories et affichage progressif.
- Sport : matchs par sport via dzritv.com avec fallback Football-Data.
- Anime : recherche et épisodes via l'API interne.
- Films : catalogue TMDB + fiches détaillées.
- Favoris persistés dans le navigateur avec import/export JSON.
- PWA + page hors ligne.
- Cache mémoire ou Redis/Vercel KV.

## Installation

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Important

StreamTV ne stocke ni n'héberge les flux référencés. Vérifier les droits et conditions d'utilisation des sources avant toute mise en production.
