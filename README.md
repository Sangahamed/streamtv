# DZTV Live

Application Next.js de TV en direct, légale, agrégeant les chaînes IPTV
librement diffusées en clair (via l'annuaire ouvert [iptv-org](https://github.com/iptv-org/iptv)).

Le sport (déjà couvert par DZTV) est **masqué par défaut** : l'app se
concentre sur l'actu, le cinéma, le divertissement, la musique, les chaînes
jeunesse, etc. Un interrupteur permet de le réafficher si besoin.

## Installation locale

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000

## Déploiement

Le plus simple : [Vercel](https://vercel.com) (créateur de Next.js, plan
gratuit largement suffisant). Poussez le dossier sur un dépôt Git puis
importez-le sur Vercel — aucune variable d'environnement n'est nécessaire
pour cette version.

## Comment ça reste légal

- Aucun flux n'est hébergé ou stocké : l'app ne fait que lire des URL
  `.m3u8` déjà publiées librement par les chaînes elles-mêmes.
- La **blocklist officielle** d'iptv-org (signalements des ayants droit)
  est appliquée automatiquement côté serveur (`lib/iptv.js`), avant même
  que la liste n'atteigne le navigateur.
- Les chaînes marquées `is_nsfw` ou classées `xxx` sont exclues.
- Les données sont revalidées toutes les heures (`revalidate: 3600`),
  donc les mises à jour de la blocklist se répercutent rapidement.

## Prochaines étapes possibles

- Catalogue anime/films (TMDB + Jikan/AniList) avec redirection légale
  vers les plateformes officielles.
- Comptes utilisateurs, favoris et historique via Supabase.
- Intégration d'embeds officiels YouTube/Dailymotion/Pluto TV pour élargir
  encore le catalogue au-delà de l'IPTV en direct.
