import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './store/store'
import './theme.css'

// Filet de sécurité : en cas d'erreur de rendu, on évite l'écran blanc total
// (important pour une PWA utilisée hors connexion, sans console à portée de main).
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { erreur: Error | null }> {
  state = { erreur: null as Error | null }
  static getDerivedStateFromError(erreur: Error) {
    return { erreur }
  }
  render() {
    if (this.state.erreur) {
      return (
        <div className="app">
          <div className="ecran vide" style={{ paddingTop: 60 }}>
            <div className="gros">🍲😵</div>
            <h2 style={{ margin: '8px 0' }}>Oups, Popote a buggé</h2>
            <p className="sous-titre" style={{ maxWidth: 320, margin: '0 auto 20px' }}>
              Pas de panique, tes données sont en sécurité sur l'appareil. Recharge l'app.
            </p>
            <button className="btn" onClick={() => location.reload()}>
              Recharger
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ErrorBoundary>
    </HashRouter>
  </React.StrictMode>,
)
