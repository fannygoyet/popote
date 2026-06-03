import { useState } from 'react'
import type { Personne } from '../store/types'

// Sélecteur « pour qui ? » : le foyer est visible et cochable ; les invités
// (personnes marquées « pas à la maison ») sont repliés derrière « + Inviter ».
export function PourQui({
  personnes,
  pour,
  onToggle,
  label = 'Pour qui ?',
}: {
  personnes: Personne[]
  pour: string[]
  onToggle: (id: string) => void
  label?: string
}) {
  const foyer = personnes.filter((p) => p.foyer !== false)
  const invites = personnes.filter((p) => p.foyer === false)
  const [ouvert, setOuvert] = useState(false)
  const montrerInvites = ouvert || invites.some((p) => pour.includes(p.id))

  return (
    <div>
      <span className="label">{label}</span>
      <div className="tags">
        {foyer.map((p) => (
          <button key={p.id} className={'chip' + (pour.includes(p.id) ? ' actif' : '')} onClick={() => onToggle(p.id)}>
            {p.emoji} {p.nom}
          </button>
        ))}
        {invites.length > 0 && !montrerInvites && (
          <button className="chip" style={{ background: 'var(--lilas-clair)' }} onClick={() => setOuvert(true)}>
            ＋ Inviter
          </button>
        )}
      </div>
      {invites.length > 0 && montrerInvites && (
        <>
          <span className="sous-titre" style={{ display: 'block', margin: '8px 0 2px 4px', fontSize: 12 }}>
            Invités
          </span>
          <div className="tags">
            {invites.map((p) => (
              <button key={p.id} className={'chip' + (pour.includes(p.id) ? ' actif' : '')} onClick={() => onToggle(p.id)}>
                {p.emoji} {p.nom}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
