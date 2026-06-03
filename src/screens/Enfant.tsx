import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'
import type { Recette } from '../store/types'

const FONDS = [
  'linear-gradient(150deg, var(--peche-clair), var(--peche))',
  'linear-gradient(150deg, var(--menthe-clair), var(--menthe))',
  'linear-gradient(150deg, var(--beurre-clair), var(--beurre))',
  'linear-gradient(150deg, var(--bleu-clair), var(--bleu))',
  'linear-gradient(150deg, var(--rose-clair), var(--rose))',
]

export function Enfant() {
  const { data, scoreRecette, faisabilite } = useStore()
  const nav = useNavigate()
  const [quiId, setQuiId] = useState<string | null>(
    data.personnes.length === 1 ? data.personnes[0].id : null,
  )
  const [tour, setTour] = useState(0)
  const [choisie, setChoisie] = useState<Recette | null>(null)

  const qui = data.personnes.find((p) => p.id === quiId)

  // recettes classées pour cet enfant : faisables d'abord, puis selon ses goûts
  const classees = useMemo(() => {
    if (!quiId) return []
    return data.recettes
      .map((r) => ({ r, s: scoreRecette(r, [quiId]), f: faisabilite(r) }))
      .sort((a, b) => (a.f.ok !== b.f.ok ? (a.f.ok ? -1 : 1) : b.s - a.s))
      .map((x) => x.r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, quiId])

  const trio = useMemo(() => {
    if (classees.length === 0) return []
    const out: Recette[] = []
    for (let i = 0; i < Math.min(3, classees.length); i++) {
      out.push(classees[(tour * 3 + i) % classees.length])
    }
    return out
  }, [classees, tour])

  // --- Étape : qui joue ? ---
  if (!quiId) {
    return (
      <div className="ecran pile" style={{ gap: 16 }}>
        <div className="entete">
          <button className="rond" onClick={() => nav('/')}>
            ←
          </button>
          <div style={{ flex: 1, marginLeft: 8 }}>
            <h1>Mode enfant 🧒</h1>
            <p className="sous-titre">Qui choisit le repas ce soir ?</p>
          </div>
        </div>
        <Mascotte texte="Coucou ! Qui va choisir ce qu'on mange ?" />
        <div className="pile">
          {data.personnes.map((p) => (
            <button
              key={p.id}
              className="carte-pleine ligne"
              onClick={() => setQuiId(p.id)}
              style={{ gap: 14, textAlign: 'left' }}
            >
              <span style={{ fontSize: 44 }}>{p.emoji}</span>
              <strong style={{ fontSize: 22 }}>{p.nom}</strong>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // --- Étape : célébration du choix ---
  if (choisie) {
    return (
      <div className="ecran pile" style={{ gap: 20, alignItems: 'center', textAlign: 'center', paddingTop: 30 }}>
        <div style={{ fontSize: 40 }}>🎉✨🎉</div>
        <div className="face" style={{ width: 120, height: 120, fontSize: 70 }}>
          {choisie.emoji}
        </div>
        <h1 style={{ fontSize: 30 }}>{choisie.nom} !</h1>
        <Mascotte texte={`Super choix ${qui?.nom} ! On le cuisine ensemble ?`} emoji="😋" />
        <button
          className="btn bloc"
          style={{ fontSize: 18, padding: '18px' }}
          onClick={() =>
            nav(`/recettes/${choisie.id}`, {
              state: { pour: data.personnes.filter((p) => p.foyer !== false).map((p) => p.id) },
            })
          }
        >
          👩‍🍳 On cuisine !
        </button>
        <button className="btn fantome bloc" onClick={() => setChoisie(null)}>
          ← Choisir autre chose
        </button>
        <p className="sous-titre" style={{ margin: 0 }}>
          À la fin, {qui?.nom} pourra mettre ses étoiles ⭐
        </p>
      </div>
    )
  }

  // --- Étape : choix parmi les grandes cartes ---
  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <button className="rond" onClick={() => (data.personnes.length > 1 ? setQuiId(null) : nav('/'))}>
          ←
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <h1>{qui?.emoji} À toi {qui?.nom} !</h1>
          <p className="sous-titre">Touche le plat qui te fait envie.</p>
        </div>
      </div>

      <Mascotte texte={`Alors ${qui?.nom}, on mange quoi ce soir ?`} />

      <div className="pile" style={{ gap: 14 }}>
        {trio.map((r, i) => (
          <button
            key={r.id}
            className="carte-pleine ligne"
            onClick={() => setChoisie(r)}
            style={{ gap: 16, textAlign: 'left', background: FONDS[i % FONDS.length], minHeight: 110 }}
          >
            <span style={{ fontSize: 60 }}>{r.emoji}</span>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 22 }}>{r.nom}</strong>
              <div style={{ marginTop: 4, fontSize: 14, color: 'var(--texte)' }}>⏱️ {r.tempsMin} min</div>
            </div>
          </button>
        ))}
        {trio.length === 0 && (
          <div className="vide">
            <div className="gros">🍽️</div>
            Aucune recette pour l'instant.
          </div>
        )}
      </div>

      {classees.length > 3 && (
        <button className="btn fantome bloc" onClick={() => setTour((t) => t + 1)}>
          🎲 Montre-moi d'autres idées
        </button>
      )}
    </div>
  )
}
