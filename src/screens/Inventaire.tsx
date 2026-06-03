import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { Scanner } from '../components/Scanner'
import { QueCuisiner } from '../components/QueCuisiner'
import { ConceptPicker } from '../components/ConceptPicker'
import { chercherProduitParCodeBarres } from '../store/openfoodfacts'
import { estComptable, estCondiment } from '../store/seed'
import type { Lieu, Produit, Rayon, StockItem } from '../store/types'

const estBrut = (p?: Produit) => !!p && (p.id.startsWith('off-') || p.id.startsWith('perso-'))
// produit à proposer dans « à reconnaître » : brut, sans concept, pas écarté, pas un condiment
const aReconnaitre = (p?: Produit) => estBrut(p) && !p!.canonId && !p!.sansConcept && !estCondiment(p!)

const LIEUX: { cle: Lieu; label: string; ic: string }[] = [
  { cle: 'frigo', label: 'Frigo', ic: '🧊' },
  { cle: 'placard', label: 'Placard', ic: '🥫' },
  { cle: 'congelo', label: 'Congélo', ic: '❄️' },
]

const RAYONS: { cle: Rayon; label: string; ic: string }[] = [
  { cle: 'fruits-legumes', label: 'Fruits & légumes', ic: '🥕' },
  { cle: 'viande-poisson', label: 'Viande & poisson', ic: '🍗' },
  { cle: 'cremerie', label: 'Crémerie', ic: '🧀' },
  { cle: 'surgele', label: 'Surgelés', ic: '❄️' },
  { cle: 'boulangerie', label: 'Boulangerie', ic: '🥖' },
  { cle: 'epicerie', label: 'Épicerie', ic: '🥫' },
  { cle: 'autre', label: 'Autre', ic: '🛍️' },
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
  const [rechercheStock, setRechercheStock] = useState('')
  const [groupe, setGroupe] = useState<'lieu' | 'categorie' | 'reconnaitre'>('lieu')
  const [cuisinerProd, setCuisinerProd] = useState<Produit | null>(null)
  const [conceptProd, setConceptProd] = useState<Produit | null>(null)
  const [exportTxt, setExportTxt] = useState<string | null>(null)

  const nbNonReconnus = data.stock.filter((s) => aReconnaitre(produit(s.produitId))).length

  function exporterPlacard() {
    const out: string[] = [`MON PLACARD — ${data.stock.length} produits`]
    for (const { cle, label } of LIEUX) {
      const items = data.stock
        .filter((s) => s.lieu === cle)
        .map((s) => produit(s.produitId)?.nom)
        .filter(Boolean)
      if (items.length) out.push(`\n[${label}]\n` + items.join(', '))
    }
    const perso = data.recettes.filter((r) => r.perso).map((r) => r.nom)
    if (perso.length) out.push('\n[Mes recettes perso]\n' + perso.join(', '))
    const txt = out.join('\n')
    navigator.clipboard?.writeText(txt).then(
      () => setMsg('Placard copié ! Colle-le dans la conversation.'),
      () => undefined,
    )
    setExportTxt(txt)
  }

  function qte(produitId: string) {
    return data.stock.find((s) => s.produitId === produitId)?.quantite ?? 0
  }

  // Une ligne de l'inventaire : compteur si l'aliment se compte, sinon présence.
  function ligneStock(s: StockItem) {
    const p = produit(s.produitId)
    const comptable = p ? estComptable(p) : false
    return (
      <div className="carte ligne espace" key={s.produitId} style={{ padding: '10px 12px 10px 16px', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{p?.nom ?? s.produitId}</div>
          {p?.canonId ? (
            <button
              className="tag"
              style={{ background: 'var(--menthe-clair)', color: '#2c6b53', marginTop: 2 }}
              onClick={() => setConceptProd(p)}
            >
              = {produit(p.canonId)?.nom ?? p.canonId}
            </button>
          ) : aReconnaitre(p) ? (
            <button
              className="tag"
              style={{ background: 'var(--peche-clair)', color: '#b45a3c', marginTop: 2 }}
              onClick={() => p && setConceptProd(p)}
            >
              🏷️ à reconnaître
            </button>
          ) : null}
        </div>
        <div className="ligne" style={{ gap: 6 }}>
          {comptable || s.quantite > 1 ? (
            <div className="compteur">
              <button onClick={() => ajusterStock(s.produitId, -1)}>−</button>
              <span className="v">{s.quantite}</span>
              <button onClick={() => ajusterStock(s.produitId, 1)}>+</button>
            </div>
          ) : (
            <button className="chip" style={{ padding: '6px 12px' }} title="J'en ai plusieurs" onClick={() => ajusterStock(s.produitId, 1)}>
              +
            </button>
          )}
          <button
            className="rond"
            style={{ width: 34, height: 34, background: 'var(--beurre-clair)' }}
            title="Que cuisiner avec ça ?"
            onClick={() => p && setCuisinerProd(p)}
          >
            🍳
          </button>
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
    )
  }

  // stock filtré par la recherche, regroupé par lieu OU par catégorie
  const groupesStock = useMemo(() => {
    const q = rechercheStock.toLowerCase().trim()
    const filtre = data.stock.filter((s) => (produit(s.produitId)?.nom ?? '').toLowerCase().includes(q))
    if (groupe === 'reconnaitre') {
      const items = filtre.filter((s) => aReconnaitre(produit(s.produitId)))
      return items.length ? [{ cle: 'reconnaitre', label: 'À reconnaître', ic: '🏷️', items }] : []
    }
    const defs = groupe === 'lieu' ? LIEUX : RAYONS
    return defs
      .map((g) => ({
        ...g,
        items: filtre.filter((s) =>
          groupe === 'lieu' ? s.lieu === g.cle : (produit(s.produitId)?.rayon ?? 'autre') === g.cle,
        ),
      }))
      .filter((g) => g.items.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.stock, data.produits, rechercheStock, groupe])

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
        {data.stock.length > 0 && (
          <button className="btn clair petit" onClick={exporterPlacard}>
            📤 Exporter
          </button>
        )}
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

      {data.stock.length > 0 && (
        <>
          <input
            className="champ"
            placeholder="🔍 Chercher dans mes placards…"
            value={rechercheStock}
            onChange={(e) => setRechercheStock(e.target.value)}
          />
          <div className="tags">
            <button className={'chip' + (groupe === 'lieu' ? ' actif' : '')} onClick={() => setGroupe('lieu')}>
              📍 Par lieu
            </button>
            <button className={'chip' + (groupe === 'categorie' ? ' actif' : '')} onClick={() => setGroupe('categorie')}>
              🗂️ Par catégorie
            </button>
            {nbNonReconnus > 0 && (
              <button
                className={'chip' + (groupe === 'reconnaitre' ? ' actif' : '')}
                onClick={() => setGroupe('reconnaitre')}
                style={groupe === 'reconnaitre' ? {} : { background: 'var(--peche-clair)', color: '#b45a3c' }}
              >
                🏷️ À reconnaître ({nbNonReconnus})
              </button>
            )}
          </div>
          {groupe === 'reconnaitre' && (
            <p className="sous-titre" style={{ margin: 0 }}>
              Touche « 🏷️ à reconnaître » sous un produit pour lui dire ce que c'est. Il comptera alors
              dans tes recettes.
            </p>
          )}
        </>
      )}

      {groupesStock.map((g) => (
        <div key={g.cle} className="pile" style={{ gap: 8 }}>
          <h3 style={{ fontSize: 16, marginLeft: 4 }}>
            {g.ic} {g.label} <span style={{ color: 'var(--texte-doux)', fontWeight: 600 }}>· {g.items.length}</span>
          </h3>
          {g.items.map((s) => ligneStock(s))}
        </div>
      ))}

      {data.stock.length > 0 && groupesStock.length === 0 && (
        <div className="vide">Aucun produit ne correspond à « {rechercheStock} ».</div>
      )}

      {scan && <Scanner onCode={onCode} onClose={fermerScan} />}

      {cuisinerProd && <QueCuisiner produit={cuisinerProd} onClose={() => setCuisinerProd(null)} />}

      {conceptProd && <ConceptPicker produit={conceptProd} onClose={() => setConceptProd(null)} />}

      {/* Export du placard à copier/envoyer */}
      {exportTxt && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(74,68,88,.35)', zIndex: 48, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setExportTxt(null)}
        >
          <div
            className="pile"
            style={{ background: 'var(--lilas-fond)', width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '30px 30px 0 0', padding: 16, maxHeight: '85vh', overflowY: 'auto', gap: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ligne espace">
              <h3>Ton placard 📤</h3>
              <button className="btn clair petit" onClick={() => setExportTxt(null)}>
                Fermer
              </button>
            </div>
            <p className="sous-titre" style={{ margin: 0 }}>
              C'est copié dans le presse-papier. Sinon, sélectionne tout ci-dessous et copie, puis
              colle-le dans la conversation pour que j'ajoute des recettes adaptées.
            </p>
            <textarea className="champ" style={{ minHeight: 220, resize: 'vertical', fontSize: 13 }} readOnly value={exportTxt} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn bloc" onClick={() => { navigator.clipboard?.writeText(exportTxt); setMsg('Copié ✓') }}>
              📋 Copier
            </button>
          </div>
        </div>
      )}

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
