import { NavLink } from 'react-router-dom'

const liens = [
  { to: '/', ic: '🏠', label: 'Accueil' },
  { to: '/recettes', ic: '📖', label: 'Recettes' },
  { to: '/inventaire', ic: '🧺', label: 'Placards' },
  { to: '/planning', ic: '🗓️', label: 'Semaine' },
  { to: '/courses', ic: '🛒', label: 'Courses' },
]

export function Nav() {
  return (
    <nav className="nav">
      {liens.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'actif' : '')}>
          <span className="ic">{l.ic}</span>
          <span>{l.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
