// Petites fonctions utilitaires (hors du module store pour ne pas gêner le
// Fast Refresh de Vite, qui veut des modules n'exportant que des composants/hooks).

export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}
