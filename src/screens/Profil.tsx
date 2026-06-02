import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { aujourdhui } from '../store/util'
import { CalculateurKcal } from '../components/CalculateurKcal'
import { GOUT_OPTIONS } from '../store/gouts'

const EMOJIS = ['👩', '👧', '👦', '🧑', '👨', '👵', '👴', '🧒', '👶', '🐱']

export function Profil() {
  const { data, kcalDuJour, setGout, reset, produit, sync, ajouterPersonne, majPersonne, supprimerPersonne } =
    useStore()
  const nav = useNavigate()
  const [actif, setActif] = useState(0)
  const [calc, setCalc] = useState(false)
  const [rechProd, setRechProd] = useState('')
  const [ajout, setAjout] = useState(false)
  const [nNom, setNNom] = useState('')
  const [nEmoji, setNEmoji] = useState('👦')
  const [editProfil, setEditProfil] = useState(false)
  const personne = data.personnes[Math.min(actif, Math.max(0, data.personnes.length - 1))]

  // produits hors liste curatée, pour ajouter un goût/dégoût sur n'importe quel ingrédient
  const resultatsProd = useMemo(() => {
    const q = rechProd.toLowerCase().trim()
    if (!q) return []
    const dejaListes = new Set(GOUT_OPTIONS.map((o) => o.cle))
    return data.produits
      .filter((p) => p.nom.toLowerCase().includes(q) && !dejaListes.has(`prod:${p.id}`))
      .slice(0, 12)
  }, [data.produits, rechProd])

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

  function TroisBoutons({ cle }: { cle: string }) {
    const v = personne.gouts[cle]
    return (
      <div className="ligne" style={{ gap: 6 }}>
        <button className={'chip aime' + (v === 1 ? ' actif' : '')} onClick={() => setGout(personne.id, cle, 1)}>
          👍
        </button>
        <button className={'chip moyen' + (v === 0 ? ' actif' : '')} onClick={() => setGout(personne.id, cle, 0)}>
          😐
        </button>
        <button className={'chip pasaime' + (v === -1 ? ' actif' : '')} onClick={() => setGout(personne.id, cle, -1)}>
          👎
        </button>
      </div>
    )
  }

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <div>
          <h1>Profil</h1>
          <p className="sous-titre">Calories, goûts & préférences</p>
        </div>
        <button className="rond" onClick={() => nav('/')}>
          ✕
        </button>
      </div>

      <div className="tags">
        {data.personnes.map((p, i) => (
          <button key={p.id} className={'chip' + (actif === i ? ' actif' : '')} onClick={() => setActif(i)}>
            {p.emoji} {p.nom}
          </button>
        ))}
        <button className="chip" onClick={() => setAjout((a) => !a)} style={{ background: 'var(--menthe-clair)' }}>
          ➕ Ajouter
        </button>
      </div>

      {/* Ajouter une personne */}
      {ajout && (
        <div className="carte pile" style={{ gap: 12 }}>
          <strong>Nouvelle personne</strong>
          <div className="ligne" style={{ flexWrap: 'wrap', gap: 6 }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                className={'chip' + (nEmoji === e ? ' actif' : '')}
                onClick={() => setNEmoji(e)}
                style={{ fontSize: 20, padding: '6px 10px' }}
              >
                {e}
              </button>
            ))}
          </div>
          <input className="champ" placeholder="Prénom (ex. ton fils)" value={nNom} onChange={(e) => setNNom(e.target.value)} />
          <button
            className="btn bloc"
            disabled={!nNom.trim()}
            onClick={() => {
              const id = ajouterPersonne({ nom: nNom.trim(), emoji: nEmoji, gouts: {} })
              setActif(data.personnes.length) // sélectionne le nouveau
              setNNom('')
              setNEmoji('👦')
              setAjout(false)
              void id
            }}
          >
            Ajouter {nNom.trim() || 'cette personne'}
          </button>
        </div>
      )}

      {/* Modifier / supprimer le profil sélectionné */}
      <div className="carte pile" style={{ gap: 10 }}>
        <button className="ligne espace" onClick={() => setEditProfil((v) => !v)} style={{ textAlign: 'left' }}>
          <strong>
            {personne.emoji} {personne.nom}
          </strong>
          <span className="tag">{editProfil ? 'Fermer' : 'Modifier'}</span>
        </button>
        {editProfil && (
          <>
            <div className="ligne" style={{ flexWrap: 'wrap', gap: 6 }}>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className={'chip' + (personne.emoji === e ? ' actif' : '')}
                  onClick={() => majPersonne(personne.id, { emoji: e })}
                  style={{ fontSize: 20, padding: '6px 10px' }}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              className="champ"
              value={personne.nom}
              onChange={(e) => majPersonne(personne.id, { nom: e.target.value })}
            />
            {data.personnes.length > 1 && (
              <button
                className="btn fantome petit"
                style={{ color: '#a33a63' }}
                onClick={() => {
                  if (confirm(`Supprimer le profil de ${personne.nom} ?`)) {
                    supprimerPersonne(personne.id)
                    setActif(0)
                    setEditProfil(false)
                  }
                }}
              >
                Supprimer ce profil
              </button>
            )}
          </>
        )}
      </div>

      {/* Calories du jour */}
      <div className="carte pile" style={{ gap: 12 }}>
        <div className="ligne espace">
          <strong>🔥 Calories aujourd'hui</strong>
          {objectif > 0 && <span className="tag">{pct}%</span>}
        </div>
        <div style={{ fontSize: 34, fontWeight: 900 }}>
          {kcal}
          {objectif > 0 && <span style={{ fontSize: 16, color: 'var(--texte-doux)', fontWeight: 700 }}> / {objectif} kcal</span>}
        </div>
        {objectif > 0 && (
          <div className="barre">
            <span style={{ width: pct + '%', background: pct > 100 ? 'var(--peche)' : 'var(--lilas)' }} />
          </div>
        )}
        <div className="grille-2">
          <button className="btn fantome bloc petit" onClick={() => setCalc(true)}>
            {objectif > 0 ? '⚖️ Ajuster mon objectif' : '🎯 Calculer mon objectif'}
          </button>
          <button className="btn bloc petit" onClick={() => nav('/manger')}>
            🍽️ J'ai mangé
          </button>
        </div>
        {objectif === 0 && (
          <p className="sous-titre" style={{ margin: 0 }}>
            Tu ne sais pas quoi mettre ? Lance le calcul, je t'explique tout. 😊
          </p>
        )}
      </div>

      {/* Repas du jour */}
      <div className="carte pile" style={{ gap: 10 }}>
        <strong>🍽️ Mes repas du jour</strong>
        {repasDuJour.length === 0 && (
          <span className="sous-titre">Rien de noté. Cuisine une recette, ou utilise « J'ai mangé ».</span>
        )}
        {repasDuJour.map(({ j, r }) => (
          <div className="ligne espace" key={j.id}>
            <span>
              {r?.emoji ?? '🍴'} {j.libelle ?? r?.nom ?? '—'}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--texte-doux)' }}>
              {j.kcalManuel != null ? j.kcalManuel : Math.round((r?.kcalPortion ?? 0) * j.portions)} kcal
            </span>
          </div>
        ))}
      </div>

      {/* Éditeur de goûts (évolutif) */}
      <div className="carte pile" style={{ gap: 10 }}>
        <strong>😋 Les goûts de {personne.nom}</strong>
        <p className="sous-titre" style={{ margin: 0 }}>
          Ça affine les propositions. Et chaque fois que tu notes une recette, ça s'améliore tout seul.
        </p>
        {GOUT_OPTIONS.map((o) => (
          <div className="ligne espace" key={o.cle}>
            <span style={{ fontWeight: 700 }}>
              {o.emoji} {o.label}
            </span>
            <TroisBoutons cle={o.cle} />
          </div>
        ))}

        <span className="label" style={{ marginTop: 6 }}>
          Ajouter un aliment précis (ex. l'oignon que {personne.nom} déteste)
        </span>
        <input className="champ" placeholder="🔍 oignon, brocoli, crevettes…" value={rechProd} onChange={(e) => setRechProd(e.target.value)} />
        {resultatsProd.map((p) => (
          <div className="ligne espace" key={p.id}>
            <span style={{ fontWeight: 700 }}>{p.nom}</span>
            <TroisBoutons cle={`prod:${p.id}`} />
          </div>
        ))}

        {/* Récap des aliments pas aimés déjà enregistrés */}
        {Object.entries(personne.gouts).filter(([, v]) => v === -1).length > 0 && (
          <>
            <span className="label" style={{ marginTop: 6 }}>
              Pas aimés
            </span>
            <div className="tags">
              {Object.entries(personne.gouts)
                .filter(([, v]) => v === -1)
                .map(([cle]) => {
                  const opt = GOUT_OPTIONS.find((o) => o.cle === cle)
                  const nom = opt ? opt.label : cle.startsWith('prod:') ? produit(cle.slice(5))?.nom ?? cle : cle.slice(4)
                  return (
                    <button
                      key={cle}
                      className="chip pasaime actif"
                      onClick={() => setGout(personne.id, cle, -1)}
                      title="Cliquer pour enlever"
                    >
                      👎 {nom} ✕
                    </button>
                  )
                })}
            </div>
          </>
        )}
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

      <button className="carte ligne espace" onClick={() => nav('/sync')} style={{ textAlign: 'left' }}>
        <div>
          <strong>🔄 Sync iPhone ↔ iPad</strong>
          <p className="sous-titre" style={{ margin: '2px 0 0' }}>
            {sync.etat === 'off' ? 'Désactivée — tout est local' : sync.etat === 'err' ? 'Erreur de sync' : sync.etat === 'sync' ? 'Synchronisation…' : 'Activée ✓'}
          </p>
        </div>
        <span style={{ fontSize: 22 }}>→</span>
      </button>

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

      {calc && <CalculateurKcal personne={personne} onClose={() => setCalc(false)} />}
    </div>
  )
}
