import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/store'
import { SUBSTITUTS } from '../store/seed'
import { Mascotte } from '../components/Mascotte'
import type { Ingredient } from '../store/types'

type LigneConfirm = { ing: Ingredient; eff: string; dispo: boolean; q: number }

type Phase = 'config' | 'confirm' | 'noter'
// remplacement par ingrédient : undefined = garder, null = retirer, string = produit de remplacement
type Rempl = Record<string, string | null | undefined>

export function RecetteDetail() {
  const { id } = useParams()
  const { data, produit, faisabilite, confirmerRecette, ajouterAuxCourses } = useStore()
  const nav = useNavigate()
  const loc = useLocation()

  const recette = data.recettes.find((r) => r.id === id)
  const [pour, setPour] = useState<string[]>(
    (loc.state as { pour?: string[] })?.pour ?? data.personnes.map((p) => p.id),
  )
  const [portions, setPortions] = useState(recette?.portions ?? 2)
  const [phase, setPhase] = useState<Phase>('config')
  const [rempl, setRempl] = useState<Rempl>({})
  const [dedOverride, setDedOverride] = useState<Record<string, number>>({})

  // Liste effective d'ingrédients pour la confirmation (après remplacements/retraits).
  // Hook placé avant tout return conditionnel (règles des hooks).
  const lignesConfirm = useMemo<LigneConfirm[]>(() => {
    if (!recette) return []
    return recette.ingredients
      .map((ing) => {
        const eff = effectif(ing.produitId)
        if (eff === null) return null
        const dispo = enStock(eff)
        const q = dedOverride[eff] ?? (dispo ? 1 : 0)
        return { ing, eff, dispo, q }
      })
      .filter(Boolean) as LigneConfirm[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recette, rempl, dedOverride, data.stock])

  if (!recette) return <div className="ecran vide">Recette introuvable.</div>
  const r = recette
  const ratio = portions / r.portions

  function enStock(produitId: string) {
    const s = data.stock.find((x) => x.produitId === produitId)
    return !!s && s.quantite > 0
  }
  // qui, parmi les convives, n'aime pas cet ingrédient ?
  function refractaires(produitId: string) {
    return data.personnes.filter(
      (p) => pour.includes(p.id) && p.gouts[`prod:${produitId}`] === -1,
    )
  }
  function substitutsDispo(produitId: string) {
    return (SUBSTITUTS[produitId] ?? []).filter((sid) => data.produits.some((p) => p.id === sid))
  }
  // produit effectivement utilisé après remplacement (ou null si retiré)
  function effectif(produitId: string): string | null {
    const v = rempl[produitId]
    if (v === null) return null
    return v ?? produitId
  }

  const { manquants } = faisabilite(r)

  function ajouterCourses() {
    ajouterAuxCourses(manquants.map((m) => ({ ...m, quantite: 1 })))
    nav('/courses')
  }

  function valider() {
    const deductions = lignesConfirm
      .filter((l) => l.dispo && l.q > 0)
      .map((l) => ({ produitId: l.eff, quantite: l.q }))
    confirmerRecette(r.id, portions, pour, deductions)
    setPhase('noter')
  }

  // ---- Rendu ----
  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <button className="rond" onClick={() => (phase === 'confirm' ? setPhase('config') : nav(-1))}>
          ←
        </button>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72 }}>{r.emoji}</div>
        <h1 style={{ fontSize: 26 }}>{r.nom}</h1>
        <div className="ligne" style={{ justifyContent: 'center', gap: 16, marginTop: 6, color: 'var(--texte-doux)' }}>
          <span>⏱️ {r.tempsMin} min</span>
          <span>🔥 {Math.round(r.kcalPortion)} kcal/pers</span>
          <span>{'⭐'.repeat(r.difficulte)}</span>
        </div>
      </div>

      {phase === 'noter' && <Notation recetteId={r.id} pour={pour} onFini={() => nav('/')} />}

      {phase === 'config' && (
        <>
          <div className="carte ligne espace">
            <strong>Portions</strong>
            <div className="compteur">
              <button onClick={() => setPortions((p) => Math.max(1, p - 1))}>−</button>
              <span className="v">{portions}</span>
              <button onClick={() => setPortions((p) => p + 1)}>+</button>
            </div>
          </div>

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

          <div className="carte pile" style={{ gap: 10 }}>
            <strong>Ingrédients</strong>
            {r.ingredients.map((ing) => {
              const besoin = Math.round(ing.quantite * ratio * 10) / 10
              const ok = enStock(ing.produitId)
              const refr = refractaires(ing.produitId)
              return (
                <div className="pile" key={ing.produitId} style={{ gap: 4 }}>
                  <div className="ligne espace">
                    <span style={{ opacity: ing.optionnel ? 0.6 : 1 }}>
                      {ok ? '✅' : '⬜'} {produit(ing.produitId)?.nom ?? ing.produitId}
                      {ing.optionnel ? ' (optionnel)' : ''}
                    </span>
                    <span style={{ color: 'var(--texte-doux)', fontWeight: 700 }}>
                      {besoin} {ing.unite === 'piece' ? '' : ing.unite}
                    </span>
                  </div>
                  {refr.length > 0 && (
                    <span className="tag" style={{ background: 'var(--rose-clair)', color: '#a33a63' }}>
                      {refr.map((p) => p.emoji).join('')} n'aime{refr.length > 1 ? 'nt' : ''} pas — tu ajusteras à l'étape suivante
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="carte pile" style={{ gap: 10 }}>
            <strong>Préparation</strong>
            {r.etapes.map((e, i) => (
              <div className="ligne" key={i} style={{ alignItems: 'flex-start', gap: 10 }}>
                <span className="rond" style={{ width: 28, height: 28, fontSize: 14 }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1 }}>{e}</span>
              </div>
            ))}
          </div>

          {manquants.length > 0 && (
            <button className="btn fantome bloc" onClick={ajouterCourses}>
              🛒 Ajouter {manquants.length} ingrédient{manquants.length > 1 ? 's' : ''} aux courses
            </button>
          )}
          <button className="btn bloc" disabled={pour.length === 0} onClick={() => setPhase('confirm')}>
            🍳 J'ai cuisiné ça !
          </button>
        </>
      )}

      {phase === 'confirm' && (
        <div className="pile" style={{ gap: 14 }}>
          <Mascotte texte="Avant de retirer ça de tes placards, on ajuste si besoin 👇" emoji="🧾" />

          {/* Pour qui (réajustable : ex. faire le plat juste pour ceux qui aiment) */}
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

          {/* Conflits de goûts -> remplacer / retirer */}
          {r.ingredients
            .filter((ing) => refractaires(ing.produitId).length > 0)
            .map((ing) => {
              const refr = refractaires(ing.produitId)
              const subs = substitutsDispo(ing.produitId)
              const choix = rempl[ing.produitId]
              return (
                <div className="carte pile" key={ing.produitId} style={{ gap: 10, background: 'var(--rose-clair)' }}>
                  <strong>
                    {refr.map((p) => `${p.emoji} ${p.nom}`).join(', ')} n'aime
                    {refr.length > 1 ? 'nt' : ''} pas : {produit(ing.produitId)?.nom}
                  </strong>
                  <div className="tags">
                    <button
                      className={'chip' + (choix === undefined ? ' actif' : '')}
                      onClick={() => setRempl((m) => ({ ...m, [ing.produitId]: undefined }))}
                    >
                      Garder quand même
                    </button>
                    <button
                      className={'chip' + (choix === null ? ' actif' : '')}
                      onClick={() => setRempl((m) => ({ ...m, [ing.produitId]: null }))}
                    >
                      🚫 Sans
                    </button>
                    {subs.map((sid) => (
                      <button
                        key={sid}
                        className={'chip' + (choix === sid ? ' actif' : '')}
                        onClick={() => setRempl((m) => ({ ...m, [ing.produitId]: sid }))}
                      >
                        🔄 {produit(sid)?.nom}
                      </button>
                    ))}
                  </div>
                  {pour.length > refr.length && (
                    <button
                      className="btn clair petit"
                      onClick={() => setPour((x) => x.filter((pid) => !refr.some((p) => p.id === pid)))}
                    >
                      Ou faire ce plat sans {refr.map((p) => p.nom).join(' & ')}
                    </button>
                  )}
                </div>
              )
            })}

          {/* Déduction du stock, ajustable */}
          <div className="carte pile" style={{ gap: 10 }}>
            <strong>À retirer de tes placards</strong>
            {lignesConfirm.map((l) => (
              <div className="ligne espace" key={l.eff}>
                <span style={{ opacity: l.dispo ? 1 : 0.45 }}>
                  {produit(l.eff)?.nom ?? l.eff}
                  {l.eff !== l.ing.produitId && (
                    <span className="tag" style={{ marginLeft: 6 }}>
                      remplace {produit(l.ing.produitId)?.nom}
                    </span>
                  )}
                  {!l.dispo && <span className="sous-titre"> · pas en stock</span>}
                </span>
                {l.dispo ? (
                  <div className="compteur">
                    <button onClick={() => setDedOverride((o) => ({ ...o, [l.eff]: Math.max(0, l.q - 1) }))}>−</button>
                    <span className="v">{l.q}</span>
                    <button onClick={() => setDedOverride((o) => ({ ...o, [l.eff]: l.q + 1 }))}>+</button>
                  </div>
                ) : (
                  <span className="sous-titre">—</span>
                )}
              </div>
            ))}
            <p className="sous-titre" style={{ margin: 0 }}>
              Mets une quantité à 0 pour ne pas la déduire (ex. tu en avais déjà ouvert).
            </p>
          </div>

          <button className="btn bloc" onClick={valider}>
            ✅ Confirmer et retirer du stock
          </button>
        </div>
      )}
    </div>
  )
}

function Notation({ recetteId, pour, onFini }: { recetteId: string; pour: string[]; onFini: () => void }) {
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
              <button className={'chip aime' + (av?.note === 1 ? ' actif' : '')} onClick={() => noter(recetteId, p.id, 1, av?.etoiles)}>
                👍 J'adore
              </button>
              <button className={'chip moyen' + (av?.note === 0 ? ' actif' : '')} onClick={() => noter(recetteId, p.id, 0, av?.etoiles)}>
                😐 Bof
              </button>
              <button className={'chip pasaime' + (av?.note === -1 ? ' actif' : '')} onClick={() => noter(recetteId, p.id, -1, av?.etoiles)}>
                👎 Non
              </button>
            </div>
            <div className="ligne" style={{ gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => noter(recetteId, p.id, av?.note ?? 1, n)} style={{ fontSize: 26, opacity: (av?.etoiles ?? 0) >= n ? 1 : 0.3 }}>
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
