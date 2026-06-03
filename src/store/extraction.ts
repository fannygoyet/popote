import type { Unite } from './types'

// --- Récupération du texte d'une vidéo à partir de son lien (gratuit, sans backend) ---
// TikTok : oEmbed public (fiable). Autres (Instagram…) : lecteur Jina (best-effort).
export async function recupererDepuisLien(url: string): Promise<string | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 9000)
  try {
    if (/tiktok\.com/i.test(url)) {
      const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
      if (r.ok) {
        const j = await r.json()
        if (j?.title) return j.title as string
      }
    }
    // fallback générique : Jina lit la page et renvoie son texte
    const r2 = await fetch('https://r.jina.ai/' + url, { signal: ctrl.signal })
    if (r2.ok) return await r2.text()
  } catch {
    // réseau / CORS / timeout -> on laissera l'utilisateur coller à la main
  } finally {
    clearTimeout(t)
  }
  return null
}

// --- Nettoyage + tri automatique d'une description en recette ---

// lignes "parasites" typiques des réseaux
const FILLER =
  /(abonn|suis[- ]?(moi|nous)|follow|\blike\b|\baime[zr]?\b|partage|comment(e|aire)|lien en bio|en bio|recette compl[èe]te|enregistre|\bsave\b|sponsor|collab|nouvelle vid[ée]o|chaque (jour|semaine)|bon app[ée]tit|👇|⬇|🔔|👉|🥰|❤️|credit|©)/i

const UNITE_KW =
  /\b(\d|g\b|kg\b|ml\b|cl\b|\bl\b|c\.?\s?[àa]\.?\s?[sc]\b|càs|càc|cuill|gousses?|pinc[ée]e|tranches?|sachets?|bo[îi]tes?|cub|verres?|cs\b|cc\b)/i

function nettoyerLigne(l: string): string {
  return l
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[^\s#]+/g, '')
    .replace(/@[^\s@]+/g, '')
    .replace(/^[\s\-•*·▪◦▢➡️👉🔸🔹✅☑️▶️–—]+/, '')
    .trim()
}

function estIngredient(l: string): boolean {
  return UNITE_KW.test(l) && l.length <= 70
}

export interface RecetteExtraite {
  nom: string
  ingredients: string[]
  etapes: string[]
}

export function analyserTexte(texte: string): RecetteExtraite {
  const lignes = texte
    .split(/\r?\n|•|·|(?<=[.!?])\s+(?=[A-ZÀ-Ü])/)
    .map(nettoyerLigne)
    .filter((l) => l && !FILLER.test(l) && !/^[\d\W]{0,2}$/.test(l))

  const idxIng = lignes.findIndex((l) => /ingr[ée]dients?/i.test(l))
  const idxEt = lignes.findIndex((l) => /(pr[ée]paration|[ée]tapes?|instructions|pr[ée]parer|recette\s*:|m[ée]thode)/i.test(l))

  let ingredients: string[] = []
  let etapes: string[] = []

  const sansEntete = (l: string) =>
    l.replace(/^(ingr[ée]dients?|pr[ée]paration|[ée]tapes?|instructions|recette)\s*:?\s*/i, '').trim()

  if (idxIng >= 0) {
    const fin = idxEt > idxIng ? idxEt : lignes.length
    ingredients = lignes
      .slice(idxIng, fin)
      .map(sansEntete)
      .filter(Boolean)
    if (idxEt > idxIng) etapes = lignes.slice(idxEt).map(sansEntete).filter(Boolean)
  }

  // pas d'en-têtes clairs (ou rien trouvé) -> on classe ligne par ligne
  if (ingredients.length === 0 && etapes.length === 0) {
    for (const l of lignes) {
      if (estIngredient(l)) ingredients.push(l)
      else if (l.length > 18) etapes.push(l)
    }
  }

  // titre : 1re ligne courte qui n'est ni un ingrédient ni une étape
  const nom =
    lignes.find((l) => !estIngredient(l) && l.length >= 3 && l.length < 55 && !/ingr|pr[ée]p|[ée]tape/i.test(l)) ||
    lignes[0] ||
    'Recette importée'

  return {
    nom: nom.slice(0, 60),
    ingredients: ingredients.filter((l) => l !== nom),
    etapes,
  }
}

// Devine quantité + unité + nom à partir d'une ligne « 200 g de pâtes ».
export function parseLigne(ligne: string): { nom: string; quantite: number; unite: Unite } {
  let s = ligne.trim().replace(/^[-•*·\s]+/, '')
  let quantite = 0
  let unite: Unite = 'g'
  const m = s.match(
    /^(\d+[.,]?\d*)\s*(kg|g|ml|cl|l|c\.?\s?à\.?\s?s|càs|cas|cs|cuill?[èe]res?\s+à\s+soupe|c\.?\s?à\.?\s?c|càc|cac|cc|cuill?[èe]res?\s+à\s+caf[ée]|pinc[ée]es?|gousses?|tranches?|sachets?|bo[îi]tes?|œufs?|oeufs?)?\b/i,
  )
  if (m) {
    quantite = parseFloat(m[1].replace(',', '.'))
    const u = (m[2] || '').toLowerCase()
    if (u.startsWith('kg')) {
      unite = 'g'
      quantite *= 1000
    } else if (u === 'g') unite = 'g'
    else if (u === 'ml') unite = 'ml'
    else if (u === 'cl') {
      unite = 'ml'
      quantite *= 10
    } else if (u === 'l') {
      unite = 'ml'
      quantite *= 1000
    } else if (u.includes('soup') || u === 'càs' || u === 'cas' || u === 'cs' || /^c.?a.?s$/.test(u)) unite = 'cas'
    else if (u.includes('caf') || u === 'càc' || u === 'cac' || u === 'cc' || /^c.?a.?c$/.test(u)) unite = 'cac'
    else if (u.startsWith('pinc')) unite = 'pincee'
    else if (u.startsWith('gousse') || u.startsWith('tranche') || u.startsWith('sachet') || u.startsWith('bo') || u.includes('uf'))
      unite = 'piece'
    s = s.slice(m[0].length)
  }
  s = s.replace(/^\s*(de\s+|d['’]\s*|du\s+|des\s+)/i, '').trim()
  if (!quantite) quantite = unite === 'g' ? 100 : 1
  return { nom: s || ligne.trim(), quantite, unite }
}
