// Modèle de données Popote — local-first, tout est sérialisé en JSON dans localStorage.

export type Lieu = 'frigo' | 'placard' | 'congelo'
export type Unite = 'g' | 'ml' | 'piece' | 'cas' | 'cac' | 'pincee'
export type Rayon =
  | 'fruits-legumes'
  | 'viande-poisson'
  | 'cremerie'
  | 'epicerie'
  | 'surgele'
  | 'boulangerie'
  | 'autre'

// Un produit générique (référentiel partagé). Ni la marque ni l'utilisateur ne comptent ici.
export interface Produit {
  id: string
  nom: string
  rayon: Rayon
  type: 'frais' | 'packaged'
  kcal100: number | null // kcal pour 100 g/ml, null si inconnu
  codeBarres?: string // rempli quand scanné via Open Food Facts
  perissable: boolean // le frais se gâte vite -> influence l'inventaire
}

// Ce que j'ai vraiment chez moi, ici et maintenant.
export interface StockItem {
  produitId: string
  quantite: number
  unite: Unite
  lieu: Lieu
  majLe: number // timestamp
}

export interface Ingredient {
  produitId: string
  quantite: number
  unite: Unite
  optionnel?: boolean // ex. persil : ne bloque pas une recette s'il manque
}

export type Moment = 'petit-dej' | 'dejeuner' | 'diner' | 'gouter' | 'dessert'

export interface Recette {
  id: string
  nom: string
  emoji: string
  tempsMin: number
  portions: number
  difficulte: 1 | 2 | 3 // 1 = les yeux fermés
  moments: Moment[]
  tags: string[] // 'rapide', 'réconfort', 'équilibré', 'végé', 'enfant'...
  ingredients: Ingredient[]
  etapes: string[]
  kcalPortion: number // estimation fiable par portion
  // axes nutritionnels grossiers pour l'équilibre de la semaine (0-3)
  proteine: number
  legume: number
  feculent: number
}

export type Sexe = 'F' | 'H'
export type Activite = 'sedentaire' | 'leger' | 'modere' | 'intense' | 'tres-intense'
export type ObjectifType = 'perdre' | 'maintenir' | 'prendre'

export interface Personne {
  id: string
  nom: string
  emoji: string
  age?: number
  // goûts : map produitId/tag -> note (-1 pas aimé, 0 moyen, 1 aimé)
  gouts: Record<string, -1 | 0 | 1>
  objectifKcal?: number // null/absent = pas de suivi calories pour cette personne
  // données pour (re)calculer l'objectif kcal
  sexe?: Sexe
  taille?: number // cm
  poids?: number // kg
  activite?: Activite
  objectifType?: ObjectifType
}

export interface AvisRecette {
  recetteId: string
  personneId: string
  note: -1 | 0 | 1 // pouce bas / neutre / pouce haut
  etoiles?: number // 1-5, optionnel en fin de recette
  dejaTeste: boolean
  majLe: number
}

export interface CourseItem {
  produitId: string
  quantite: number
  unite: Unite
  coche: boolean
}

export interface RepasPlanifie {
  id: string
  date: string // 'YYYY-MM-DD'
  moment: Moment
  recetteId: string
  pour: string[] // ids des personnes
}

// Journal de ce qui a été mangé -> suivi calories.
// Soit une recette du catalogue (recetteId), soit une saisie libre (libelle + kcalManuel).
export interface RepasMange {
  id: string
  date: string // 'YYYY-MM-DD'
  recetteId?: string
  libelle?: string // ex. "Restaurant - burger", "Pomme"
  kcalManuel?: number // kcal total de l'entrée (saisie libre)
  moment?: Moment
  personneId: string
  portions: number
  majLe: number
}

export interface AppData {
  version: number
  onboardingFait: boolean
  personnes: Personne[]
  produits: Produit[]
  recettes: Recette[]
  stock: StockItem[]
  avis: AvisRecette[]
  courses: CourseItem[]
  planning: RepasPlanifie[]
  journal: RepasMange[]
}
