import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, aujourdhui } from '../store/store'
import { Mascotte } from '../components/Mascotte'

const PRESETS = [
  { libelle: 'Café / thé', kcal: 5 },
  { libelle: 'Fruit', kcal: 80 },
  { libelle: 'Sandwich', kcal: 400 },
  { libelle: 'Burger-frites', kcal: 900 },
  { libelle: 'Pizza (part)', kcal: 280 },
  { libelle: 'Salade resto', kcal: 350 },
  { libelle: 'Pâtisserie', kcal: 350 },
  { libelle: 'Verre de vin', kcal: 120 },
]

export function Manger() {
  const { data, loggerRepas, loggerLibre, supprimerRepas } = useStore()
  const nav = useNavigate()
  const [qui, setQui] = useState<string[]>(data.personnes[0] ? [data.personnes[0].id] : [])
  const [onglet, setOnglet] = useState<'recette' | 'libre'>('recette')
  const [q, setQ] = useState('')
  const [libelle, setLibelle] = useState('')
  const [kcal, setKcal] = useState<number | ''>('')
  const [flash, setFlash] = useState<string | null>(null)

  const recettes = useMemo(
    () => data.recettes.filter((r) => r.nom.toLowerCase().includes(q.toLowerCase().trim())),
    [data.recettes, q],
  )

  function toggleQui(id: string) {
    setQui((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))
  }

  function logRecette(rid: string) {
    qui.forEach((pid) => loggerRepas(rid, pid, 1))
    setFlash(data.recettes.find((r) => r.id === rid)?.nom ?? 'Repas ajouté')
  }
  function logLibre(lib: string, k: number) {
    if (!lib || !k) return
    qui.forEach((pid) => loggerLibre({ libelle: lib, kcal: k, personneId: pid }))
    setFlash(`${lib} · ${k} kcal`)
    setLibelle('')
    setKcal('')
  }

  const journalJour = data.journal
    .filter((j) => j.date === aujourdhui() && qui.includes(j.personneId))
    .sort((a, b) => b.majLe - a.majLe)

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <button className="rond" onClick={() => nav(-1)}>
          ←
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <h1>J'ai mangé 🍽️</h1>
          <p className="sous-titre">Note un repas, même hors de l'app ou au resto.</p>
        </div>
      </div>

      {data.personnes.length > 1 && (
        <div>
          <span className="label">Pour qui ?</span>
          <div className="tags">
            {data.personnes.map((p) => (
              <button key={p.id} className={'chip' + (qui.includes(p.id) ? ' actif' : '')} onClick={() => toggleQui(p.id)}>
                {p.emoji} {p.nom}
              </button>
            ))}
          </div>
        </div>
      )}

      {flash && (
        <div className="carte ligne espace" style={{ background: 'var(--menthe-clair)' }}>
          <span style={{ fontWeight: 700 }}>✓ Ajouté : {flash}</span>
          <button className="rond" style={{ width: 30, height: 30 }} onClick={() => setFlash(null)}>
            ✓
          </button>
        </div>
      )}

      <div className="tags">
        <button className={'chip' + (onglet === 'recette' ? ' actif' : '')} onClick={() => setOnglet('recette')}>
          📖 Une recette
        </button>
        <button className={'chip' + (onglet === 'libre' ? ' actif' : '')} onClick={() => setOnglet('libre')}>
          ✏️ Autre / resto
        </button>
      </div>

      {onglet === 'recette' && (
        <>
          <input className="champ" placeholder="🔍 Chercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="pile">
            {recettes.map((r) => (
              <button key={r.id} className="carte ligne espace" style={{ textAlign: 'left' }} onClick={() => logRecette(r.id)} disabled={qui.length === 0}>
                <span>
                  {r.emoji} {r.nom}
                </span>
                <span className="tag">🔥 {r.kcalPortion} kcal</span>
              </button>
            ))}
          </div>
        </>
      )}

      {onglet === 'libre' && (
        <div className="pile" style={{ gap: 12 }}>
          <Mascotte texte="Resto, grignotage, recette pas dans l'app… dis-moi quoi et combien de calories (à la louche, c'est ok)." emoji="😋" />
          <div>
            <span className="label">Qu'est-ce que c'était ?</span>
            <input className="champ" placeholder="ex. Burger au resto" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </div>
          <div>
            <span className="label">Calories (estimation)</span>
            <input className="champ" type="number" inputMode="numeric" placeholder="kcal" value={kcal} onChange={(e) => setKcal(e.target.value ? +e.target.value : '')} />
          </div>
          <button className="btn bloc" disabled={!libelle || !kcal || qui.length === 0} onClick={() => logLibre(libelle, +kcal)}>
            Ajouter au journal
          </button>

          <span className="label">Ou un raccourci :</span>
          <div className="tags">
            {PRESETS.map((p) => (
              <button key={p.libelle} className="chip" onClick={() => logLibre(p.libelle, p.kcal)} disabled={qui.length === 0}>
                {p.libelle} · {p.kcal}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Journal du jour */}
      <div className="carte pile" style={{ gap: 10 }}>
        <strong>📋 Aujourd'hui</strong>
        {journalJour.length === 0 && <span className="sous-titre">Rien de noté pour le moment.</span>}
        {journalJour.map((j) => {
          const r = data.recettes.find((x) => x.id === j.recetteId)
          const nom = j.libelle ?? r?.nom ?? '—'
          const k = j.kcalManuel != null ? j.kcalManuel : Math.round((r?.kcalPortion ?? 0) * j.portions)
          return (
            <div className="ligne espace" key={j.id}>
              <span>
                {r?.emoji ?? '🍴'} {nom}
              </span>
              <div className="ligne" style={{ gap: 10 }}>
                <span style={{ fontWeight: 700, color: 'var(--texte-doux)' }}>{k} kcal</span>
                <button className="rond" style={{ width: 28, height: 28, fontSize: 14 }} onClick={() => supprimerRepas(j.id)}>
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
