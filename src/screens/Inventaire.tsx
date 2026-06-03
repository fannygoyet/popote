import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { Scanner } from '../components/Scanner'
import { chercherProduitParCodeBarres } from '../store/openfoodfacts'
import type { Lieu, Produit } from '../store/types'

const LIEUX: { cle: Lieu; label: string; ic: string }[] = [
  { cle: 'frigo', label: 'Frigo', ic: '🧊' },
  { cle: 'placard', label: 'Placard', ic: '🥫' },
  { cle: 'congelo', label: 'Congélo', ic: '❄️' },
]

export function Inventaire() {
  const { data, produit, setStock, ajusterStock, upsertProduit, supprimerProduit } = useStore()
  const [scan, setScan] = useState(false)
  const [mode, setMode] = useState<'courses' | 'complet'>('courses')
  const [ajout, setAjout] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [recon, setRecon] = useState<Produit[] | null>(null) // produits non scannés en mode complet
  const [aRetirer, setARetirer] = useState<Set<string>>(new Set())
  const scannes = useRef<Set<string>>(new Set()) // produits vus pendant la session de scan

  function qte(produitId: string) {
    return data.stock.find((s) => s.produitId === produitId)?.quantite ?? 0
  }

  // Un scan = « j'en ai » (présence). On ne ré-incrémente pas : pas de quantité surprise.
  // Renvoie le nom ajouté (ou null si le produit est inconnu d'Open Food Facts).
  async function onCode(code: string): Promise<string | null> {
    const existant = data.produits.find((p) => p.codeBarres === code)
    if (existant) {
      scannes.current.add(existant.id)
      setStock(existant.id, Math.max(1, qte(existant.id)))
      return existant.nom
    }
    const trouve = await chercherProduitParCodeBarres(code)
    if (trouve) {
      scannes.current.add(trouve.id)
      upsertProduit(trouve)
      setStock(trouve.id, 1)
      return trouve.nom
    }
    return null
  }

  function ouvrirScan(m: 'courses' | 'complet') {
    scannes.current = new Set()
    setMode(m)
    setScan(true)
  }

  // À la fermeture du scan : en mode "inventaire complet", on repère ce qui était
  // en stock mais n'a pas été scanné -> « tu n'aurais pas oublié… ? »
  function fermerScan() {
    setScan(false)
    if (mode === 'complet') {
      const oublis = data.stock
        .filter((s) => s.quantite > 0 && !scannes.current.has(s.produitId))
        .map((s) => produit(s.produitId))
        .filter(Boolean) as Produit[]
      if (oublis.length) {
        setARetirer(new Set())
        setRecon(oublis)
      } else {
        setMsg('Inventaire à jour ✓')
      }
    }
  }

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
          <h1>Mes placards 🧺</h1>
          <p className="sous-titre">{data.stock.length} produits en stock</p>
        </div>
      </div>

      <div className="grille-2">
        <button className="btn bloc" onClick={() => ouvrirScan('courses')}>
          🛒 Scanner mes courses
        </button>
        <button className="btn fantome bloc" onClick={() => setAjout(true)}>
          🥕 Ajouter du frais
        </button>
      </div>
      <button className="btn fantome bloc" onClick={() => ouvrirScan('complet')}>
        🧾 Refaire tout mon inventaire
      </button>
      <p className="sous-titre" style={{ margin: '-6px 4px 0' }}>
        « Mes courses » ajoute ce que tu scannes. « Inventaire complet » : tu scannes tout, et je te
        signale ce qui manque à l'appel.
      </p>

      {msg && (
        <div className="carte ligne espace" style={{ background: 'var(--menthe-clair)' }}>
          <span style={{ fontWeight: 700 }}>{msg}</span>
          <button className="rond" style={{ width: 30, height: 30 }} onClick={() => setMsg(null)}>
            ✓
          </button>
        </div>
      )}

      {data.stock.length === 0 && (
        <div className="vide">
          <div className="gros">🛒</div>
          Tes placards sont vides. Scanne tes produits ou ajoute du frais pour commencer.
        </div>
      )}

      {LIEUX.map(({ cle, label, ic }) => {
        const items = data.stock.filter((s) => s.lieu === cle)
        if (items.length === 0) return null
        return (
          <div key={cle} className="pile" style={{ gap: 8 }}>
            <h3 style={{ fontSize: 16, marginLeft: 4 }}>
              {ic} {label}
            </h3>
            {items.map((s) => (
              <div className="carte ligne espace" key={s.produitId} style={{ padding: '12px 16px' }}>
                <span style={{ fontWeight: 700 }}>{produit(s.produitId)?.nom ?? s.produitId}</span>
                <div className="ligne" style={{ gap: 8 }}>
                  {s.quantite > 1 && (
                    <div className="compteur">
                      <button onClick={() => ajusterStock(s.produitId, -1)}>−</button>
                      <span className="v">{s.quantite}</span>
                      <button onClick={() => ajusterStock(s.produitId, 1)}>+</button>
                    </div>
                  )}
                  {s.quantite <= 1 && (
                    <button
                      className="chip"
                      onClick={() => ajusterStock(s.produitId, 1)}
                      title="J'en ai plusieurs"
                      style={{ padding: '6px 12px' }}
                    >
                      +
                    </button>
                  )}
                  <button
                    className="rond"
                    style={{ width: 34, height: 34, background: 'var(--rose-clair)', color: '#a33a63' }}
                    title="J'en ai plus"
                    onClick={() => setStock(s.produitId, 0)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {scan && <Scanner onCode={onCode} onClose={fermerScan} />}

      {/* Réconciliation après un inventaire complet */}
      {recon && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(74,68,88,.35)', zIndex: 45, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setRecon(null)}
        >
          <div
            className="pile"
            style={{ background: 'var(--lilas-fond)', width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '30px 30px 0 0', padding: 16, maxHeight: '85vh', overflowY: 'auto', gap: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Tu n'aurais pas oublié… ? 🤔</h3>
            <p className="sous-titre" style={{ margin: 0 }}>
              Ces produits étaient dans tes placards mais tu ne les as pas scannés. Tu les as encore ?
              Décoche ceux que tu n'as plus.
            </p>
            {recon.map((p) => {
              const garde = !aRetirer.has(p.id)
              return (
                <button
                  key={p.id}
                  className="carte ligne espace"
                  style={{ padding: '12px 16px', textAlign: 'left' }}
                  onClick={() =>
                    setARetirer((s) => {
                      const n = new Set(s)
                      n.has(p.id) ? n.delete(p.id) : n.add(p.id)
                      return n
                    })
                  }
                >
                  <span style={{ fontWeight: 700, textDecoration: garde ? 'none' : 'line-through', opacity: garde ? 1 : 0.5 }}>
                    {p.nom}
                  </span>
                  <span className="tag" style={garde ? { background: 'var(--menthe)', color: '#2c6b53' } : { background: 'var(--rose-clair)', color: '#a33a63' }}>
                    {garde ? '✓ je l\'ai' : '🗑️ je l\'ai plus'}
                  </span>
                </button>
              )
            })}
            <button
              className="btn bloc"
              onClick={() => {
                aRetirer.forEach((id) => setStock(id, 0))
                setMsg(aRetirer.size ? `${aRetirer.size} produit(s) retiré(s)` : 'Inventaire confirmé ✓')
                setRecon(null)
              }}
            >
              Confirmer mon inventaire
            </button>
          </div>
        </div>
      )}

      {/* Feuille d'ajout rapide */}
      {ajout && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(74,68,88,.35)',
            zIndex: 40,
            display: 'flex',
            alignItems: 'flex-end',
          }}
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
              <h3>Ajouter un produit</h3>
              <button className="btn clair petit" onClick={() => setAjout(false)}>
                Fermer
              </button>
            </div>
            <p className="sous-titre" style={{ margin: 0 }}>
              Tape sur ce que tu as. Pas besoin de quantité — c'est juste « j'en ai ». 🙂
            </p>
            <input
              className="champ"
              autoFocus
              placeholder="🔍 Poulet, courgette, riz…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            {resultats.map((p) => {
              const dedans = qte(p.id) > 0
              const perso = p.id.startsWith('perso-') || p.id.startsWith('off-')
              return (
                <div
                  className="carte ligne espace"
                  key={p.id}
                  style={{ padding: '8px 10px 8px 16px', gap: 8, background: dedans ? 'var(--menthe-clair)' : undefined }}
                >
                  <button
                    onClick={() => {
                      setStock(p.id, dedans ? 0 : 1)
                      setMsg(dedans ? `Retiré : ${p.nom}` : `Ajouté : ${p.nom}`)
                    }}
                    style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                  >
                    <span>
                      <strong>{p.nom}</strong>
                      <span className="sous-titre" style={{ fontSize: 12, display: 'block' }}>
                        {p.kcal100 ? `${p.kcal100} kcal/100g` : 'kcal inconnu'} · {p.rayon}
                      </span>
                    </span>
                    <span className="tag" style={dedans ? { background: 'var(--menthe)', color: '#2c6b53' } : { background: 'var(--lilas-clair)', color: 'var(--lilas)' }}>
                      {dedans ? '✓ j\'en ai' : '+ ajouter'}
                    </span>
                  </button>
                  {perso && (
                    <button
                      className="rond"
                      style={{ width: 34, height: 34, background: 'var(--lilas-clair)', color: 'var(--lilas)', flexShrink: 0 }}
                      title="Renommer ce produit"
                      onClick={() => {
                        const n = prompt('Nouveau nom du produit :', p.nom)
                        if (n && n.trim()) {
                          upsertProduit({ ...p, nom: n.trim().slice(0, 40) })
                          setMsg(`Renommé : ${n.trim()}`)
                        }
                      }}
                    >
                      ✏️
                    </button>
                  )}
                  {perso && (
                    <button
                      className="rond"
                      style={{ width: 34, height: 34, background: 'var(--rose-clair)', color: '#a33a63', flexShrink: 0 }}
                      title="Supprimer ce produit de mon catalogue"
                      onClick={() => {
                        const used = data.recettes.some((r) => r.ingredients.some((i) => i.produitId === p.id))
                        const ok = confirm(
                          used
                            ? `« ${p.nom} » est utilisé dans une recette. Le supprimer quand même de ton catalogue ?`
                            : `Supprimer « ${p.nom} » de tes produits ?`,
                        )
                        if (ok) {
                          supprimerProduit(p.id)
                          setMsg(`Supprimé : ${p.nom}`)
                        }
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
