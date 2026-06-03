import type { Recette } from './types'

// Classement simple des ingrédients pour l'objectif anti-inflammatoire.
// (Repères grand public : légumes, poissons gras, huile d'olive, légumineuses,
// épices type curcuma = top ; charcuterie, sucre, fritures, beaucoup de gras
// saturé = à limiter.)
const ANTI = new Set([
  'saumon', 'thon', 'huile', 'courgette', 'carotte', 'brocoli', 'poireau', 'oignon', 'ail',
  'tomate', 'salade', 'poivron', 'champignon', 'aubergine', 'pois-chiches', 'lentilles',
  'haricots-verts', 'petit-pois', 'banane', 'pomme', 'avocat', 'epices',
])
const PRO = new Set([
  'lardons', 'saucisse', 'jambon', 'sucre', 'chocolat', 'beurre', 'creme', 'pate-brisee',
  'poisson-pane',
])

// Score net : nb d'ingrédients anti-inflammatoires − nb à limiter.
export function scoreAntiInflam(r: Recette): number {
  let net = 0
  for (const ing of r.ingredients) {
    if (ANTI.has(ing.produitId)) net += 1
    if (PRO.has(ing.produitId)) net -= 1
  }
  return net
}

// Recette considérée "anti-inflammatoire" : au moins 2 bons ingrédients et
// pas trop de mauvais.
export function estAntiInflam(r: Recette): boolean {
  const anti = r.ingredients.filter((i) => ANTI.has(i.produitId)).length
  const pro = r.ingredients.filter((i) => PRO.has(i.produitId)).length
  return anti >= 2 && pro <= 1
}

export const TIPS_ANTI_INFLAM: string[] = [
  '🥦 Vise la moitié de l\'assiette en légumes colorés (les variés, c\'est le mieux).',
  '🐟 Du poisson gras 2 fois par semaine (saumon, sardine, maquereau) pour les oméga-3.',
  '🫒 Cuisine à l\'huile d\'olive plutôt qu\'au beurre.',
  '🫘 Légumineuses (lentilles, pois chiches) et céréales complètes plutôt que raffinées.',
  '🌶️ Épices anti-inflammatoires : curcuma (avec un peu de poivre), gingembre, ail.',
  '🚫 À limiter : charcuterie, sucre, plats ultra-transformés et fritures.',
  '💧 Bois de l\'eau, et privilégie les fruits entiers aux jus.',
]
