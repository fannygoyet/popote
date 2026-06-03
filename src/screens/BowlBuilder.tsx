import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Mascotte } from '../components/Mascotte'
import type { Moment } from '../store/types'

// Rôles d'un bowl : chaque concept peut servir à plusieurs rôles.
type Role = 'base' | 'proteine' | 'legume' | 'topping' | 'sauce'

const ROLES: Record<Role, Set<string>> = {
  base: new Set([
    'riz', 'pates', 'semoule', 'quinoa', 'nouilles', 'gnocchi', 'pomme-de-terre', 'boulgour', 'salade', 'mache', 'pain',
  ]),
  proteine: new Set([
    'poulet', 'boeuf-hache', 'dinde', 'jambon', 'lardons', 'saucisse', 'thon', 'saumon', 'crevettes',
    'poisson-pane', 'nuggets', 'oeuf', 'pois-chiches', 'lentilles', 'haricots-rouges', 'haricots-blancs',
    'chevre', 'mozzarella', 'feta',
  ]),
  legume: new Set([
    'tomate', 'tomate-cerise', 'carotte', 'courgette', 'poivron', 'champignon', 'brocoli', 'chou', 'mais',
    'haricots-verts', 'petit-pois', 'epinards', 'aubergine', 'concombre', 'betterave', 'avocat', 'poireau',
  ]),
  topping: new Set(['avocat', 'oeuf', 'mais', 'parmesan', 'fromage-rape', 'feta', 'graines', 'olives', 'chevre']),
  sauce: new Set(['pesto', 'sauce-soja', 'huile', 'citron', 'yaourt', 'creme', 'sauce-tomate', 'cancoillotte', 'lait-coco']),
}

// grammes indicatifs par rôle -> estimation des calories du bowl
const GRAMMES: Record<Role, number> = { base: 150, proteine: 120, legume: 80, topping: 25, sauce: 15 }

const SLOTS: { role: Role; key: string; label: string; ic: string }[] = [
  { role: 'base', key: 'base', label: 'Base', ic: '🍚' },
  { role: 'proteine', key: 'proteine', label: 'Protéine', ic: '🍗' },
  { role: 'legume', key: 'legume0', label: 'Légume', ic: '🥦' },
  { role: 'legume', key: 'legume1', label: 'Légume', ic: '🥕' },
  { role: 'topping', key: 'topping', label: 'Petit plus', ic: '🥑' },
  { role: 'sauce', key: 'sauce', label: 'Sauce', ic: '🥄' },
]

function momentParHeure(): Moment {
  const h = new Date().getHours()
  if (h < 10) return 'petit-dej'
  if (h < 15) return 'dejeuner'
  if (h < 18) return 'gouter'
  return 'diner'
}

interface Item {
  id: string
  nom: string
  kcal: number
}

export function BowlBuilder() {
  const { data, produit, loggerLibre } = useStore()
  const nav = useNavigate()
  const [tour, setTour] = useState(0)
  const [swap, setSwap] = useState<Record<string, number>>({})
  const [choix, setChoix] = useState<Record<string, string>>({}) // slotKey -> ingrédient choisi à la main
  const [selSlot, setSelSlot] = useState<(typeof SLOTS)[number] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // concepts présents dans les placards (résolus via canonId), dédupliqués
  const concepts = useMemo(() => {
    const m = new Map<string, Item>()
    for (const s of data.stock) {
      if (s.quantite <= 0) continue
      const p = produit(s.produitId)
      if (!p) continue
      const cid = p.canonId ?? p.id
      const cp = produit(cid) ?? p
      if (!m.has(cid)) m.set(cid, { id: cid, nom: cp.nom, kcal: cp.kcal100 ?? 0 })
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.stock, data.produits])

  const candidats = useMemo(() => {
    const out = {} as Record<Role, Item[]>
    for (const role of Object.keys(ROLES) as Role[]) {
      out[role] = [...concepts.values()].filter((c) => ROLES[role].has(c.id))
    }
    return out
  }, [concepts])

  // compose un bowl : un item par slot, sans répéter un même aliment
  // 1) les choix manuels sont posés et réservés, 2) le reste est tiré (aléatoire/rotation)
  const bowl = useMemo(() => {
    const used = new Set<string>()
    const res: Record<string, Item | null> = {}
    for (const slot of SLOTS) {
      const cid = choix[slot.key]
      if (!cid) continue
      const it = candidats[slot.role].find((c) => c.id === cid)
      if (it && !used.has(it.id)) {
        res[slot.key] = it
        used.add(it.id)
      }
    }
    for (const slot of SLOTS) {
      if (res[slot.key] !== undefined) continue
      const cand = candidats[slot.role]
      if (!cand.length) {
        res[slot.key] = null
        continue
      }
      const offset = tour + (swap[slot.key] ?? 0)
      let chosen: Item | null = null
      for (let k = 0; k < cand.length; k++) {
        const c = cand[(((offset + k) % cand.length) + cand.length) % cand.length]
        if (!used.has(c.id)) {
          chosen = c
          break
        }
      }
      if (chosen) used.add(chosen.id)
      res[slot.key] = chosen
    }
    return SLOTS.map((slot) => ({ slot, item: res[slot.key] ?? null }))
  }, [candidats, tour, swap, choix])

  const choisis = bowl.filter((b) => b.item)
  const kcal = Math.round(
    choisis.reduce((t, b) => t + ((b.item!.kcal * GRAMMES[b.slot.role]) / 100), 0),
  )
  const aBase = bowl.find((b) => b.slot.role === 'base')?.item
  const aProteine = bowl.some((b) => b.slot.role === 'proteine' && b.item)
  const assezPourBowl = !!aBase && choisis.length >= 3

  const foyer = data.personnes.filter((p) => p.foyer !== false)

  function cycler(key: string) {
    // « au hasard » sur ce slot : on oublie le choix manuel et on tourne
    setChoix((c) => {
      const n = { ...c }
      delete n[key]
      return n
    })
    setSwap((s) => ({ ...s, [key]: (s[key] ?? 0) + 1 }))
  }
  function choisir(key: string, id: string) {
    setChoix((c) => ({ ...c, [key]: id }))
    setSelSlot(null)
  }
  function remelanger() {
    setChoix({})
    setSwap({})
    setTour((t) => t + 1)
  }
  function jeMange() {
    const libelle = 'Bowl maison : ' + choisis.map((b) => b.item!.nom).join(', ')
    const gens = foyer.length ? foyer : data.personnes
    gens.forEach((g) => loggerLibre({ libelle, kcal, personneId: g.id, moment: momentParHeure() }))
    setMsg('Ajouté à ton journal 🍽️')
  }

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <button className="rond" onClick={() => nav('/')}>
          ←
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <h1>Bowl à construire 🥗</h1>
          <p className="sous-titre">Je compose avec ce que tu as dans les placards.</p>
        </div>
      </div>

      {concepts.size === 0 ? (
        <div className="vide">
          <div className="gros">🛒</div>
          Tes placards sont vides. Ajoute des produits pour que je te compose un bowl.
        </div>
      ) : !assezPourBowl ? (
        <>
          <Mascotte texte="Il me manque des bases ou des garnitures pour un vrai bowl. Ajoute de quoi (riz, pâtes, salade, une protéine, des légumes…) 🙂" />
          <BowlListe bowl={bowl} onPick={setSelSlot} onCycle={cycler} produit={produit} />
        </>
      ) : (
        <>
          <Mascotte
            texte={
              aProteine
                ? 'Voilà un bowl équilibré rien que pour toi ! Touche un ingrédient pour le changer. 👇'
                : 'Joli bowl ! Pense à une protéine (œuf, thon, poulet, pois chiches…) si tu en as. 👇'
            }
          />

          <BowlListe bowl={bowl} onPick={setSelSlot} onCycle={cycler} produit={produit} />

          <div className="carte ligne espace" style={{ background: 'var(--beurre-clair)' }}>
            <span style={{ fontWeight: 700 }}>≈ {kcal} kcal</span>
            <span className="sous-titre">par personne (estimation)</span>
          </div>

          {msg && (
            <div className="carte ligne espace" style={{ background: 'var(--menthe-clair)' }}>
              <span style={{ fontWeight: 700 }}>{msg}</span>
              <button className="rond" style={{ width: 30, height: 30 }} onClick={() => setMsg(null)}>
                ✓
              </button>
            </div>
          )}

          <button className="btn fantome bloc" onClick={remelanger}>
            🎲 Un autre bowl
          </button>
          <button className="btn bloc" onClick={jeMange}>
            🍽️ Je mange ce bowl
          </button>
        </>
      )}

      {/* Sélection des possibles pour un emplacement (depuis les placards) */}
      {selSlot && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(74,68,88,.35)', zIndex: 48, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelSlot(null)}
        >
          <div
            className="pile"
            style={{ background: 'var(--lilas-fond)', width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '30px 30px 0 0', padding: 16, maxHeight: '85vh', overflowY: 'auto', gap: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ligne espace">
              <h3>
                {selSlot.ic} {selSlot.label} — au choix
              </h3>
              <button className="btn clair petit" onClick={() => setSelSlot(null)}>
                Fermer
              </button>
            </div>
            <button className="btn fantome bloc petit" onClick={() => { cycler(selSlot.key); setSelSlot(null) }}>
              🎲 Au hasard
            </button>
            {candidats[selSlot.role].length === 0 && (
              <p className="sous-titre" style={{ margin: 0 }}>
                Rien de dispo pour ça dans tes placards. Ajoute des produits 🙂
              </p>
            )}
            {candidats[selSlot.role].map((c) => {
              const actif = choix[selSlot.key] === c.id
              return (
                <button
                  key={c.id}
                  className="carte ligne espace"
                  style={{ padding: '12px 16px', textAlign: 'left', background: actif ? 'var(--menthe-clair)' : undefined }}
                  onClick={() => choisir(selSlot.key, c.id)}
                >
                  <strong>{produit(c.id)?.nom ?? c.nom}</strong>
                  {actif && <span className="tag" style={{ background: 'var(--menthe)', color: '#2c6b53' }}>✓ choisi</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function BowlListe({
  bowl,
  onPick,
  onCycle,
  produit,
}: {
  bowl: { slot: (typeof SLOTS)[number]; item: Item | null }[]
  onPick: (slot: (typeof SLOTS)[number]) => void
  onCycle: (key: string) => void
  produit: (id: string) => { nom: string } | undefined
}) {
  return (
    <div className="pile" style={{ gap: 8 }}>
      {bowl.map(({ slot, item }) => (
        <div
          key={slot.key}
          className="carte ligne espace"
          style={{ padding: '10px 12px 10px 16px', gap: 8, opacity: item ? 1 : 0.55 }}
        >
          <button
            style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
            disabled={!item}
            onClick={() => onPick(slot)}
            title="Choisir parmi mes placards"
          >
            <span style={{ fontSize: 22 }}>{slot.ic}</span>
            <span style={{ minWidth: 0 }}>
              <span className="sous-titre" style={{ fontSize: 12, display: 'block' }}>{slot.label}</span>
              <strong>{item ? (produit(item.id)?.nom ?? item.nom) : '— rien de dispo'}</strong>
            </span>
          </button>
          {item && (
            <button
              className="rond"
              style={{ width: 34, height: 34, background: 'var(--lilas-clair)', color: 'var(--lilas)', flexShrink: 0 }}
              title="Au hasard"
              onClick={() => onCycle(slot.key)}
            >
              🎲
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
