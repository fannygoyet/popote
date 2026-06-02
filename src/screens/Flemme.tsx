import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'
import { RecetteCarte } from '../components/RecetteCarte'

const TEMPS = [
  { v: 15, label: '≤ 15 min' },
  { v: 30, label: '≤ 30 min' },
  { v: 999, label: 'Peu importe' },
]

export function Flemme() {
  const { data, scoreRecette, faisabilite } = useStore()
  const nav = useNavigate()

  const [pour, setPour] = useState<string[]>(data.personnes.map((p) => p.id))
  const [maxTemps, setMaxTemps] = useState(30)
  const [courses, setCourses] = useState(false)

  const propositions = useMemo(() => {
    return data.recettes
      .filter((r) => r.tempsMin <= maxTemps)
      .map((r) => ({ r, f: faisabilite(r), s: scoreRecette(r, pour) }))
      .filter((x) => (courses ? true : x.f.ok))
      .sort((a, b) => {
        // faisable d'abord, puis meilleur score
        if (a.f.ok !== b.f.ok) return a.f.ok ? -1 : 1
        return b.s - a.s
      })
      .slice(0, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pour, maxTemps, courses])

  function togglePour(id: string) {
    setPour((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <button className="rond" onClick={() => nav('/')}>
          ←
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <h1>J'ai la flemme</h1>
          <p className="sous-titre">Je te trouve 3 idées tout de suite.</p>
        </div>
      </div>

      {/* Pour qui ? */}
      <div>
        <span className="label">Pour qui ?</span>
        <div className="tags">
          {data.personnes.map((p) => (
            <button
              key={p.id}
              className={'chip' + (pour.includes(p.id) ? ' actif' : '')}
              onClick={() => togglePour(p.id)}
            >
              {p.emoji} {p.nom}
            </button>
          ))}
        </div>
      </div>

      {/* Temps dispo */}
      <div>
        <span className="label">J'ai le temps de…</span>
        <div className="tags">
          {TEMPS.map((t) => (
            <button
              key={t.v}
              className={'chip' + (maxTemps === t.v ? ' actif' : '')}
              onClick={() => setMaxTemps(t.v)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle courses */}
      <button className="carte ligne espace" onClick={() => setCourses((c) => !c)}>
        <div style={{ textAlign: 'left' }}>
          <strong>🛒 Je peux faire les courses</strong>
          <p className="sous-titre" style={{ margin: '2px 0 0' }}>
            {courses
              ? 'Je propose aussi des recettes où il manque des trucs.'
              : 'Seulement ce qui est faisable avec mes placards.'}
          </p>
        </div>
        <span
          className="bascule"
          style={{
            width: 52,
            height: 30,
            borderRadius: 999,
            background: courses ? 'var(--lilas)' : 'var(--lilas-clair)',
            position: 'relative',
            transition: 'background .15s',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: courses ? 25 : 3,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'white',
              transition: 'left .15s',
              boxShadow: '0 2px 6px rgba(0,0,0,.2)',
            }}
          />
        </span>
      </button>

      <Mascotte
        texte={
          propositions.length
            ? 'Tiens, voilà mes idées du moment 👇'
            : courses
              ? 'Hmm, je ne trouve rien. Essaie un autre temps.'
              : "Tes placards sont un peu vides ! Active « je peux faire les courses »."
        }
      />

      <div className="pile">
        {propositions.map(({ r, f }) => (
          <RecetteCarte
            key={r.id}
            recette={r}
            manquants={f.manquants.length}
            onClick={() => nav(`/recettes/${r.id}`, { state: { pour } })}
          />
        ))}
        {propositions.length === 0 && (
          <div className="vide">
            <div className="gros">🤷‍♀️</div>
            Rien à proposer pour l'instant.
          </div>
        )}
      </div>
    </div>
  )
}
