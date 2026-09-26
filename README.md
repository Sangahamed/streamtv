# StreamTV

Migration de **DZTV Live → StreamTV** : l'application conserve le moteur TV live et son interface, tout en réunissant TV, sport, anime, films, favoris, PWA et cache.

## Fonctionnalités

- TV live multi-pays via iptv-org + Free-TV/IPTV (flux supplémentaires, chaînes absentes
  d'iptv-org, directs YouTube/Twitch officiels) + chaînes ivoiriennes, avec blocklist
  iptv-org appliquée à toutes les sources et exclusion NSFW.
- Logos issus de `logos.json` (iptv-org ne les fournit plus dans `channels.json`).
- Lecteur HLS/MP4/YouTube/Twitch : flux chargés à la demande (`/api/tv/streams/[id]`),
  testés côté serveur (sources qui répondent en premier, les autres marquées « hors ligne »),
  repli automatique (erreur ou 20 s sans image) et choix manuel de la source.
  Les flux exigeant Referer/User-Agent sont écartés.
- Recherche sans accents (nom + noms alternatifs), filtres pays/catégories (en français), filtre favoris.
- Sport : matchs par sport via dzritv.com avec fallback Football-Data.
- Anime : séries gratuites en France en VF/VOSTFR (TMDB/JustWatch : ADN, Crunchyroll, Pluto TV…),
  chaînes anime VF en direct lues dans l'app, catalogue AniList (tendances, saison, populaires,
  mieux notés, recherche) avec bande-annonce, plateformes officielles et épisodes. Contenus adultes exclus.
- Films : films gratuits en France en VF (TF1+, M6+, france.tv, Arte, Pluto TV, Rakuten…),
  chaînes cinéma VF en direct lues dans l'app, classiques du domaine public lus dans l'app
  (Internet Archive, avant 1964, contenus adultes exclus : les licences y sont déclarées par
  les déposants sans vérification) ; listes TMDB, recherche, fiches avec plateformes légales,
  bande-annonce et distribution.
- Temps de chargement : catalogue TV préchauffé au démarrage (`instrumentation.js`) et
  rafraîchi en arrière-plan (stale-while-revalidate) ; test des sources plafonné à 2,5 s ;
  hls.js réglé pour un démarrage rapide.
- Favoris (chaînes et films) partagés entre pages et onglets, avec import/export JSON.
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
