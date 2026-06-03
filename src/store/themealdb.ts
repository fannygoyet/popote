import type { Produit } from './types'

// Idées de recettes par ingrédient via TheMealDB (gratuit, sans clé, CORS ok).
// L'API attend un nom d'ingrédient en anglais -> petite table FR -> EN pour nos
// concepts ; sinon on tente le nom tel quel.
const FR_EN: Record<string, string> = {
  saumon: 'Salmon',
  poulet: 'Chicken',
  dinde: 'Turkey',
  'boeuf-hache': 'Beef',
  lardons: 'Bacon',
  jambon: 'Ham',
  saucisse: 'Sausage',
  thon: 'Tuna',
  'poisson-pane': 'Fish',
  crevettes: 'Prawns',
  oeuf: 'Egg',
  riz: 'Rice',
  pates: 'Pasta',
  nouilles: 'Noodles',
  semoule: 'Couscous',
  lentilles: 'Lentils',
  'pois-chiches': 'Chickpeas',
  courgette: 'Zucchini',
  carotte: 'Carrots',
  oignon: 'Onion',
  ail: 'Garlic',
  tomate: 'Tomatoes',
  poivron: 'Pepper',
  champignon: 'Mushrooms',
  aubergine: 'Aubergine',
  brocoli: 'Broccoli',
  poireau: 'Leek',
  'pomme-de-terre': 'Potatoes',
  'haricots-verts': 'Green Beans',
  'petit-pois': 'Peas',
  salade: 'Lettuce',
  mais: 'Corn',
  avocat: 'Avocado',
  banane: 'Banana',
  pomme: 'Apple',
  citron: 'Lemon',
  chocolat: 'Chocolate',
  'fromage-rape': 'Cheese',
  mozzarella: 'Mozzarella',
  lait: 'Milk',
  creme: 'Cream',
  beurre: 'Butter',
  farine: 'Flour',
}

export interface IdeeRecette {
  nom: string
  img: string
  lien: string
}

// Devine le terme anglais : concept connu, sinon 1er mot du nom du produit.
function termeAnglais(p: Produit): string {
  const cle = p.canonId ?? p.id
  if (FR_EN[cle]) return FR_EN[cle]
  // cherche un mot du nom dans la table (par valeur FR = clé)
  const motsNom = p.nom.toLowerCase()
  for (const [fr, en] of Object.entries(FR_EN)) {
    if (motsNom.includes(fr)) return en
  }
  return p.nom.split(/\s+/)[0] || p.nom
}

export async function recettesEnLigne(p: Produit): Promise<IdeeRecette[]> {
  const en = termeAnglais(p)
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 9000)
  try {
    const r = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(en)}`,
      { signal: ctrl.signal },
    )
    if (!r.ok) return []
    const j = await r.json()
    if (!j?.meals) return []
    return (j.meals as any[]).slice(0, 12).map((m) => ({
      nom: m.strMeal,
      img: m.strMealThumb,
      lien: `https://www.themealdb.com/meal/${m.idMeal}`,
    }))
  } catch {
    return []
  } finally {
    clearTimeout(t)
  }
}
