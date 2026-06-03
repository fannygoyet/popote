import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { RecetteCarte } from '../components/RecetteCarte'
import { estAntiInflam, TIPS_ANTI_INFLAM } from '../store/sante'

const FILTRES = ['Tout', '🌿 Anti-inflam', '📱 Réels', 'Mes recettes', 'Faisable', 'Aimées', 'Jamais testées', 'Rapide', 'Végé', 'Enfant']

export function Recettes() {
  const { data, faisabilite } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState('Tout')

  const liste = useMemo(() => {
    return data.recettes
      .map((r) => ({ r, f: faisabilite(r) }))
      .filter(({ r }) => r.nom.toLowerCase().includes(q.toLowerCase().trim()))
      .filter(({ r, f }) => {
        switch (filtre) {
          case '🌿 Anti-inflam':
            return estAntiInflam(r)
          case '📱 Réels':
            return r.source === 'reseaux'
          case 'Mes recettes':
            return !!r.perso
          case 'Faisable':
            return f.ok
          case 'Aimées':
            return data.avis.some((a) => a.recetteId === r.id && a.note === 1)
          case 'Jamais testées':
            return !data.avis.some((a) => a.recetteId === r.id)
          case 'Rapide':
            return r.tempsMin <= 20
          case 'Végé':
            return r.tags.includes('végé')
          case 'Enfant':
            return r.tags.includes('enfant')
          default:
            return true
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, filtre])

  return (
    <div className="ecran pile" style={{ gap: 14 }}>
      <div className="entete">
        <div>
          <h1>Recettes 📖</h1>
          <p className="sous-titre">{data.recettes.length} recettes dans ta popothèque</p>
        </div>
      </div>

      <div className="grille-2">
        <button className="btn bloc" onClick={() => nav('/creer-recette')}>
          ➕ Créer
        </button>
        <button className="btn fantome bloc" onClick={() => nav('/import')}>
          📱 Importer un réel
        </button>
      </div>

      <input
        className="champ"
        placeholder="🔍 Chercher une recette…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="tags" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
        {FILTRES.map((f) => (
          <button
            key={f}
            className={'chip' + (filtre === f ? ' actif' : '')}
            onClick={() => setFiltre(f)}
            style={{ flexShrink: 0 }}
          >
            {f}
          </button>
        ))}
      </div>

      {filtre === '🌿 Anti-inflam' && (
        <div className="carte pile" style={{ gap: 6, background: 'var(--menthe-clair)' }}>
          <strong>🌿 Manger anti-inflammatoire</strong>
          {TIPS_ANTI_INFLAM.slice(0, 5).map((t, i) => (
            <span key={i} style={{ fontSize: 13 }}>
              {t}
            </span>
          ))}
          <span className="sous-titre" style={{ fontSize: 12 }}>
            Astuce : active « Privilégier l'anti-inflammatoire » dans ton profil pour que Popote te
            les propose en priorité.
          </span>
        </div>
      )}

      <div className="pile">
        {liste.map(({ r, f }) => (
          <RecetteCarte
            key={r.id}
            recette={r}
            manquants={f.manquants.length}
            onClick={() => nav(`/recettes/${r.id}`)}
          />
        ))}
        {liste.length === 0 && (
          <div className="vide">
            <div className="gros">🔍</div>
            Aucune recette ne correspond.
          </div>
        )}
      </div>
    </div>
  )
}
