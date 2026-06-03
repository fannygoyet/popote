import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { PRODUITS_SEED } from '../store/seed'
import type { Produit } from '../store/types'

// Permet d'associer un article (scanné/manuel) à un ingrédient générique connu
// des recettes -> il devient utilisable dans les propositions.
export function ConceptPicker({ produit, onClose }: { produit: Produit; onClose: () => void }) {
  const { setCanon, produit: getProduit } = useStore()
  const [q, setQ] = useState('')

  const concepts = useMemo(
    () =>
      PRODUITS_SEED.filter((c) => c.nom.toLowerCase().includes(q.toLowerCase().trim())).sort((a, b) =>
        a.nom.localeCompare(b.nom),
      ),
    [q],
  )
  const actuel = produit.canonId ? getProduit(produit.canonId) : undefined

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(74,68,88,.35)', zIndex: 48, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        className="pile"
        style={{ background: 'var(--lilas-fond)', width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '30px 30px 0 0', padding: 16, maxHeight: '85vh', overflowY: 'auto', gap: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ligne espace">
          <h3>C'est quoi, « {produit.nom} » ? 🏷️</h3>
          <button className="btn clair petit" onClick={onClose}>
            Fermer
          </button>
        </div>
        <p className="sous-titre" style={{ margin: 0 }}>
          Associe-le à un ingrédient générique pour qu'il compte dans tes recettes.
        </p>

        {actuel && (
          <div className="carte ligne espace" style={{ background: 'var(--menthe-clair)' }}>
            <span>
              Reconnu comme : <strong>{actuel.nom}</strong>
            </span>
            <button className="btn clair petit" onClick={() => { setCanon(produit.id, null); onClose() }}>
              Retirer
            </button>
          </div>
        )}

        <input className="champ" autoFocus placeholder="🔍 saumon, courgette, riz…" value={q} onChange={(e) => setQ(e.target.value)} />
        {concepts.map((c) => (
          <button
            key={c.id}
            className="carte ligne espace"
            style={{ padding: '12px 16px', textAlign: 'left' }}
            onClick={() => { setCanon(produit.id, c.id); onClose() }}
          >
            <strong>{c.nom}</strong>
            <span className="tag">{c.rayon}</span>
          </button>
        ))}

        <p className="sous-titre" style={{ margin: '6px 0 0' }}>
          Pas dans la liste ? Exporte ton placard (bouton en haut) et envoie-le moi : j'ajoute des
          recettes pour ces ingrédients. 😉
        </p>
      </div>
    </div>
  )
}
