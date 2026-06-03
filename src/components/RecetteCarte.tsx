import type { Recette } from '../store/types'
import { estAntiInflam } from '../store/sante'

export function RecetteCarte({
  recette,
  manquants = 0,
  onClick,
}: {
  recette: Recette
  manquants?: number
  onClick?: () => void
}) {
  return (
    <button className="carte ligne" onClick={onClick} style={{ textAlign: 'left', width: '100%' }}>
      <div
        style={{
          fontSize: 38,
          width: 64,
          height: 64,
          borderRadius: 18,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--lilas-fond)',
          flexShrink: 0,
        }}
      >
        {recette.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontSize: 17 }}>{recette.nom}</strong>
        <div className="ligne" style={{ gap: 10, marginTop: 4, color: 'var(--texte-doux)', fontSize: 13 }}>
          <span>⏱️ {recette.tempsMin} min</span>
          <span>🔥 {recette.kcalPortion} kcal</span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {manquants > 0 ? (
            <span className="tag" style={{ background: 'var(--peche-clair)', color: '#b45a3c' }}>
              🛒 {manquants} à acheter
            </span>
          ) : (
            <span className="tag" style={{ background: 'var(--menthe-clair)', color: '#2c6b53' }}>
              ✓ Faisable maintenant
            </span>
          )}
          {estAntiInflam(recette) && (
            <span className="tag" style={{ background: 'var(--menthe-clair)', color: '#2c6b53' }}>
              🌿 Anti-inflam
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 22, color: 'var(--texte-doux)' }}>→</span>
    </button>
  )
}
