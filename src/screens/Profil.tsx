import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, aujourdhui } from '../store/store'

export function Profil() {
  const { data, kcalDuJour, majPersonne, reset } = useStore()
  const nav = useNavigate()
  const [actif, setActif] = useState(0)
  const personne = data.personnes[actif]

  if (!personne) {
    return (
      <div className="ecran vide">
        <div className="gros">👤</div>
        Aucun profil.
        <button className="btn bloc" style={{ marginTop: 16 }} onClick={() => nav('/onboarding')}>
          Configurer
        </button>
      </div>
    )
  }

  const kcal = Math.round(kcalDuJour(personne.id))
  const objectif = personne.objectifKcal ?? 0
  const pct = objectif ? Math.min(100, Math.round((kcal / objectif) * 100)) : 0

  const repasDuJour = data.journal
    .filter((j) => j.personneId === personne.id && j.date === aujourdhui())
    .map((j) => ({ j, r: data.recettes.find((r) => r.id === j.recetteId) }))

  const aimees = data.avis
    .filter((a) => a.personneId === personne.id && a.note === 1)
    .map((a) => data.recettes.find((r) => r.id === a.recetteId))
    .filter(Boolean)

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <div>
          <h1>Profil</h1>
          <p className="sous-titre">Calories & préférences</p>
        </div>
        <button className="rond" onClick={() => nav('/')}>
          ✕
        </button>
      </div>

      {/* Sélecteur de personne */}
      <div className="tags">
        {data.personnes.map((p, i) => (
          <button key={p.id} className={'chip' + (actif === i ? ' actif' : '')} onClick={() => setActif(i)}>
            {p.emoji} {p.nom}
          </button>
        ))}
      </div>

      {/* Calories du jour */}
      <div className="carte pile" style={{ gap: 12 }}>
        <div className="ligne espace">
          <strong>🔥 Calories aujourd'hui</strong>
          {objectif > 0 && <span className="tag">{pct}%</span>}
        </div>
        <div style={{ fontSize: 34, fontWeight: 900 }}>
          {kcal}
          {objectif > 0 && (
            <span style={{ fontSize: 16, color: 'var(--texte-doux)', fontWeight: 700 }}> / {objectif} kcal</span>
          )}
        </div>
        {objectif > 0 && (
          <div className="barre">
            <span style={{ width: pct + '%', background: pct > 100 ? 'var(--peche)' : 'var(--lilas)' }} />
          </div>
        )}
        <div className="ligne" style={{ gap: 8 }}>
          <span className="label" style={{ margin: 0 }}>
            Objectif :
          </span>
          <input
            className="champ"
            type="number"
            style={{ maxWidth: 130 }}
            placeholder="kcal/jour"
            value={personne.objectifKcal ?? ''}
            onChange={(e) =>
              majPersonne(personne.id, {
                objectifKcal: e.target.value ? +e.target.value : undefined,
              })
            }
          />
        </div>
      </div>

      {/* Repas du jour */}
      <div className="carte pile" style={{ gap: 10 }}>
        <strong>🍽️ Mes repas du jour</strong>
        {repasDuJour.length === 0 && <span className="sous-titre">Rien de noté. Cuisine une recette et valide « J'ai cuisiné ».</span>}
        {repasDuJour.map(({ j, r }) => (
          <div className="ligne espace" key={j.id}>
            <span>
              {r?.emoji} {r?.nom ?? '—'}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--texte-doux)' }}>
              {Math.round((r?.kcalPortion ?? 0) * j.portions)} kcal
            </span>
          </div>
        ))}
      </div>

      {/* Recettes aimées */}
      <div className="carte pile" style={{ gap: 8 }}>
        <strong>❤️ Ce que {personne.nom} aime</strong>
        {aimees.length === 0 && <span className="sous-titre">Pas encore de coup de cœur.</span>}
        <div className="tags">
          {aimees.map((r) => (
            <span className="tag" key={r!.id}>
              {r!.emoji} {r!.nom}
            </span>
          ))}
        </div>
      </div>

      <button
        className="btn clair bloc"
        style={{ color: '#a33a63' }}
        onClick={() => {
          if (confirm('Tout réinitialiser ? (profils, stock, recettes notées…)')) {
            reset()
            nav('/onboarding', { replace: true })
          }
        }}
      >
        Réinitialiser l'app
      </button>
      <p className="sous-titre" style={{ textAlign: 'center', margin: 0 }}>
        Toutes tes données restent sur cet appareil. 🔒
      </p>
    </div>
  )
}
