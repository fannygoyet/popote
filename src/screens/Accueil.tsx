import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'

function salut(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Bonjour'
  if (h < 18) return 'Coucou'
  return 'Bonsoir'
}

export function Accueil() {
  const { data, kcalDuJour } = useStore()
  const nav = useNavigate()
  const moi = data.personnes[0]
  const aimees = data.avis.filter((a) => a.note === 1).length
  const enStock = data.stock.length
  const planifies = data.planning.length

  return (
    <div className="ecran pile" style={{ gap: 18 }}>
      <div className="entete">
        <div>
          <h1>
            {salut()}
            {moi ? `, ${moi.nom}` : ''} {moi?.emoji ?? '👋'}
          </h1>
          <p className="sous-titre">On mange quoi aujourd'hui ?</p>
        </div>
        <Link to="/profil" className="rond" style={{ textDecoration: 'none' }}>
          {moi?.emoji ?? '⚙️'}
        </Link>
      </div>

      <Mascotte texte="Dis-moi ton humeur du jour, je m'occupe du reste." />

      {/* Le choix qui structure toute l'app : flemme ou motivée */}
      <div className="grille-2">
        <button
          className="carte-pleine pile"
          onClick={() => nav('/flemme')}
          style={{ background: 'linear-gradient(150deg, var(--peche-clair), var(--peche))', alignItems: 'flex-start', gap: 6 }}
        >
          <span style={{ fontSize: 44 }}>😮‍💨</span>
          <strong style={{ fontSize: 19 }}>J'ai la flemme</strong>
          <span style={{ fontSize: 13, color: 'var(--texte-doux)' }}>
            3 idées prêtes, avec ce que j'ai déjà
          </span>
        </button>
        <button
          className="carte-pleine pile"
          onClick={() => nav('/planning')}
          style={{ background: 'linear-gradient(150deg, var(--menthe-clair), var(--menthe))', alignItems: 'flex-start', gap: 6 }}
        >
          <span style={{ fontSize: 44 }}>✨</span>
          <strong style={{ fontSize: 19 }}>Je suis motivée</strong>
          <span style={{ fontSize: 13, color: 'var(--texte-doux)' }}>
            Je planifie ma semaine et mes courses
          </span>
        </button>
      </div>

      <button
        className="carte-pleine ligne"
        onClick={() => nav('/bowl')}
        style={{ gap: 14, background: 'linear-gradient(150deg, var(--menthe-clair), var(--beurre-clair))', textAlign: 'left' }}
      >
        <span style={{ fontSize: 40 }}>🥗</span>
        <div>
          <strong style={{ fontSize: 18 }}>Bowl à construire</strong>
          <div style={{ fontSize: 13, color: 'var(--texte-doux)' }}>Un bowl équilibré avec ce que j'ai déjà</div>
        </div>
      </button>

      <button className="btn fantome bloc" onClick={() => nav('/manger')}>
        🍽️ J'ai mangé (resto, grignotage…)
      </button>

      <button
        className="carte-pleine ligne"
        onClick={() => nav('/enfant')}
        style={{ gap: 14, background: 'linear-gradient(150deg, var(--rose-clair), var(--beurre-clair))', textAlign: 'left' }}
      >
        <span style={{ fontSize: 40 }}>🧒</span>
        <div>
          <strong style={{ fontSize: 18 }}>Mode enfant</strong>
          <div style={{ fontSize: 13, color: 'var(--texte-doux)' }}>Laisse ton loulou choisir le repas</div>
        </div>
      </button>

      {/* Stats rapides */}
      <div className="grille-2">
        <div className="stat" style={{ background: 'var(--lilas-clair)' }}>
          <div className="lbl">❤️ Recettes aimées</div>
          <div className="num">{aimees}</div>
        </div>
        <div className="stat" style={{ background: 'var(--bleu-clair)' }}>
          <div className="lbl">🧺 Dans les placards</div>
          <div className="num">{enStock}</div>
        </div>
      </div>

      {moi?.objectifKcal && (
        <Link to="/profil" className="carte ligne espace" style={{ textDecoration: 'none' }}>
          <div>
            <div className="lbl">🔥 Calories du jour</div>
            <div className="num" style={{ fontSize: 22 }}>
              {Math.round(kcalDuJour(moi.id))}{' '}
              <span style={{ fontSize: 14, color: 'var(--texte-doux)' }}>/ {moi.objectifKcal}</span>
            </div>
          </div>
          <span style={{ fontSize: 26 }}>→</span>
        </Link>
      )}

      <div className="carte ligne espace">
        <div>
          <strong>🗓️ Cette semaine</strong>
          <p className="sous-titre" style={{ margin: '2px 0 0' }}>
            {planifies > 0 ? `${planifies} repas prévus` : 'Rien de prévu encore'}
          </p>
        </div>
        <Link to="/planning" className="btn fantome petit" style={{ textDecoration: 'none' }}>
          Voir
        </Link>
      </div>
    </div>
  )
}
