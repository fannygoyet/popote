import type { Unite } from './types'

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
  const t = setTimeout(() => ctrl.abort(), 12000)
  try {
    // --- Instagram ---
    const ig = url.match(/instagram\.com\/(reel|reels|p|tv)\/([\w-]+)/i)
    if (ig) {
      const type = ig[1].toLowerCase() === 'reels' ? 'reel' : ig[1].toLowerCase()
      const embed = `https://www.instagram.com/${type}/${ig[2]}/embed/captioned/`
      try {
        const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(embed), { signal: ctrl.signal })
        if (r.ok) {
          const cap = captionInstagram(await r.text())
          if (cap && cap.length > 20) return cap
        }
      } catch {
        /* on tente Jina ensuite */
      }
      try {
        const r = await fetch('https://r.jina.ai/' + embed, { signal: ctrl.signal })
        if (r.ok) {
          const txt = await r.text()
          if (txt && !/log in|connexion/i.test(txt.slice(0, 200))) return txt
        }
      } catch {
        /* on laissera coller à la main */
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
