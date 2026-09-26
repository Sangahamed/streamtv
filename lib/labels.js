const CATEGORY_LABELS = {
  animation: 'Animation',
  auto: 'Auto',
  business: 'Économie',
  classic: 'Classiques',
  comedy: 'Comédie',
  cooking: 'Cuisine',
  culture: 'Culture',
  documentary: 'Documentaire',
  education: 'Éducation',
  entertainment: 'Divertissement',
  family: 'Famille',
  general: 'Généraliste',
  interactive: 'Interactif',
  kids: 'Jeunesse',
  legislative: 'Parlementaire',
  lifestyle: 'Art de vivre',
  movies: 'Cinéma',
  music: 'Musique',
  news: 'Info',
  outdoor: 'Nature',
  public: 'Service public',
  relax: 'Détente',
  religious: 'Religion',
  science: 'Science',
  series: 'Séries',
  shop: 'Téléachat',
  sports: 'Sport',
  travel: 'Voyage',
  weather: 'Météo',
  xxx: 'Adulte',
};

export function categoryLabel(id) {
  return CATEGORY_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1);
}

// Recherche insensible à la casse et aux accents (« cote » trouve « Côte
// d'Ivoire »), défensive si une source secondaire fournit un nom manquant.
export function normalize(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
