import type { Produit, Rayon } from './types'

// Cherche un produit par code-barres sur Open Food Facts (gratuit, base FR).
// Renvoie un Produit prêt à insérer, ou null si introuvable.
export async function chercherProduitParCodeBarres(code: string): Promise<Produit | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      code,
    )}.json?fields=product_name,product_name_fr,nutriments,categories_tags`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 1 || !json.product) return null
    const prod = json.product
    const nom: string =
      prod.product_name_fr || prod.product_name || 'Produit ' + code
    const kcal100: number | null =
      prod.nutriments?.['energy-kcal_100g'] ??
      (prod.nutriments?.['energy_100g'] ? Math.round(prod.nutriments['energy_100g'] / 4.184) : null)
    const rayon = devinerRayon(prod.categories_tags ?? [])
    return {
      id: 'off-' + code,
      nom: nom.trim().slice(0, 60),
      rayon,
      type: 'packaged',
      kcal100: kcal100 != null ? Math.round(kcal100) : null,
      codeBarres: code,
      perissable: rayon === 'cremerie' || rayon === 'viande-poisson' || rayon === 'fruits-legumes',
    }
  } catch {
    return null
  }
}

function devinerRayon(tags: string[]): Rayon {
  const t = tags.join(' ')
  if (/dairy|milk|cheese|yogur|cremerie|laitier/.test(t)) return 'cremerie'
  if (/meat|fish|poultry|viande|poisson|charcuter/.test(t)) return 'viande-poisson'
  if (/frozen|surgel/.test(t)) return 'surgele'
  if (/fruit|vegetable|legume/.test(t)) return 'fruits-legumes'
  if (/bread|bakery|boulanger/.test(t)) return 'boulangerie'
  return 'epicerie'
}
