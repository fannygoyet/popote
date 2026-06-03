// Petites fonctions utilitaires (hors du module store pour ne pas gêner le
// Fast Refresh de Vite, qui veut des modules n'exportant que des composants/hooks).

export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}

// Normalise un texte pour la recherche : minuscules, sans accents, ligatures
// œ/æ décomposées (« oeufs » retrouve « Œufs », « epinards » retrouve « Épinards »).
export function normRecherche(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .trim()
}
