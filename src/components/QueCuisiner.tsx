import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { recettesEnLigne, type IdeeRecette } from '../store/themealdb'
import type { Produit } from '../store/types'

export function QueCuisiner({ produit, onClose }: { produit: Produit; onClose: () => void }) {
  const { recettesPourProduit } = useStore()
  const nav = useNavigate()
  const mes = recettesPourProduit(produit.id)
  const [enLigne, setEnLigne] = useState<IdeeRecette[] | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let vivant = true
    recettesEnLigne(produit).then((r) => {
      if (vivant) {
        setEnLigne(r)
        setChargement(false)
      }
    })
    return () => {
      vivant = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(74,68,88,.35)', zIndex: 45, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        className="pile"
        style={{ background: 'var(--lilas-fond)', width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '30px 30px 0 0', padding: 16, maxHeight: '85vh', overflowY: 'auto', gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ligne espace">
          <h3>Que cuisiner avec {produit.nom} ? 🍳</h3>
          <button className="btn clair petit" onClick={onClose}>
            Fermer
          </button>
        </div>

        {/* Recettes de ta popothèque */}
        <span className="label" style={{ margin: 0 }}>
          Dans tes recettes
        </span>
        {mes.length === 0 && <span className="sous-titre">Aucune recette de ton catalogue avec ça… regarde les idées en ligne 👇</span>}
        {mes.map((r) => (
          <button
            key={r.id}
            className="carte ligne"
            style={{ textAlign: 'left', gap: 12 }}
            onClick={() => nav(`/recettes/${r.id}`)}
          >
            <span style={{ fontSize: 30 }}>{r.emoji}</span>
            <div style={{ flex: 1 }}>
              <strong>{r.nom}</strong>
              <div className="sous-titre" style={{ fontSize: 12 }}>
                ⏱️ {r.tempsMin} min
              </div>
            </div>
            <span style={{ color: 'var(--texte-doux)' }}>→</span>
          </button>
        ))}

        {/* Idées en ligne (TheMealDB) */}
        <span className="label" style={{ marginTop: 6 }}>
          Idées en ligne {chargement && '…'}
        </span>
        {!chargement && (enLigne?.length ?? 0) === 0 && (
          <span className="sous-titre">
            Pas d'idée en ligne pour cet aliment.{' '}
            <a href={`https://www.google.com/search?q=recette+${encodeURIComponent(produit.nom)}`} target="_blank" rel="noreferrer">
              Chercher sur le web
            </a>
          </span>
        )}
        <div className="grille-2">
          {(enLigne ?? []).map((idee) => (
            <a
              key={idee.lien}
              href={idee.lien}
              target="_blank"
              rel="noreferrer"
              className="carte pile"
              style={{ padding: 0, overflow: 'hidden', textDecoration: 'none', gap: 0 }}
            >
              <img src={idee.img} alt="" style={{ width: '100%', height: 90, objectFit: 'cover' }} loading="lazy" />
              <span style={{ padding: '8px 10px', fontWeight: 700, fontSize: 13 }}>{idee.nom}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
