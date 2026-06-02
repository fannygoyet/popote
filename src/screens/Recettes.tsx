import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { RecetteCarte } from '../components/RecetteCarte'

const FILTRES = ['Tout', 'Mes recettes', 'Faisable', 'Aimées', 'Jamais testées', 'Rapide', 'Végé', 'Enfant']

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

      <button className="btn bloc" onClick={() => nav('/creer-recette')}>
        ➕ Créer une recette
      </button>

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
