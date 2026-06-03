import type { Produit, Rayon } from './types'

// Transforme un nom marketing à rallonge en nom simple et lisible.
// « PAVES DE SAUMON ATLANTIQUE SANS PEAU 500g » -> « Saumon »
export function simplifierNom(n: string): string {
  let s = ' ' + n + ' '
  // poids, volumes, multiplicateurs, pourcentages
  s = s.replace(/\b\d+[.,]?\d*\s?(g|gr|kg|ml|cl|l)\b/gi, ' ')
  s = s.replace(/\bx\s?\d+\b/gi, ' ').replace(/\b\d+\s?%/g, ' ').replace(/\blot de \d+\b/gi, ' ')
  // mentions marketing / descripteurs
  s = s.replace(
    /\b(atlantique|pacifique|sans\s+peau|avec\s+peau|surgel[ée]s?|premium|extra|qualit[ée]\s+sup[ée]rieure?|origine\s+france|label\s+rouge|[ée]labor[ée]s?|maturé|tranch[ée]s?|en\s+morceaux|portions?|familial|format|nouveau)\b/gi,
    ' ',
  )
  // coupes/morceaux en tête : « pavés de saumon » -> « saumon »
  s = s.replace(/\b(pav[ée]s?|filets?|escalopes?|blancs?|morceaux?|darnes?|cuisses?|steaks?|tranches?)\s+de\s+/gi, ' ')
  s = s.replace(/\s+/g, ' ').trim().replace(/^(de|du|des|d['’]|le|la|les|au|aux)\s+/i, '').trim()
  // garde 3 mots significatifs
  const mots = s.split(' ').filter(Boolean).slice(0, 3)
  const r = (mots.join(' ') || n.trim()).toLowerCase()
  return (r.charAt(0).toUpperCase() + r.slice(1)).slice(0, 32)
}

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
    const brut: string = prod.product_name_fr || prod.product_name || 'Produit ' + code
    const nom = simplifierNom(brut)
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
