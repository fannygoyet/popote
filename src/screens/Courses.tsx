import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import type { Rayon } from '../store/types'

const RAYONS: { cle: Rayon; label: string; ic: string }[] = [
  { cle: 'fruits-legumes', label: 'Fruits & légumes', ic: '🥕' },
  { cle: 'viande-poisson', label: 'Viande & poisson', ic: '🍗' },
  { cle: 'cremerie', label: 'Crémerie', ic: '🧀' },
  { cle: 'surgele', label: 'Surgelés', ic: '❄️' },
  { cle: 'boulangerie', label: 'Boulangerie', ic: '🥖' },
  { cle: 'epicerie', label: 'Épicerie', ic: '🥫' },
  { cle: 'autre', label: 'Autre', ic: '🛍️' },
]

export function Courses() {
  const { data, produit, toggleCourse, majQuantiteCourse, viderCochees, ajouterAuxCourses } = useStore()
  const [ajout, setAjout] = useState(false)
  const [recherche, setRecherche] = useState('')

  const total = data.courses.length
  const coches = data.courses.filter((c) => c.coche).length

  const resultats = useMemo(
    () =>
      data.produits
        .filter((p) => p.nom.toLowerCase().includes(recherche.toLowerCase().trim()))
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    [data.produits, recherche],
  )

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <div>
          <h1>Courses 🛒</h1>
          <p className="sous-titre">
            {total === 0 ? 'Liste vide' : `${coches}/${total} dans le panier`}
          </p>
        </div>
        <button className="rond" onClick={() => setAjout(true)}>
          +
        </button>
      </div>

      {total === 0 && (
        <div className="vide">
          <div className="gros">🧾</div>
          Rien à acheter. Ajoute des recettes dans ta semaine, ou un produit avec « + ».
        </div>
      )}

      {RAYONS.map(({ cle, label, ic }) => {
        const items = data.courses.filter((c) => (produit(c.produitId)?.rayon ?? 'autre') === cle)
        if (items.length === 0) return null
        return (
          <div className="pile" key={cle} style={{ gap: 8 }}>
            <h3 style={{ fontSize: 16, marginLeft: 4 }}>
              {ic} {label}
            </h3>
            {items.map((c) => (
              <div className="carte ligne espace" key={c.produitId} style={{ padding: '12px 16px' }}>
                <button
                  className="ligne"
                  onClick={() => toggleCourse(c.produitId)}
                  style={{ gap: 10, flex: 1, textAlign: 'left' }}
                >
                  <span className="rond" style={{ width: 28, height: 28, fontSize: 16, background: c.coche ? 'var(--menthe)' : 'var(--lilas-clair)' }}>
                    {c.coche ? '✓' : ''}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      textDecoration: c.coche ? 'line-through' : 'none',
                      opacity: c.coche ? 0.5 : 1,
                    }}
                  >
                    {produit(c.produitId)?.nom ?? c.produitId}
                  </span>
                </button>
                <div className="compteur">
                  <button onClick={() => majQuantiteCourse(c.produitId, -1)}>−</button>
                  <span className="v">{c.quantite}</span>
                  <button onClick={() => majQuantiteCourse(c.produitId, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {coches > 0 && (
        <button className="btn bloc" onClick={viderCochees} style={{ background: 'var(--menthe)', color: '#2c6b53' }}>
          ✓ Ranger les {coches} produit{coches > 1 ? 's' : ''} cochés dans les placards
        </button>
      )}

      {ajout && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(74,68,88,.35)', zIndex: 40, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setAjout(false)}
        >
          <div
            className="pile"
            style={{
              background: 'var(--lilas-fond)',
              width: '100%',
              maxWidth: 480,
              margin: '0 auto',
              borderRadius: '30px 30px 0 0',
              padding: 16,
              maxHeight: '80vh',
              overflowY: 'auto',
              gap: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ligne espace">
              <h3>Ajouter à la liste</h3>
              <button className="btn clair petit" onClick={() => setAjout(false)}>
                Fermer
              </button>
            </div>
            <input
              className="champ"
              autoFocus
              placeholder="🔍 Chercher un produit…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            {resultats.map((p) => (
              <button
                key={p.id}
                className="carte ligne espace"
                style={{ padding: '12px 16px', textAlign: 'left' }}
                onClick={() => {
                  ajouterAuxCourses([{ produitId: p.id, quantite: 1, unite: 'piece' }])
                  setAjout(false)
                }}
              >
                <strong>{p.nom}</strong>
                <span className="tag">{p.rayon}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
