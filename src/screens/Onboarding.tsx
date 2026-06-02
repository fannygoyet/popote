import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'
import type { Personne } from '../store/types'
import { GOUT_OPTIONS as OPTIONS } from '../store/gouts'

const EMOJIS = ['👩', '👧', '👦', '🧑', '👨', '👵', '👴', '🧒', '👶', '🐱']

type Brouillon = Omit<Personne, 'id'>

export function Onboarding() {
  const { ajouterPersonne, majPersonne, set } = useStore()
  const nav = useNavigate()
  const [etape, setEtape] = useState<'accueil' | 'personnes' | 'gouts'>('accueil')
  const [gens, setGens] = useState<Brouillon[]>([
    { nom: '', emoji: '👩', gouts: {} },
  ])
  const [actif, setActif] = useState(0)

  function ajouter() {
    setGens((g) => [...g, { nom: '', emoji: EMOJIS[g.length % EMOJIS.length], gouts: {} }])
  }
  function majGen(i: number, maj: Partial<Brouillon>) {
    setGens((g) => g.map((p, idx) => (idx === i ? { ...p, ...maj } : p)))
  }
  function setGout(i: number, cle: string, v: -1 | 0 | 1) {
    setGens((g) =>
      g.map((p, idx) => {
        if (idx !== i) return p
        const gouts = { ...p.gouts }
        if (gouts[cle] === v) delete gouts[cle]
        else gouts[cle] = v
        return { ...p, gouts }
      }),
    )
  }

  function terminer() {
    gens
      .filter((g) => g.nom.trim())
      .forEach((g) => {
        const id = ajouterPersonne({ ...g, nom: g.nom.trim() })
        majPersonne(id, {}) // no-op, garde la cohérence
      })
    set((d) => ({ ...d, onboardingFait: true }))
    nav('/', { replace: true })
  }

  const valides = gens.filter((g) => g.nom.trim())

  return (
    <div className="ecran">
      {etape === 'accueil' && (
        <div className="pile" style={{ paddingTop: 30, gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 80 }}>🍲</div>
            <h1 style={{ fontSize: 34, marginTop: 8 }}>Popote</h1>
            <p className="sous-titre" style={{ fontSize: 16 }}>
              L'app qui décide des repas à ta place les jours de flemme.
            </p>
          </div>
          <Mascotte texte="Salut ! Moi c'est Popote. On commence par dire qui mange à la maison ?" />
          <button className="btn bloc" onClick={() => setEtape('personnes')}>
            C'est parti
          </button>
        </div>
      )}

      {etape === 'personnes' && (
        <div className="pile" style={{ gap: 16 }}>
          <div className="entete">
            <div>
              <h1>Qui mange ?</h1>
              <p className="sous-titre">Toi, tes enfants, tes invités réguliers…</p>
            </div>
          </div>

          {gens.map((g, i) => (
            <div className="carte pile" key={i} style={{ gap: 12 }}>
              <div className="ligne" style={{ flexWrap: 'wrap', gap: 6 }}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => majGen(i, { emoji: e })}
                    className={'chip' + (g.emoji === e ? ' actif' : '')}
                    style={{ fontSize: 20, padding: '6px 10px' }}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <input
                className="champ"
                placeholder="Prénom"
                value={g.nom}
                onChange={(e) => majGen(i, { nom: e.target.value })}
              />
              <input
                className="champ"
                type="number"
                placeholder="Âge (optionnel)"
                value={g.age ?? ''}
                onChange={(e) => majGen(i, { age: e.target.value ? +e.target.value : undefined })}
              />
              {gens.length > 1 && (
                <button
                  className="btn fantome petit"
                  onClick={() => setGens((gg) => gg.filter((_, idx) => idx !== i))}
                >
                  Retirer
                </button>
              )}
            </div>
          ))}

          <button className="btn fantome bloc" onClick={ajouter}>
            + Ajouter une personne
          </button>
          <button
            className="btn bloc"
            disabled={valides.length === 0}
            onClick={() => {
              setGens(valides)
              setActif(0)
              setEtape('gouts')
            }}
          >
            Continuer
          </button>
        </div>
      )}

      {etape === 'gouts' && (
        <div className="pile" style={{ gap: 16 }}>
          <div className="entete">
            <div>
              <h1>Les goûts</h1>
              <p className="sous-titre">Popote s'en servira pour proposer ce que vous aimez.</p>
            </div>
          </div>

          <div className="tags">
            {gens.map((g, i) => (
              <button
                key={i}
                className={'chip' + (actif === i ? ' actif' : '')}
                onClick={() => setActif(i)}
              >
                {g.emoji} {g.nom}
              </button>
            ))}
          </div>

          <Mascotte
            emoji={gens[actif]?.emoji}
            texte={`Pour ${gens[actif]?.nom || '…'}, on aime, c'est moyen, ou pas du tout ?`}
          />

          <div className="pile" style={{ gap: 8 }}>
            {OPTIONS.map((o) => {
              const v = gens[actif]?.gouts[o.cle]
              return (
                <div className="carte ligne espace" key={o.cle} style={{ padding: '12px 16px' }}>
                  <span style={{ fontWeight: 700 }}>
                    {o.emoji} {o.label}
                  </span>
                  <div className="ligne" style={{ gap: 6 }}>
                    <button
                      className={'chip aime' + (v === 1 ? ' actif' : '')}
                      onClick={() => setGout(actif, o.cle, 1)}
                    >
                      👍
                    </button>
                    <button
                      className={'chip moyen' + (v === 0 ? ' actif' : '')}
                      onClick={() => setGout(actif, o.cle, 0)}
                    >
                      😐
                    </button>
                    <button
                      className={'chip pasaime' + (v === -1 ? ' actif' : '')}
                      onClick={() => setGout(actif, o.cle, -1)}
                    >
                      👎
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button className="btn bloc" onClick={terminer}>
            Terminer 🎉
          </button>
          <button className="btn clair bloc" onClick={terminer}>
            Passer cette étape
          </button>
        </div>
      )}
    </div>
  )
}
