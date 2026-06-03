import type { Produit, Unite } from './types'
import { SYNONYMES } from './seed'

// --- Rapprochement intelligent d'un nom d'ingrédient avec le référentiel ---
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
}

// mots à ignorer : articles, contenants, quantifieurs, qualificatifs
const STOP = new Set([
  'un', 'une', 'des', 'de', 'du', 'd', 'la', 'le', 'les', 'l', 'au', 'aux', 'et', 'ou', 'a',
  'pot', 'pots', 'sachet', 'sachets', 'boite', 'boites', 'bocal', 'brique', 'briques', 'paquet', 'paquets', 'bloc', 'blocs',
  'tranche', 'tranches', 'gousse', 'gousses', 'cuillere', 'cuilleres', 'cas', 'cac', 'cs', 'cc',
  'environ', 'gros', 'grosse', 'grosses', 'petit', 'petite', 'petits', 'petites', 'bio',
  'frais', 'fraiche', 'fraiches', 'liquide', 'entier', 'entiere', 'demi', 'quelques', 'beaucoup',
  'peu', 'morceau', 'morceaux', 'filet', 'filets', 'tasse', 'verre', 'verres', 'tranchee',
  'g', 'kg', 'ml', 'cl', 'l', 'pincee', 'pincees', 'belle', 'beau', 'bonne', 'bon',
  // mots de découpe : ne doivent pas piloter le rapprochement (« escalope de poulet » -> poulet)
  'escalope', 'escalopes', 'pave', 'paves', 'steak', 'steaks', 'blanc', 'blancs',
  'darne', 'darnes', 'cuisse', 'cuisses', 'aiguillette', 'aiguillettes',
])

function motsCles(s: string): string[] {
  return norm(s)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w))
    .map((w) => w.replace(/(s|x)$/, '')) // singulier approximatif
    .filter(Boolean)
}

// table inversée synonyme -> concept (normalisée comme les mots-clés)
const SYN_REV: Record<string, string> = {}
for (const [concept, syns] of Object.entries(SYNONYMES)) {
  for (const syn of syns) {
    const k = norm(syn).replace(/[^a-z0-9]/g, '').replace(/(s|x)$/, '')
    if (k) SYN_REV[k] = concept
  }
}

// trouve le meilleur produit existant pour un nom d'ingrédient (ou null)
export function matcherProduit(nomIng: string, produits: Produit[]): string | null {
  const it = motsCles(nomIng)
  if (!it.length) return null
  // synonyme connu (spaghetti -> pâtes, couscous -> semoule…) : prioritaire
  for (const w of it) {
    const c = SYN_REV[w]
    if (c && produits.some((p) => p.id === c)) return c
  }
  let best: string | null = null
  let bestScore = 0
  for (const p of produits) {
    const pt = motsCles(p.nom)
    let s = 0
    for (const w of it) if (pt.includes(w)) s++
    if (s > 0) {
      const score = s - pt.length * 0.02 // léger bonus aux noms courts/génériques
      if (score > bestScore) {
        bestScore = score
        best = p.id
      }
    }
  }
  return best
}

// nom propre pour un nouveau produit (sans « un pot de … »)
export function nettoyerNomProduit(nomIng: string): string {
  const mots = nomIng
    .replace(/[•\-*]/g, ' ')
    .split(/\s+/)
    .filter((w) => {
      const n = norm(w).replace(/[^a-z0-9]/g, '')
      return n && !STOP.has(n) && !/^\d+$/.test(n)
    })
  const s = mots.join(' ').trim() || nomIng.trim()
  return s.charAt(0).toUpperCase() + s.slice(1, 40)
}

// décode les entités HTML (&#39; &amp; …) via le DOM
function decodeEntities(s: string): string {
  const el = document.createElement('textarea')
  el.innerHTML = s
  return el.value
}

// extrait la légende du HTML de la page "embed" d'Instagram
function captionInstagram(html: string): string | null {
  const m = html.match(/<div[^>]*class="Caption"[\s\S]*?<\/div>/i)
  if (!m) return null
  const c = decodeEntities(m[0].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
  const lignes = c.split('\n').map((l) => l.trim()).filter(Boolean)
  // la 1re "ligne" est souvent le pseudo du compte -> on l'enlève
  if (lignes[0] && /^[\w.]{2,30}$/.test(lignes[0])) lignes.shift()
  return lignes.join('\n').trim() || null
}

// --- Récupération du texte d'une recette à partir du lien de la vidéo (gratuit) ---
// Instagram : sa page "embed" publique (sans connexion) lue via un proxy CORS.
// TikTok : oEmbed public. Sinon : lecteur Jina (best-effort).
export async function recupererDepuisLien(url: string): Promise<string | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20000)
  try {
    // --- Instagram ---
    const ig = url.match(/instagram\.com\/(reel|reels|p|tv)\/([\w-]+)/i)
    if (ig) {
      const type = ig[1].toLowerCase() === 'reels' ? 'reel' : ig[1].toLowerCase()
      const embed = `https://www.instagram.com/${type}/${ig[2]}/embed/captioned/`
      // plusieurs proxies CORS : si l'un échoue, on essaie le suivant (fiabilité)
      const proxies = [
        (u: string) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
        (u: string) => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
        (u: string) => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u),
        (u: string) => 'https://r.jina.ai/' + u,
      ]
      for (const mk of proxies) {
        try {
          const r = await fetch(mk(embed), { signal: ctrl.signal })
          if (!r.ok) continue
          const txt = await r.text()
          const cap = captionInstagram(txt)
          if (cap && cap.length > 20) return cap
        } catch {
          /* proxy suivant */
        }
      }
      return null
    }

    // --- TikTok ---
    if (/tiktok\.com/i.test(url)) {
      const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
      if (r.ok) {
        const j = await r.json()
        if (j?.title) return j.title as string
      }
    }

    // --- Autres : lecteur Jina ---
    const r2 = await fetch('https://r.jina.ai/' + url, { signal: ctrl.signal })
    if (r2.ok) return await r2.text()
  } catch {
    // réseau / CORS / timeout
  } finally {
    clearTimeout(t)
  }
  return null
}

// --- Nettoyage + tri automatique d'une description en recette ---

// lignes "parasites" typiques des réseaux
const FILLER =
  /(abonn|suis[- ]?(moi|nous)|follow|\blike\b|\baime[zr]?\b|partage|comment(e|er|aire)|comments?\b|lien en bio|en bio|recette compl[èe]te|enregistre|\bsave\b|sponsor|collab|nouvelle vid[ée]o|chaque (jour|semaine)|bon app[ée]tit|view all|voir (tout|les|plus)|watch on instagram|^play$|^more$|likes?$|👇|⬇|🔔|👉|🥰|❤️|credit|©)/i

// indications de portions ("2 personnes", "pour 4") — pas un ingrédient
const PORTIONS = /^(pour\s+)?\d*\s*(personnes?|pers\.?|portions?|parts?)\s*:?\s*$/i

const UNITE_KW =
  /\b(\d|g\b|kg\b|ml\b|cl\b|\bl\b|c\.?\s?[àa]\.?\s?[sc]\b|càs|càc|cuill|gousses?|pinc[ée]e|tranches?|sachets?|bo[îi]tes?|cub|verres?|cs\b|cc\b)/i

function nettoyerLigne(l: string): string {
  return l
    .replace(/https?:\/\/\S+/g, '')
    .replace(/voir les?\s*\d*\s*commentaires?.*$/i, '') // « …180Voir les 651 commentaires »
    .replace(/view\s+all\s+\d*\s*comments?.*$/i, '')
    .replace(/#[^\s#]+/g, '')
    .replace(/@[^\s@]+/g, '')
    .replace(/^[\s\-•*·▪◦▢➡️👉🔸🔹✅☑️▶️–—]+/, '')
    .trim()
}

// marqueur d'étape numérotée : « 1 / », « 2) », « 3. », « 4 - »
const STEP_MARK = /^\d{1,2}\s*[/).:°-]/
function estEtape(l: string): boolean {
  return STEP_MARK.test(l) || l.length > 45
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
    // coupe aussi avant un marqueur d'étape «  2 / » même au milieu d'une ligne
    .split(/\r?\n|•|·|(?<=[.!?])\s+(?=[A-ZÀ-Ü])|(?<=\S)\s+(?=\d{1,2}\s*[/)]\s)/)
    .map(nettoyerLigne)
    .filter((l) => l && !FILLER.test(l) && !/^[\d\W]{0,2}$/.test(l))

  const idxIng = lignes.findIndex((l) => /ingr[ée]dients?/i.test(l))
  const idxEt = lignes.findIndex((l) => /(pr[ée]paration|[ée]tapes?|instructions|pr[ée]parer|recette\s*:|m[ée]thode)/i.test(l))

  let ingredients: string[] = []
  let etapes: string[] = []

  const sansEntete = (l: string) =>
    l.replace(/^(ingr[ée]dients?|pr[ée]paration|[ée]tapes?|instructions|recette)\s*:?\s*/i, '').trim()
  const sansNumero = (l: string) => l.replace(/^\d{1,2}\s*[/).:°-]\s*/, '').trim()

  if (idxIng >= 0) {
    // début des étapes : l'en-tête « préparation » si présent, sinon la 1re ligne
    // qui ressemble à une étape (numérotée ou phrase longue) après les ingrédients
    let debutEt = idxEt > idxIng ? idxEt : lignes.findIndex((l, i) => i > idxIng && estEtape(l))
    if (debutEt <= idxIng) debutEt = -1
    const fin = debutEt > idxIng ? debutEt : lignes.length
    ingredients = lignes.slice(idxIng, fin).map(sansEntete).filter(Boolean)
    if (debutEt > idxIng) etapes = lignes.slice(debutEt).map(sansEntete).map(sansNumero).filter(Boolean)
  }

  // pas d'en-têtes clairs (ou rien trouvé) -> on classe ligne par ligne
  if (ingredients.length === 0 && etapes.length === 0) {
    for (const l of lignes) {
      if (STEP_MARK.test(l)) etapes.push(sansNumero(l))
      else if (estIngredient(l)) ingredients.push(l)
      else if (l.length > 18) etapes.push(l)
    }
  }

  // titre : une ligne d'intro (avant la liste d'ingrédients), pas un en-tête ni du blabla
  const avant = idxIng >= 0 ? lignes.slice(0, idxIng) : lignes.slice(0, 4)
  const nom =
    avant.find((l) => l.length >= 4 && l.length < 60 && !/ingr[ée]d|pr[ée]p|[ée]tape/i.test(l) && !FILLER.test(l)) ||
    lignes[0] ||
    'Recette importée'

  const propre = (arr: string[]) => arr.filter((l) => l && l !== nom && !FILLER.test(l))
  return {
    nom: nom.slice(0, 60),
    ingredients: propre(ingredients).filter((l) => !PORTIONS.test(l)),
    etapes: propre(etapes),
  }
}

// Devine quantité + unité + nom à partir d'une ligne « 200 g de pâtes ».
// uniteDetectee/quantiteDetectee : indiquent si c'était écrit (sinon, c'est un défaut).
export function parseLigne(ligne: string): {
  nom: string
  quantite: number
  unite: Unite
  uniteDetectee: boolean
  quantiteDetectee: boolean
} {
  let s = ligne.trim().replace(/^[-•*·\s]+/, '')
  let quantite = 0
  let unite: Unite = 'g'
  let uniteDetectee = false
  let quantiteDetectee = false

  // fractions « 1/2 », « ½ »
  const FRAC: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }
  const fr = s.match(/^(\d+)\s*\/\s*(\d+)\b/)
  const fu = s.match(/^([½¼¾⅓⅔])/)
  if (fr) {
    quantite = parseInt(fr[1], 10) / parseInt(fr[2], 10)
    quantiteDetectee = true
    s = s.slice(fr[0].length)
  } else if (fu) {
    quantite = FRAC[fu[1]]
    quantiteDetectee = true
    s = s.slice(fu[0].length)
  }

  // 1) le nombre, même collé au mot suivant (« 8oeufs »)
  if (!quantiteDetectee) {
    const num = s.match(/^(\d+[.,]?\d*)/)
    if (num) {
      quantite = parseFloat(num[1].replace(',', '.'))
      quantiteDetectee = true
      s = s.slice(num[0].length).trim()
    }
  }
  // 2) l'unité éventuelle juste après (sinon le mot est l'ingrédient, ex. « oeufs »)
  const um = s.match(
    /^(kg|g|ml|cl|l|c\.?\s?à\.?\s?s|càs|cas|cs|cuill?[èe]res?\s+à\s+soupe|c\.?\s?à\.?\s?c|càc|cac|cc|cuill?[èe]res?\s+à\s+caf[ée]|pinc[ée]es?|gousses?|tranches?|sachets?|bo[îi]tes?)\b/i,
  )
  if (um) {
    const u = um[1].toLowerCase()
    uniteDetectee = true
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
    else if (u.startsWith('gousse') || u.startsWith('tranche') || u.startsWith('sachet') || u.startsWith('bo'))
      unite = 'piece'
    s = s.slice(um[0].length).trim()
  }
  s = s.replace(/^\s*(de\s+|d['’]\s*|du\s+|des\s+)/i, '').trim()
  // pas de quantité chiffrée ? on déduit du contenant (« un pot de crème » = 20 cl)
  if (!quantite) {
    const l = norm(ligne)
    if (/\bpot\b/.test(l) && /crem/.test(l)) {
      quantite = 200
      unite = 'ml'
      uniteDetectee = true
    } else if (/\b(brique|berlingot)\b/.test(l) && /(crem|lait)/.test(l)) {
      quantite = 200
      unite = 'ml'
      uniteDetectee = true
    } else if (/\b(boite|conserve|bocal)\b/.test(l)) {
      quantite = 400
      unite = 'g'
      uniteDetectee = true
    } else if (/\bpot\b/.test(l) && /yaourt|fromage blanc/.test(l)) {
      quantite = 125
      unite = 'g'
      uniteDetectee = true
    }
  }
  if (!quantite) quantite = unite === 'g' ? 100 : 1
  return { nom: s || ligne.trim(), quantite, unite, uniteDetectee, quantiteDetectee }
}
