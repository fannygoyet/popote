import { useState } from 'react'
import { useStore } from '../store/store'
import type { Activite, ObjectifType, Personne, Sexe } from '../store/types'

const ACTIVITES: { cle: Activite; label: string; facteur: number; ex: string }[] = [
  { cle: 'sedentaire', label: 'Sédentaire', facteur: 1.2, ex: 'bureau, peu de marche' },
  { cle: 'leger', label: 'Légère', facteur: 1.375, ex: 'sport 1-2x/sem' },
  { cle: 'modere', label: 'Modérée', facteur: 1.55, ex: 'sport 3-4x/sem' },
  { cle: 'intense', label: 'Intense', facteur: 1.725, ex: 'sport 5-6x/sem' },
  { cle: 'tres-intense', label: 'Très intense', facteur: 1.9, ex: 'sport quotidien / physique' },
]

const OBJECTIFS: { cle: ObjectifType; label: string; delta: number; emoji: string }[] = [
  { cle: 'perdre', label: 'Perdre du poids', delta: -400, emoji: '📉' },
  { cle: 'maintenir', label: 'Maintenir', delta: 0, emoji: '⚖️' },
  { cle: 'prendre', label: 'Prendre du poids', delta: 300, emoji: '📈' },
]

// Calcul du métabolisme de base (Mifflin-St Jeor) puis besoin total selon l'activité.
function calcul(sexe: Sexe, age: number, taille: number, poids: number, act: Activite, obj: ObjectifType) {
  if (!age || !taille || !poids) return null
  const bmr = 10 * poids + 6.25 * taille - 5 * age + (sexe === 'H' ? 5 : -161)
  const facteur = ACTIVITES.find((a) => a.cle === act)!.facteur
  const tdee = bmr * facteur
  const delta = OBJECTIFS.find((o) => o.cle === obj)!.delta
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), objectif: Math.round(tdee + delta) }
}

export function CalculateurKcal({ personne, onClose }: { personne: Personne; onClose: () => void }) {
  const { majPersonne } = useStore()
  const [sexe, setSexe] = useState<Sexe>(personne.sexe ?? 'F')
  const [age, setAge] = useState<number | ''>(personne.age ?? '')
  const [taille, setTaille] = useState<number | ''>(personne.taille ?? '')
  const [poids, setPoids] = useState<number | ''>(personne.poids ?? '')
  const [act, setAct] = useState<Activite>(personne.activite ?? 'leger')
  const [obj, setObj] = useState<ObjectifType>(personne.objectifType ?? 'maintenir')

  const res = calcul(sexe, +age, +taille, +poids, act, obj)

  function valider() {
    if (!res) return
    majPersonne(personne.id, {
      sexe,
      age: age ? +age : undefined,
      taille: taille ? +taille : undefined,
      poids: poids ? +poids : undefined,
      activite: act,
      objectifType: obj,
      objectifKcal: res.objectif,
    })
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(74,68,88,.35)', zIndex: 45, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
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
          maxHeight: '90vh',
          overflowY: 'auto',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ligne espace">
          <h3>🔥 Calcule ton objectif</h3>
          <button className="btn clair petit" onClick={onClose}>
            Fermer
          </button>
        </div>

        <p className="sous-titre" style={{ margin: 0 }}>
          On estime d'abord ton métabolisme de base (l'énergie que ton corps brûle au repos), puis
          on l'ajuste à ton activité et à ton objectif. C'est une estimation pour t'orienter, pas une
          vérité absolue.
        </p>

        <div>
          <span className="label">Sexe biologique</span>
          <div className="tags">
            <button className={'chip' + (sexe === 'F' ? ' actif' : '')} onClick={() => setSexe('F')}>
              Femme
            </button>
            <button className={'chip' + (sexe === 'H' ? ' actif' : '')} onClick={() => setSexe('H')}>
              Homme
            </button>
          </div>
        </div>

        <div className="grille-2">
          <div>
            <span className="label">Âge</span>
            <input className="champ" type="number" inputMode="numeric" placeholder="ans" value={age} onChange={(e) => setAge(e.target.value ? +e.target.value : '')} />
          </div>
          <div>
            <span className="label">Taille (cm)</span>
            <input className="champ" type="number" inputMode="numeric" placeholder="cm" value={taille} onChange={(e) => setTaille(e.target.value ? +e.target.value : '')} />
          </div>
        </div>
        <div>
          <span className="label">Poids (kg)</span>
          <input className="champ" type="number" inputMode="decimal" placeholder="kg" value={poids} onChange={(e) => setPoids(e.target.value ? +e.target.value : '')} />
        </div>

        <div>
          <span className="label">Niveau d'activité</span>
          <div className="pile" style={{ gap: 6 }}>
            {ACTIVITES.map((a) => (
              <button
                key={a.cle}
                className={'carte ligne espace' + (act === a.cle ? '' : '')}
                onClick={() => setAct(a.cle)}
                style={{ padding: '12px 16px', border: act === a.cle ? '2px solid var(--lilas)' : '2px solid transparent', textAlign: 'left' }}
              >
                <span style={{ fontWeight: 700 }}>{a.label}</span>
                <span className="sous-titre" style={{ fontSize: 12 }}>{a.ex}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Objectif</span>
          <div className="tags">
            {OBJECTIFS.map((o) => (
              <button key={o.cle} className={'chip' + (obj === o.cle ? ' actif' : '')} onClick={() => setObj(o.cle)}>
                {o.emoji} {o.label}
              </button>
            ))}
          </div>
        </div>

        {res ? (
          <div className="carte-pleine pile" style={{ background: 'linear-gradient(150deg, var(--lilas-clair), var(--beurre-clair))', gap: 8 }}>
            <span className="lbl">Ton objectif estimé</span>
            <div style={{ fontSize: 38, fontWeight: 900 }}>{res.objectif} kcal/jour</div>
            <div className="sous-titre" style={{ fontSize: 13 }}>
              Métabolisme de base : {res.bmr} kcal · Besoin avec activité : {res.tdee} kcal
              {obj === 'perdre' && ' · −400 pour perdre en douceur (~0,4 kg/sem)'}
              {obj === 'prendre' && ' · +300 pour prendre progressivement'}
            </div>
          </div>
        ) : (
          <div className="vide" style={{ padding: 16 }}>Remplis âge, taille et poids pour voir le résultat.</div>
        )}

        <button className="btn bloc" disabled={!res} onClick={valider}>
          Utiliser cet objectif
        </button>
      </div>
    </div>
  )
}
