import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'
import { analyserTexte, matcherProduit, nettoyerNomProduit, parseLigne, recupererDepuisLien } from '../store/extraction'
import type { Ingredient } from '../store/types'

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function ImportReel() {
  const { data, upsertProduit } = useStore()
  const nav = useNavigate()
  const [lien, setLien] = useState('')
  const [texte, setTexte] = useState('')
  const [chargement, setChargement] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // ouverture via "Partager" (Android) : on récupère l'URL passée en paramètre
  useEffect(() => {
    const q = window.location.hash.split('?')[1]
    if (!q) return
    const p = new URLSearchParams(q)
    const url = p.get('url') || p.get('text')
    if (url && /https?:\/\//.test(url)) {
      setLien(url)
      recuperer(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function recuperer(url = lien) {
    if (!url.trim()) return
    setChargement(true)
    setMsg('Je lis la vidéo…')
    const t = await recupererDepuisLien(url.trim())
    setChargement(false)
    if (t) {
      setTexte(t)
      setMsg('✓ Texte récupéré ! Vérifie en dessous, puis crée la recette.')
    } else {
      setMsg("Je n'ai pas réussi à lire ce lien (Instagram bloque parfois). Copie-colle la description à la main ci-dessous.")
    }
  }

  function trouverOuCreer(nomIng: string): string {
    // rapprochement intelligent (ignore « un pot de », « frais »…)
    const match = matcherProduit(nomIng, data.produits)
    if (match) return match
    // sinon, on crée un produit au nom propre (« Crème », pas « un pot de crème »)
    const nomP = nettoyerNomProduit(nomIng)
    const id = 'perso-' + (slug(nomP) || slug(nomIng) || 'ingredient')
    const existe = data.produits.find((p) => p.id === id)
    if (existe) return id
    upsertProduit({ id, nom: nomP, rayon: 'autre', type: 'frais', kcal100: null, perissable: false })
    return id
  }

  function creer() {
    const ex = analyserTexte(texte)
    const ingredients: Ingredient[] = ex.ingredients.map((l) => {
      const { nom, quantite, unite } = parseLigne(l)
      return { produitId: trouverOuCreer(nom), quantite, unite }
    })
    nav('/creer-recette', {
      state: {
        nom: ex.nom,
        etapes: ex.etapes,
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
          <p className="sous-titre">Colle le lien, je m'occupe du reste.</p>
        </div>
      </div>

      <Mascotte
        texte="Colle le lien de la vidéo TikTok ou Insta. Je récupère la recette et je vire les hashtags et le blabla. 😉"
        emoji="📱"
      />

      <div className="carte pile" style={{ gap: 10 }}>
        <span className="label">Lien de la vidéo</span>
        <input
          className="champ"
          placeholder="colle le lien TikTok / Instagram"
          value={lien}
          onChange={(e) => setLien(e.target.value)}
          inputMode="url"
        />
        <button className="btn bloc" disabled={!lien.trim() || chargement} onClick={() => recuperer()}>
          {chargement ? '⏳ Lecture…' : '⬇️ Récupérer la recette'}
        </button>
        <p className="sous-titre" style={{ margin: 0 }}>
          Sur la vidéo : bouton <strong>Partager → Copier le lien</strong>, puis colle-le ici.
        </p>
      </div>

      {msg && (
        <div className="carte" style={{ background: 'var(--menthe-clair)', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div className="carte pile" style={{ gap: 8 }}>
        <span className="label">Texte de la recette (récupéré, ou collé à la main)</span>
        <textarea
          className="champ"
          style={{ minHeight: 160, resize: 'vertical' }}
          placeholder="Le texte de la vidéo apparaîtra ici. Tu peux aussi le coller toi-même."
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
        />
        <p className="sous-titre" style={{ margin: 0 }}>
          Je nettoie les hashtags/mentions et je sépare les ingrédients des étapes automatiquement. Tu
          pourras tout vérifier à l'étape suivante.
        </p>
      </div>

      <button className="btn bloc" disabled={!texte.trim()} onClick={creer}>
        ✨ Créer la recette
      </button>
    </div>
  )
}
