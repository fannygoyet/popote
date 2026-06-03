import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { POIDS_PIECE } from '../store/seed'
import type { Ingredient, Moment, Recette, Unite } from '../store/types'

// convertit une quantité+unité en grammes approximatifs pour estimer les calories
function enGrammes(produitId: string, quantite: number, unite: Unite): number {
  switch (unite) {
    case 'g':
    case 'ml':
      return quantite
    case 'piece':
      return quantite * (POIDS_PIECE[produitId] ?? 80)
    case 'cas':
      return quantite * 15
    case 'cac':
      return quantite * 5
    case 'pincee':
      return quantite * 1
  }
}

const EMOJIS = ['🍽️', '🍝', '🍲', '🥘', '🐟', '🍗', '🥗', '🍚', '🍜', '🥪', '🍛', '🥞', '🍳', '🥩', '🌮', '🍕', '🥧', '🍰', '🥦', '🍤']
const MOMENTS: { cle: Moment; label: string }[] = [
  { cle: 'petit-dej', label: 'Petit-déj' },
  { cle: 'dejeuner', label: 'Déjeuner' },
  { cle: 'diner', label: 'Dîner' },
  { cle: 'gouter', label: 'Goûter' },
  { cle: 'dessert', label: 'Dessert' },
]
const TAGS = ['rapide', 'réconfort', 'équilibré', 'végé', 'enfant', 'sucré', 'épicé', 'asiatique', 'été']
const UNITES: Unite[] = ['g', 'ml', 'piece', 'cas', 'cac', 'pincee']
const FECULENTS = new Set([
  'pates', 'riz', 'semoule', 'lentilles', 'farine', 'pain', 'pomme-de-terre', 'gnocchi', 'nouilles',
  'flocons-avoine', 'pate-brisee', 'tortilla', 'cereales', 'pois-chiches',
])

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function CreerRecette() {
  const { data, produit, upsertProduit, addRecette, supprimerRecette } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const st = (loc.state as {
    edit?: Recette
    nom?: string
    etapes?: string[]
    ingredients?: Ingredient[]
    source?: 'reseaux'
    lien?: string
  }) ?? {}
  const edit = st.edit
  const nomInit = st.nom ?? ''

  const [nom, setNom] = useState(edit?.nom ?? nomInit)
  const [emoji, setEmoji] = useState(edit?.emoji ?? '🍽️')
  const [tempsMin, setTempsMin] = useState<number>(edit?.tempsMin ?? 20)
  const [portions, setPortions] = useState<number>(edit?.portions ?? 2)
  const [difficulte, setDifficulte] = useState<1 | 2 | 3>(edit?.difficulte ?? 1)
  const [moments, setMoments] = useState<Moment[]>(edit?.moments ?? ['diner'])
  const [tags, setTags] = useState<string[]>(edit?.tags ?? [])
  const [ingredients, setIngredients] = useState<Ingredient[]>(edit?.ingredients ?? st.ingredients ?? [])
  const [etapes, setEtapes] = useState<string[]>(edit?.etapes ?? (st.etapes?.length ? st.etapes : ['']))
  const [kcalManuel, setKcalManuel] = useState<number | ''>(edit?.kcalPortion ?? '')
  const [ajusterKcal, setAjusterKcal] = useState(false)
  const [rech, setRech] = useState('')

  // estimation des kcal/portion à partir des ingrédients (auto, y compris à la pièce)
  const kcalEstime = useMemo(() => {
    let total = 0
    let couverts = 0
    for (const ing of ingredients) {
      const p = data.produits.find((x) => x.id === ing.produitId)
      if (p?.kcal100 != null) {
        total += (p.kcal100 * enGrammes(ing.produitId, ing.quantite, ing.unite)) / 100
        couverts++
      }
    }
    return {
      kcal: portions > 0 ? Math.round(total / portions) : 0,
      complet: ingredients.length > 0 && couverts === ingredients.length,
    }
  }, [ingredients, portions, data.produits])

  const resultats = useMemo(() => {
    const q = rech.toLowerCase().trim()
    if (!q) return []
    return data.produits.filter((p) => p.nom.toLowerCase().includes(q)).slice(0, 8)
  }, [data.produits, rech])

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  function ajouterIngredient(produitId: string) {
    if (ingredients.some((i) => i.produitId === produitId)) return
    const p = produit(produitId)
    const unite: Unite = p && (p.rayon === 'fruits-legumes' || p.rayon === 'boulangerie') ? 'piece' : 'g'
    setIngredients((x) => [...x, { produitId, quantite: unite === 'piece' ? 1 : 100, unite }])
    setRech('')
  }
  function creerProduitEtAjouter() {
    const id = 'perso-' + slug(rech)
    if (!id) return
    upsertProduit({ id, nom: rech.trim(), rayon: 'autre', type: 'frais', kcal100: null, perissable: false })
    ajouterIngredient(id)
  }
  function majIngredient(i: number, maj: Partial<Ingredient>) {
    setIngredients((x) => x.map((ing, idx) => (idx === i ? { ...ing, ...maj } : ing)))
  }

  function axes(): Pick<Recette, 'proteine' | 'legume' | 'feculent'> {
    let proteine = 0,
      legume = 0,
      feculent = 0
    for (const ing of ingredients) {
      if (ing.optionnel) continue
      const p = produit(ing.produitId)
      if (FECULENTS.has(ing.produitId)) feculent++
      else if (p?.rayon === 'viande-poisson') proteine++
      else if (p?.rayon === 'fruits-legumes') legume++
    }
    const cap = (n: number) => Math.min(3, n) as number
    return { proteine: cap(proteine), legume: cap(legume), feculent: cap(feculent) }
  }

  function enregistrer() {
    const kcalPortion = kcalManuel !== '' ? +kcalManuel : kcalEstime.kcal || 400
    const r: Omit<Recette, 'id'> & { id?: string } = {
      id: edit?.id,
      nom: nom.trim(),
      emoji,
      tempsMin: +tempsMin || 20,
      portions: +portions || 2,
      difficulte,
      moments: moments.length ? moments : ['diner'],
      tags,
      ingredients,
      etapes: etapes.map((e) => e.trim()).filter(Boolean),
      kcalPortion,
      source: edit?.source ?? st.source,
      lien: edit?.lien ?? st.lien,
      ...axes(),
    }
    const id = addRecette(r)
    nav(`/recettes/${id}`, { replace: true })
  }

  const valide = nom.trim().length > 0 && ingredients.length > 0

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <button className="rond" onClick={() => nav(-1)}>
          ←
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <h1>{edit ? 'Modifier' : 'Nouvelle recette'}</h1>
          <p className="sous-titre">Ajoute tes plats à toi, ils rejoignent ta popothèque.</p>
        </div>
      </div>

      {/* Emoji + nom */}
      <div className="carte pile" style={{ gap: 12 }}>
        <div className="ligne" style={{ flexWrap: 'wrap', gap: 6 }}>
          {EMOJIS.map((e) => (
            <button key={e} className={'chip' + (emoji === e ? ' actif' : '')} onClick={() => setEmoji(e)} style={{ fontSize: 20, padding: '6px 10px' }}>
              {e}
            </button>
          ))}
        </div>
        <input className="champ" placeholder="Nom de la recette (ex. Spaghetti saumon)" value={nom} onChange={(e) => setNom(e.target.value)} />
      </div>

      {/* Temps / portions / difficulté */}
      <div className="carte pile" style={{ gap: 12 }}>
        <div className="ligne espace">
          <span style={{ fontWeight: 700 }}>⏱️ Temps (min)</span>
          <input className="champ" type="number" inputMode="numeric" style={{ maxWidth: 90 }} value={tempsMin} onChange={(e) => setTempsMin(+e.target.value)} />
        </div>
        <div className="ligne espace">
          <span style={{ fontWeight: 700 }}>🍽️ Portions</span>
          <div className="compteur">
            <button onClick={() => setPortions((p) => Math.max(1, p - 1))}>−</button>
            <span className="v">{portions}</span>
            <button onClick={() => setPortions((p) => p + 1)}>+</button>
          </div>
        </div>
        <div className="ligne espace">
          <span style={{ fontWeight: 700 }}>Difficulté</span>
          <div className="ligne" style={{ gap: 6 }}>
            {([1, 2, 3] as const).map((n) => (
              <button key={n} className={'chip' + (difficulte === n ? ' actif' : '')} onClick={() => setDifficulte(n)}>
                {'⭐'.repeat(n)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Moments + tags */}
      <div>
        <span className="label">Quand ?</span>
        <div className="tags">
          {MOMENTS.map((m) => (
            <button key={m.cle} className={'chip' + (moments.includes(m.cle) ? ' actif' : '')} onClick={() => toggle(moments, m.cle, setMoments)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Style</span>
        <div className="tags">
          {TAGS.map((t) => (
            <button key={t} className={'chip' + (tags.includes(t) ? ' actif' : '')} onClick={() => toggle(tags, t, setTags)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Ingrédients */}
      <div className="carte pile" style={{ gap: 10 }}>
        <strong>Ingrédients</strong>
        {ingredients.map((ing, i) => (
          <div className="ligne" key={ing.produitId} style={{ gap: 8 }}>
            <span style={{ flex: 1, fontWeight: 700 }}>{produit(ing.produitId)?.nom ?? ing.produitId}</span>
            <input
              className="champ"
              type="number"
              inputMode="numeric"
              style={{ width: 70, padding: '8px 10px' }}
              value={ing.quantite}
              onChange={(e) => majIngredient(i, { quantite: +e.target.value })}
            />
            <select className="champ" style={{ width: 80, padding: '8px 10px' }} value={ing.unite} onChange={(e) => majIngredient(i, { unite: e.target.value as Unite })}>
              {UNITES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <button className="rond" style={{ width: 32, height: 32 }} onClick={() => setIngredients((x) => x.filter((_, idx) => idx !== i))}>
              ✕
            </button>
          </div>
        ))}

        <input className="champ" placeholder="🔍 Ajouter un ingrédient…" value={rech} onChange={(e) => setRech(e.target.value)} />
        {resultats.map((p) => (
          <button key={p.id} className="ligne espace" onClick={() => ajouterIngredient(p.id)} style={{ padding: '8px 4px', textAlign: 'left' }}>
            <span>{p.nom}</span>
            <span className="tag">+ ajouter</span>
          </button>
        ))}
        {rech.trim() && resultats.every((p) => p.nom.toLowerCase() !== rech.toLowerCase().trim()) && (
          <button className="btn fantome petit" onClick={creerProduitEtAjouter}>
            + Créer l'ingrédient « {rech.trim()} »
          </button>
        )}
      </div>

      {/* Étapes */}
      <div className="carte pile" style={{ gap: 10 }}>
        <strong>Préparation</strong>
        {etapes.map((e, i) => (
          <div className="ligne" key={i} style={{ gap: 8, alignItems: 'flex-start' }}>
            <span className="rond" style={{ width: 28, height: 28, fontSize: 14 }}>
              {i + 1}
            </span>
            <textarea
              className="champ"
              style={{ flex: 1, minHeight: 44, resize: 'vertical' }}
              placeholder="Étape…"
              value={e}
              onChange={(ev) => setEtapes((x) => x.map((s, idx) => (idx === i ? ev.target.value : s)))}
            />
            {etapes.length > 1 && (
              <button className="rond" style={{ width: 32, height: 32 }} onClick={() => setEtapes((x) => x.filter((_, idx) => idx !== i))}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button className="btn fantome petit" onClick={() => setEtapes((x) => [...x, ''])}>
          + Ajouter une étape
        </button>
      </div>

      {/* Calories — calculées automatiquement, pas besoin de les connaître */}
      <div className="carte pile" style={{ gap: 10 }}>
        <strong>🔥 Calories</strong>
        {kcalManuel === '' ? (
          <>
            <div className="ligne" style={{ gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 30, fontWeight: 900 }}>
                {ingredients.length ? `~${kcalEstime.kcal}` : '—'}
              </span>
              <span className="sous-titre">kcal / portion</span>
            </div>
            <p className="sous-titre" style={{ margin: 0 }}>
              {ingredients.length === 0
                ? 'Ajoute des ingrédients, je calcule tout seul.'
                : kcalEstime.complet
                  ? 'Calculé à partir de tes ingrédients. Pas besoin de connaître les calories 😊'
                  : 'Estimation (certains ingrédients ajoutés à la main n\'ont pas d\'info nutrition).'}
            </p>
            <button className="btn fantome petit" onClick={() => { setAjusterKcal(true); setKcalManuel(kcalEstime.kcal) }}>
              ✏️ Ajuster moi-même
            </button>
          </>
        ) : (
          <>
            <input
              className="champ"
              type="number"
              inputMode="numeric"
              placeholder="kcal par portion"
              value={kcalManuel}
              onChange={(e) => setKcalManuel(e.target.value ? +e.target.value : '')}
            />
            <button className="btn fantome petit" onClick={() => { setAjusterKcal(false); setKcalManuel('') }}>
              ↩️ Revenir au calcul auto (~{kcalEstime.kcal})
            </button>
          </>
        )}
      </div>

      <button className="btn bloc" disabled={!valide} onClick={enregistrer}>
        {edit ? 'Enregistrer les modifs' : 'Créer la recette 🎉'}
      </button>

      {edit && (
        <button
          className="btn clair bloc"
          style={{ color: '#a33a63' }}
          onClick={() => {
            if (confirm('Supprimer cette recette ?')) {
              supprimerRecette(edit.id)
              nav('/recettes', { replace: true })
            }
          }}
        >
          Supprimer la recette
        </button>
      )}
    </div>
  )
}
