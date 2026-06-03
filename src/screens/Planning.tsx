import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'
import type { Recette } from '../store/types'

function prochainsJours(n: number): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = []
  const base = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const date = d.toISOString().slice(0, 10)
    let label =
      i === 0
        ? "Aujourd'hui"
        : i === 1
          ? 'Demain'
          : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
    label = label.charAt(0).toUpperCase() + label.slice(1)
    out.push({ date, label })
  }
  return out
}

export function Planning() {
  const { data, scoreRecette, planifier, retirerPlanning, ajouterAuxCourses, faisabilite } = useStore()
  const nav = useNavigate()
  const jours = useMemo(() => prochainsJours(7), [])
  const foyerIds = data.personnes.filter((p) => p.foyer !== false).map((p) => p.id)
  const tous = foyerIds.length ? foyerIds : data.personnes.map((p) => p.id)

  const [equilibre, setEquilibre] = useState(60)
  const [picker, setPicker] = useState<string | null>(null) // date pour laquelle on choisit

  function recettePour(date: string): Recette | undefined {
    const rp = data.planning.find((p) => p.date === date && p.moment === 'diner')
    return rp ? data.recettes.find((r) => r.id === rp.recetteId) : undefined
  }
  function planningId(date: string): string | undefined {
    return data.planning.find((p) => p.date === date && p.moment === 'diner')?.id
  }

  // Remplissage auto avec dosage d'équilibre.
  function remplir() {
    const eq = equilibre / 100
    const candidats = data.recettes.filter((r) => r.moments.includes('diner') || r.moments.includes('dejeuner'))
    const used = new Map<string, number>()
    let dernierAxe = ''

    for (const j of jours) {
      if (recettePour(j.date)) continue // ne touche pas aux jours déjà remplis
      let best: Recette | null = null
      let bestScore = -Infinity
      for (const r of candidats) {
        let sc = scoreRecette(r, tous)
        // équilibre : pénalise les répétitions et favorise la variété nutritionnelle
        const dejaPris = used.get(r.id) ?? 0
        sc -= dejaPris * eq * 4
        const axe = r.proteine >= r.legume && r.proteine >= r.feculent ? 'P' : r.legume >= r.feculent ? 'L' : 'F'
        if (axe === dernierAxe) sc -= eq * 2
        if (r.legume >= 2) sc += eq * 1.5 // pousse un peu les légumes quand on veut de l'équilibre
        // un peu d'aléatoire pour ne pas figer
        sc += (((r.nom.charCodeAt(0) + j.date.charCodeAt(8)) % 5) - 2) * 0.2
        if (sc > bestScore) {
          bestScore = sc
          best = r
        }
      }
      if (best) {
        planifier({ date: j.date, moment: 'diner', recetteId: best.id, pour: tous })
        used.set(best.id, (used.get(best.id) ?? 0) + 1)
        dernierAxe = best.proteine >= best.legume && best.proteine >= best.feculent ? 'P' : best.legume >= best.feculent ? 'L' : 'F'
      }
    }
  }

  function genererCourses() {
    const besoins = new Map<string, { produitId: string; quantite: number; unite: any }>()
    for (const j of jours) {
      const r = recettePour(j.date)
      if (!r) continue
      for (const ing of r.ingredients) {
        if (ing.optionnel) continue
        const enStock = data.stock.some((s) => s.produitId === ing.produitId && s.quantite > 0)
        if (enStock) continue
        besoins.set(ing.produitId, {
          produitId: ing.produitId,
          quantite: 1,
          unite: ing.unite,
        })
      }
    }
    ajouterAuxCourses([...besoins.values()])
    nav('/courses')
  }

  const nbPlanifies = jours.filter((j) => recettePour(j.date)).length

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <div>
          <h1>Ma semaine 🗓️</h1>
          <p className="sous-titre">{nbPlanifies}/7 dîners prévus</p>
        </div>
      </div>

      <Mascotte texte="Motivée ? On cale la semaine et je te sors la liste de courses." emoji="✨" />

      {/* Curseur d'équilibre */}
      <div className="carte pile" style={{ gap: 8 }}>
        <div className="ligne espace">
          <strong>⚖️ Équilibre de la semaine</strong>
          <span className="tag">
            {equilibre < 33 ? 'Plaisir' : equilibre < 66 ? 'Équilibré' : 'Healthy +'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={equilibre}
          onChange={(e) => setEquilibre(+e.target.value)}
        />
        <p className="sous-titre" style={{ margin: 0 }}>
          Plus c'est à droite, plus je varie les plats et je pousse les légumes.
        </p>
      </div>

      <button className="btn bloc" onClick={remplir}>
        ✨ Remplir les jours vides
      </button>

      {/* Les jours */}
      <div className="pile">
        {jours.map((j) => {
          const r = recettePour(j.date)
          return (
            <div className="carte ligne espace" key={j.date}>
              <div style={{ flex: 1 }}>
                <div className="sous-titre" style={{ fontWeight: 800, color: 'var(--lilas)' }}>
                  {j.label}
                </div>
                {r ? (
                  <button
                    onClick={() => nav(`/recettes/${r.id}`)}
                    style={{ fontWeight: 700, fontSize: 16, textAlign: 'left' }}
                  >
                    {r.emoji} {r.nom}
                  </button>
                ) : (
                  <span className="sous-titre">Rien de prévu</span>
                )}
              </div>
              {r ? (
                <button className="rond" onClick={() => retirerPlanning(planningId(j.date)!)}>
                  ✕
                </button>
              ) : (
                <button className="btn fantome petit" onClick={() => setPicker(j.date)}>
                  + Choisir
                </button>
              )}
            </div>
          )
        })}
      </div>

      {nbPlanifies > 0 && (
        <button className="btn bloc" onClick={genererCourses} style={{ background: 'var(--menthe)', color: '#2c6b53' }}>
          🛒 Générer la liste de courses
        </button>
      )}

      {/* Picker recette */}
      {picker && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(74,68,88,.35)', zIndex: 40, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setPicker(null)}
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
              <h3>Choisir un plat</h3>
              <button className="btn clair petit" onClick={() => setPicker(null)}>
                Fermer
              </button>
            </div>
            {[...data.recettes]
              .map((r) => ({ r, s: scoreRecette(r, tous), f: faisabilite(r) }))
              .sort((a, b) => b.s - a.s)
              .map(({ r, f }) => (
                <button
                  key={r.id}
                  className="carte ligne"
                  style={{ textAlign: 'left' }}
                  onClick={() => {
                    planifier({ date: picker, moment: 'diner', recetteId: r.id, pour: tous })
                    setPicker(null)
                  }}
                >
                  <span style={{ fontSize: 30 }}>{r.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <strong>{r.nom}</strong>
                    <div className="sous-titre" style={{ fontSize: 12 }}>
                      ⏱️ {r.tempsMin} min · {f.ok ? '✓ faisable' : `🛒 ${f.manquants.length} à acheter`}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
