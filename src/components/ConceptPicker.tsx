import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import type { Produit } from '../store/types'

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Associe un article (scanné/manuel) à un ingrédient générique connu des recettes,
// OU permet de créer un nouvel ingrédient si aucun ne convient.
export function ConceptPicker({ produit, onClose }: { produit: Produit; onClose: () => void }) {
  const { data, setCanon, setSansConcept, upsertProduit, produit: getProduit } = useStore()
  const [q, setQ] = useState('')

  // concepts = ingrédients de référence (tout sauf les articles bruts off-/perso-)
  const concepts = useMemo(
    () =>
      data.produits
        .filter((p) => !p.id.startsWith('off-') && !p.id.startsWith('perso-') && p.id !== produit.id)
        .filter((p) => p.nom.toLowerCase().includes(q.toLowerCase().trim()))
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    [data.produits, q, produit.id],
  )
  const actuel = produit.canonId ? getProduit(produit.canonId) : undefined
  const ql = q.trim()
  const existeDeja = concepts.some((c) => c.nom.toLowerCase() === ql.toLowerCase())

  function creerConcept() {
    const id = 'concept-' + slug(ql)
    if (!id || id === 'concept-') return
    upsertProduit({ id, nom: ql, rayon: produit.rayon, type: produit.type, kcal100: produit.kcal100, perissable: produit.perissable })
    setCanon(produit.id, id)
    onClose()
  }

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
          Associe-le à un ingrédient (ton produit garde son nom). S'il n'existe pas, crée-le.
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

        <button className="btn fantome bloc petit" onClick={() => { setSansConcept(produit.id, true); onClose() }}>
          🙅 Laisser tel quel (pas un ingrédient de recette)
        </button>

        <input className="champ" autoFocus placeholder="🔍 chercher ou nommer un ingrédient…" value={q} onChange={(e) => setQ(e.target.value)} />

        {ql.length >= 2 && !existeDeja && (
          <button className="btn bloc" onClick={creerConcept}>
            ➕ Créer l'ingrédient « {ql} »
          </button>
        )}

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
      </div>
    </div>
  )
}
