import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'
import type { Ingredient, Unite } from '../store/types'

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Devine quantité + unité + nom à partir d'une ligne « 200 g de pâtes ».
function parseLigne(ligne: string): { nom: string; quantite: number; unite: Unite } {
  let s = ligne.trim().replace(/^[-•*·\s]+/, '')
  let quantite = 0
  let unite: Unite = 'g'
  const m = s.match(/^(\d+[.,]?\d*)\s*(kg|g|ml|cl|l|c\.?\s?à\.?\s?s|càs|cas|cuill?[èe]res?\s+à\s+soupe|c\.?\s?à\.?\s?c|càc|cac|cuill?[èe]res?\s+à\s+caf[ée]|pinc[ée]es?|gousses?|tranches?|œufs?|oeufs?)?\b/i)
  if (m) {
    quantite = parseFloat(m[1].replace(',', '.'))
    const u = (m[2] || '').toLowerCase()
    if (u.startsWith('kg')) { unite = 'g'; quantite *= 1000 }
    else if (u === 'g') unite = 'g'
    else if (u === 'ml') unite = 'ml'
    else if (u === 'cl') { unite = 'ml'; quantite *= 10 }
    else if (u === 'l') { unite = 'ml'; quantite *= 1000 }
    else if (u.includes('soup') || u === 'càs' || u === 'cas' || /^c.?a.?s$/.test(u)) unite = 'cas'
    else if (u.includes('caf') || u === 'càc' || u === 'cac' || /^c.?a.?c$/.test(u)) unite = 'cac'
    else if (u.startsWith('pinc')) unite = 'pincee'
    else if (u.startsWith('gousse') || u.startsWith('tranche') || u.includes('uf')) unite = 'piece'
    s = s.slice(m[0].length)
  }
  // nettoie « de / d' » et espaces
  s = s.replace(/^\s*(de\s+|d['’]\s*)/i, '').trim()
  if (!quantite) quantite = unite === 'g' ? 100 : 1
  return { nom: s || ligne.trim(), quantite, unite }
}

export function ImportReel() {
  const { data, upsertProduit } = useStore()
  const nav = useNavigate()
  const [lien, setLien] = useState('')
  const [ingredientsTxt, setIngredientsTxt] = useState('')
  const [etapesTxt, setEtapesTxt] = useState('')
  const [nom, setNom] = useState('')

  // si l'app a été ouverte via un "Partager" (Android), on récupère l'URL partagée
  useEffect(() => {
    const q = window.location.hash.split('?')[1]
    if (!q) return
    const p = new URLSearchParams(q)
    const url = p.get('url') || p.get('text')
    if (url) setLien(url)
    if (p.get('title')) setNom(p.get('title') || '')
  }, [])

  function trouverOuCreer(nomIng: string): string {
    const q = nomIng.toLowerCase().trim()
    const exact = data.produits.find((p) => p.nom.toLowerCase() === q)
    if (exact) return exact.id
    const inclus = data.produits.find(
      (p) => q.includes(p.nom.toLowerCase()) || p.nom.toLowerCase().includes(q),
    )
    if (inclus) return inclus.id
    const id = 'perso-' + slug(nomIng)
    upsertProduit({ id, nom: nomIng.trim().slice(0, 40), rayon: 'autre', type: 'frais', kcal100: null, perissable: false })
    return id
  }

  function creer() {
    const ingredients: Ingredient[] = ingredientsTxt
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const { nom: n, quantite, unite } = parseLigne(l)
        return { produitId: trouverOuCreer(n), quantite, unite }
      })
    const etapes = etapesTxt.split('\n').map((l) => l.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean)
    nav('/creer-recette', {
      state: {
        nom: nom.trim() || 'Recette de réel',
        etapes,
        ingredients,
        source: 'reseaux',
        lien: lien.trim() || undefined,
      },
    })
  }

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <button className="rond" onClick={() => nav(-1)}>
          ←
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <h1>Importer un réel 📱</h1>
          <p className="sous-titre">Récupère une recette vue sur Instagram ou TikTok.</p>
        </div>
      </div>

      <Mascotte
        texte="Colle le lien et la description de la vidéo, je te prépare la recette. Tu n'auras qu'à vérifier !"
        emoji="📱"
      />

      <div className="carte pile" style={{ gap: 12 }}>
        <div>
          <span className="label">Nom du plat</span>
          <input className="champ" placeholder="ex. Pâtes au pesto express" value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
        <div>
          <span className="label">Lien de la vidéo (optionnel)</span>
          <input className="champ" placeholder="colle le lien Instagram / TikTok" value={lien} onChange={(e) => setLien(e.target.value)} />
        </div>
        <div>
          <span className="label">Ingrédients (un par ligne)</span>
          <textarea
            className="champ"
            style={{ minHeight: 110, resize: 'vertical' }}
            placeholder={'200 g de pâtes\n2 cuillères à soupe de pesto\n1 gousse d\'ail'}
            value={ingredientsTxt}
            onChange={(e) => setIngredientsTxt(e.target.value)}
          />
        </div>
        <div>
          <span className="label">Étapes (une par ligne)</span>
          <textarea
            className="champ"
            style={{ minHeight: 110, resize: 'vertical' }}
            placeholder={'Cuire les pâtes\nMélanger avec le pesto\nServir'}
            value={etapesTxt}
            onChange={(e) => setEtapesTxt(e.target.value)}
          />
        </div>
      </div>

      <button className="btn bloc" disabled={!ingredientsTxt.trim()} onClick={creer}>
        Préparer la recette →
      </button>
      <p className="sous-titre" style={{ textAlign: 'center', margin: 0 }}>
        Astuce : sur la vidéo, copie la description, reviens ici et colle-la dans les bonnes cases.
      </p>
    </div>
  )
}
