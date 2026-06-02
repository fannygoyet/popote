import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'

export function RecetteDetail() {
  const { id } = useParams()
  const { data, produit, faisabilite, cuisiner, ajouterAuxCourses, noter, avisPour } = useStore()
  const nav = useNavigate()
  const loc = useLocation()

  const recette = data.recettes.find((r) => r.id === id)
  const [pour, setPour] = useState<string[]>(
    (loc.state as { pour?: string[] })?.pour ?? data.personnes.map((p) => p.id),
  )
  const [portions, setPortions] = useState(recette?.portions ?? 2)
  const [cuit, setCuit] = useState(false)

  if (!recette) return <div className="ecran vide">Recette introuvable.</div>

  const { manquants } = faisabilite(recette)
  const ratio = portions / recette.portions

  function enStock(produitId: string) {
    const s = data.stock.find((x) => x.produitId === produitId)
    return !!s && s.quantite > 0
  }

  function ajouterCourses() {
    ajouterAuxCourses(
      manquants.map((m) => ({ ...m, quantite: Math.round(m.quantite * ratio) })),
    )
    nav('/courses')
  }

  function jaiCuisine() {
    cuisiner(recette!.id, portions, pour)
    setCuit(true)
  }

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <button className="rond" onClick={() => nav(-1)}>
          ←
        </button>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72 }}>{recette.emoji}</div>
        <h1 style={{ fontSize: 26 }}>{recette.nom}</h1>
        <div className="ligne" style={{ justifyContent: 'center', gap: 16, marginTop: 6, color: 'var(--texte-doux)' }}>
          <span>⏱️ {recette.tempsMin} min</span>
          <span>🔥 {Math.round(recette.kcalPortion)} kcal/pers</span>
          <span>{'⭐'.repeat(recette.difficulte)}</span>
        </div>
        <div className="tags" style={{ justifyContent: 'center', marginTop: 10 }}>
          {recette.tags.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {cuit ? (
        <Notation recetteId={recette.id} pour={pour} onFini={() => nav('/')} />
      ) : (
        <>
          {/* Portions */}
          <div className="carte ligne espace">
            <strong>Portions</strong>
            <div className="compteur">
              <button onClick={() => setPortions((p) => Math.max(1, p - 1))}>−</button>
              <span className="v">{portions}</span>
              <button onClick={() => setPortions((p) => p + 1)}>+</button>
            </div>
          </div>

          {/* Pour qui */}
          <div>
            <span className="label">Pour qui ?</span>
            <div className="tags">
              {data.personnes.map((p) => (
                <button
                  key={p.id}
                  className={'chip' + (pour.includes(p.id) ? ' actif' : '')}
                  onClick={() =>
                    setPour((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))
                  }
                >
                  {p.emoji} {p.nom}
                </button>
              ))}
            </div>
          </div>

          {/* Ingrédients */}
          <div className="carte pile" style={{ gap: 10 }}>
            <strong>Ingrédients</strong>
            {recette.ingredients.map((ing) => {
              const besoin = Math.round(ing.quantite * ratio * 10) / 10
              const ok = enStock(ing.produitId)
              return (
                <div className="ligne espace" key={ing.produitId}>
                  <span style={{ opacity: ing.optionnel ? 0.6 : 1 }}>
                    {ok ? '✅' : '⬜'} {produit(ing.produitId)?.nom ?? ing.produitId}
                    {ing.optionnel ? ' (optionnel)' : ''}
                  </span>
                  <span style={{ color: 'var(--texte-doux)', fontWeight: 700 }}>
                    {besoin} {ing.unite === 'piece' ? '' : ing.unite}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Étapes */}
          <div className="carte pile" style={{ gap: 10 }}>
            <strong>Préparation</strong>
            {recette.etapes.map((e, i) => (
              <div className="ligne" key={i} style={{ alignItems: 'flex-start', gap: 10 }}>
                <span className="rond" style={{ width: 28, height: 28, fontSize: 14 }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1 }}>{e}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {manquants.length > 0 && (
            <button className="btn fantome bloc" onClick={ajouterCourses}>
              🛒 Ajouter {manquants.length} ingrédient{manquants.length > 1 ? 's' : ''} aux courses
            </button>
          )}
          <button className="btn bloc" onClick={jaiCuisine}>
            🍳 J'ai cuisiné ça !
          </button>
          <p className="sous-titre" style={{ textAlign: 'center', margin: 0 }}>
            En validant, je retire les ingrédients de tes placards.
          </p>
        </>
      )}
    </div>
  )
}

// Bloc de notation après cuisson : like/dislike + étoiles par personne.
function Notation({
  recetteId,
  pour,
  onFini,
}: {
  recetteId: string
  pour: string[]
  onFini: () => void
}) {
  const { data, noter, avisPour } = useStore()
  const gens = data.personnes.filter((p) => pour.includes(p.id))

  return (
    <div className="pile" style={{ gap: 16 }}>
      <Mascotte texte="Et alors, c'était bon ? Donne ton avis, je m'en souviendrai !" emoji="😋" />
      {gens.map((p) => {
        const av = avisPour(recetteId, p.id)
        return (
          <div className="carte pile" key={p.id} style={{ gap: 12 }}>
            <strong>
              {p.emoji} {p.nom}
            </strong>
            <div className="ligne" style={{ gap: 8 }}>
              <button
                className={'chip aime' + (av?.note === 1 ? ' actif' : '')}
                onClick={() => noter(recetteId, p.id, 1, av?.etoiles)}
              >
                👍 J'adore
              </button>
              <button
                className={'chip moyen' + (av?.note === 0 ? ' actif' : '')}
                onClick={() => noter(recetteId, p.id, 0, av?.etoiles)}
              >
                😐 Bof
              </button>
              <button
                className={'chip pasaime' + (av?.note === -1 ? ' actif' : '')}
                onClick={() => noter(recetteId, p.id, -1, av?.etoiles)}
              >
                👎 Non
              </button>
            </div>
            <div className="ligne" style={{ gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => noter(recetteId, p.id, av?.note ?? 1, n)}
                  style={{ fontSize: 26, opacity: (av?.etoiles ?? 0) >= n ? 1 : 0.3 }}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>
        )
      })}
      <button className="btn bloc" onClick={onFini}>
        Terminé ✓
      </button>
    </div>
  )
}
