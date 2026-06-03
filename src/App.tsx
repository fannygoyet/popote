import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store/store'
import { Nav } from './components/Nav'
import { Onboarding } from './screens/Onboarding'
import { Accueil } from './screens/Accueil'
import { Flemme } from './screens/Flemme'
import { Recettes } from './screens/Recettes'
import { RecetteDetail } from './screens/RecetteDetail'
import { Inventaire } from './screens/Inventaire'
import { Planning } from './screens/Planning'
import { Courses } from './screens/Courses'
import { Profil } from './screens/Profil'
import { Manger } from './screens/Manger'
import { CreerRecette } from './screens/CreerRecette'
import { Sync } from './screens/Sync'
import { Enfant } from './screens/Enfant'
import { ImportReel } from './screens/ImportReel'
import { BowlBuilder } from './screens/BowlBuilder'

export default function App() {
  const { data } = useStore()
  const loc = useLocation()

  if (!data.onboardingFait && loc.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  const cacherNav = loc.pathname === '/onboarding'

  return (
    <div className="app">
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<Accueil />} />
        <Route path="/flemme" element={<Flemme />} />
        <Route path="/bowl" element={<BowlBuilder />} />
        <Route path="/recettes" element={<Recettes />} />
        <Route path="/creer-recette" element={<CreerRecette />} />
        <Route path="/import" element={<ImportReel />} />
        <Route path="/recettes/:id" element={<RecetteDetail />} />
        <Route path="/inventaire" element={<Inventaire />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/manger" element={<Manger />} />
        <Route path="/enfant" element={<Enfant />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/sync" element={<Sync />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!cacherNav && <Nav />}
    </div>
  )
}
