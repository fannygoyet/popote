import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'
import { RecetteCarte } from '../components/RecetteCarte'
import { PourQui } from '../components/PourQui'
import type { Moment } from '../store/types'

const TEMPS = [
  { v: 15, label: '≤ 15 min' },
  { v: 30, label: '≤ 30 min' },
  { v: 999, label: 'Peu importe' },
]

const MOMENTS: { v: Moment; label: string }[] = [
  { v: 'petit-dej', label: '🥐 Petit-déj' },
  { v: 'dejeuner', label: '🍽️ Déjeuner' },
  { v: 'diner', label: '🌙 Dîner' },
  { v: 'gouter', label: '🍪 Goûter' },
  { v: 'dessert', label: '🍰 Dessert' },
]

function momentParHeure(): Moment {
  const h = new Date().getHours()
  if (h < 10) return 'petit-dej'
  if (h < 15) return 'dejeuner'
  if (h < 18) return 'gouter'
  return 'diner'
}

export function Flemme() {
  const { data, produit, scoreRecette, faisabilite } = useStore()
  const nav = useNavigate()

  const foyer = data.personnes.filter((p) => p.foyer !== false).map((p) => p.id)
  const [pour, setPour] = useState<string[]>(foyer.length ? foyer : data.personnes.map((p) => p.id))
  const [moment, setMoment] = useState<Moment>(momentParHeure())
  const [maxTemps, setMaxTemps] = useState(30)
  const [courses, setCourses] = useState(false)
  const [envie, setEnvie] = useState('')
  const [tour, setTour] = useState(0)

  // une recette contient-elle un aliment qui matche la recherche « envie » ?
  function recetteContient(r: (typeof data.recettes)[number], q: string) {
    return r.ingredients.some((i) => (produit(i.produitId)?.nom ?? '').toLowerCase().includes(q))
  }

  const classees = useMemo(() => {
    const q = envie.toLowerCase().trim()
    return data.recettes
      .filter((r) => r.tempsMin <= maxTemps && r.moments.includes(moment))
      .filter((r) => !q || recetteContient(r, q))
      .map((r) => ({ r, f: faisabilite(r), s: scoreRecette(r, pour) }))
      .filter((x) => (courses ? true : x.f.ok))
      .sort((a, b) => {
        if (a.f.ok !== b.f.ok) return a.f.ok ? -1 : 1
        return b.s - a.s
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pour, moment, maxTemps, courses, envie])

  // 3 propositions, avec rotation quand on demande « d'autres idées »
  const propositions =
    classees.length <= 3
      ? classees
      : Array.from({ length: 3 }, (_, i) => classees[(tour * 3 + i) % classees.length])

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
      <PourQui personnes={data.personnes} pour={pour} onToggle={togglePour} />

      {/* Moment du repas */}
      <div>
        <span className="label">C'est pour quel repas ?</span>
        <div className="tags">
          {MOMENTS.map((m) => (
            <button
              key={m.v}
              className={'chip' + (moment === m.v ? ' actif' : '')}
              onClick={() => {
                setMoment(m.v)
                setTour(0)
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Envie d'un aliment précis */}
      <div>
        <span className="label">Une envie ? (optionnel)</span>
        <input
          className="champ"
          placeholder="🍳 ex. saumon, courgette… un aliment à cuisiner"
          value={envie}
          onChange={(e) => {
            setEnvie(e.target.value)
            setTour(0)
          }}
        />
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
            Rien à proposer ici. Change le repas, le temps, ou active « je peux faire les courses ».
          </div>
        )}
      </div>

      {classees.length > 3 && (
        <button className="btn fantome bloc" onClick={() => setTour((t) => t + 1)}>
          🎲 D'autres idées
        </button>
      )}
    </div>
  )
}
