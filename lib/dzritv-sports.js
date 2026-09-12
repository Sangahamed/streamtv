// dzritv.com utilise une taxonomie interne où le slug d'URL ne correspond pas
// toujours au nom du sport affiché (probablement un gabarit réutilisé d'un
// autre projet sans renommage des catégories). Vérifié en comparant le menu
// affiché sur le site aux hrefs réels le 11/09/2026 :
//   Football   -> /sport/football   (correct)
//   Basketball -> /sport/basketball (correct)
//   Tennis     -> /sport/hockey     (le slug "tennis" n'est pas le bon)
//   Volleyball -> /sport/snooker
//   Ice Hockey -> /sport/volleyball
// Si dzritv.com change un jour sa taxonomie, cette table sera à revérifier.
export const SPORT_SLUG_MAP = {
  football: 'football',
  basketball: 'basketball',
  tennis: 'hockey',
  volleyball: 'snooker',
  'ice-hockey': 'volleyball',
};
