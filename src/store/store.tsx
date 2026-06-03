import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type {
  AppData,
  AvisRecette,
  CourseItem,
  Ingredient,
  Moment,
  Personne,
  Produit,
  Recette,
  RepasMange,
  RepasPlanifie,
  StockItem,
} from './types'
import { PRODUITS_SEED, RECETTES_SEED } from './seed'
import { aujourdhui } from './util'
import { scoreAntiInflam } from './sante'
import { getSyncConfig, setSyncConfig, pull, push, ping, type SyncConfig } from './sync'

export type EtatSync = 'off' | 'idle' | 'sync' | 'ok' | 'err'
const TS_KEY = 'popote.ts'

const KEY = 'popote.data.v1'
const VERSION = 1

function dataInitiale(): AppData {
  return {
    version: VERSION,
    onboardingFait: false,
    personnes: [],
    produits: PRODUITS_SEED,
    recettes: RECETTES_SEED,
    stock: [],
    avis: [],
    courses: [],
    planning: [],
    journal: [],
  }
}

function charger(): AppData {
  try {
    const brut = localStorage.getItem(KEY)
    if (!brut) return dataInitiale()
    const d = JSON.parse(brut) as AppData
    // fusion douce : on garde les recettes/produits de base à jour
    const base = dataInitiale()
    const produits = mergeById(base.produits, d.produits ?? [])
    const recettes = mergeById(base.recettes, d.recettes ?? [])
    return { ...base, ...d, produits, recettes, version: VERSION }
  } catch {
    return dataInitiale()
  }
}

function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const map = new Map<string, T>()
  base.forEach((x) => map.set(x.id, x))
  extra.forEach((x) => map.set(x.id, { ...map.get(x.id), ...x }))
  return [...map.values()]
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// --- Contexte ---------------------------------------------------------------

interface Ctx {
  data: AppData
  set: (maj: (d: AppData) => AppData) => void
  reset: () => void
  // helpers produits
  produit: (id: string) => Produit | undefined
  upsertProduit: (p: Produit) => void
  // personnes
  ajouterPersonne: (p: Omit<Personne, 'id'>) => string
  majPersonne: (id: string, maj: Partial<Personne>) => void
  supprimerPersonne: (id: string) => void
  // stock
  setStock: (produitId: string, quantite: number, opts?: Partial<StockItem>) => void
  ajusterStock: (produitId: string, delta: number) => void
  // goûts
  setGout: (personneId: string, cle: string, v: -1 | 0 | 1) => void
  // avis
  noter: (recetteId: string, personneId: string, note: -1 | 0 | 1, etoiles?: number) => void
  avisPour: (recetteId: string, personneId: string) => AvisRecette | undefined
  // recettes
  scoreRecette: (r: Recette, pour: string[]) => number
  faisabilite: (r: Recette) => { ok: boolean; manquants: Ingredient[] }
  addRecette: (r: Omit<Recette, 'id'> & { id?: string }) => string
  supprimerRecette: (id: string) => void
  // valide une recette cuisinée : déduit du stock les quantités explicitement choisies
  confirmerRecette: (
    recetteId: string,
    portions: number,
    pour: string[],
    deductions: { produitId: string; quantite: number }[],
  ) => void
  // courses
  ajouterAuxCourses: (items: Ingredient[]) => void
  toggleCourse: (produitId: string) => void
  majQuantiteCourse: (produitId: string, delta: number) => void
  viderCochees: () => void
  // planning
  planifier: (repas: Omit<RepasPlanifie, 'id'>) => void
  retirerPlanning: (id: string) => void
  // journal
  loggerRepas: (recetteId: string, personneId: string, portions: number, date?: string) => void
  loggerLibre: (e: { libelle: string; kcal: number; personneId: string; moment?: Moment; date?: string }) => void
  supprimerRepas: (id: string) => void
  kcalDuJour: (personneId: string, date?: string) => number
  // synchronisation iPhone↔iPad
  sync: { etat: EtatSync; derniere: number | null; message?: string }
  configurerSync: (c: SyncConfig) => Promise<{ ok: boolean; message: string }>
  desactiverSync: () => void
  synchroniserMaintenant: () => Promise<void>
}

const StoreContext = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(charger)

  // --- Synchronisation ---
  const syncRef = useRef<SyncConfig | null>(getSyncConfig())
  // 0 tant qu'aucune modif locale réelle n'a eu lieu : ainsi un appareil "vierge"
  // n'écrase jamais des données distantes plus anciennes (anti perte de données).
  const tsRef = useRef<number>(Number(localStorage.getItem(TS_KEY)) || 0)
  const dataRef = useRef<AppData>(data)
  const applyingRemote = useRef(false)
  const premierRendu = useRef(true)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sync, setSync] = useState<{ etat: EtatSync; derniere: number | null; message?: string }>({
    etat: getSyncConfig() ? 'idle' : 'off',
    derniere: null,
  })

  dataRef.current = data

  function planifierPush() {
    const c = syncRef.current
    if (!c) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(async () => {
      try {
        setSync((s) => ({ ...s, etat: 'sync' }))
        await push(c, dataRef.current, tsRef.current)
        setSync({ etat: 'ok', derniere: Date.now() })
      } catch (e: any) {
        setSync({ etat: 'err', derniere: null, message: e?.message })
      }
    }, 1500)
  }

  // Persistance locale + déclenchement du push sur modif réelle
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data))
    if (premierRendu.current) {
      premierRendu.current = false
      return
    }
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    tsRef.current = Date.now()
    localStorage.setItem(TS_KEY, String(tsRef.current))
    planifierPush()
  }, [data])

  // Récupération distante : au montage, au retour sur l'app, et toutes les 30 s
  useEffect(() => {
    const c = syncRef.current
    if (!c) return
    let vivant = true
    const tirer = async () => {
      try {
        setSync((s) => ({ ...s, etat: 'sync' }))
        const r = await pull(c)
        if (!vivant) return
        if (r && r.ts > tsRef.current) {
          // le distant est plus récent -> on adopte
          applyingRemote.current = true
          tsRef.current = r.ts
          localStorage.setItem(TS_KEY, String(r.ts))
          setData({ ...dataInitiale(), ...r.data, version: VERSION })
          setSync({ etat: 'ok', derniere: Date.now() })
        } else if (!r || r.ts < tsRef.current) {
          // rien en face, ou on est plus récent -> on pousse
          await push(c, dataRef.current, tsRef.current)
          setSync({ etat: 'ok', derniere: Date.now() })
        } else {
          setSync({ etat: 'ok', derniere: Date.now() })
        }
      } catch (e: any) {
        if (vivant) setSync({ etat: 'err', derniere: null, message: e?.message })
      }
    }
    tirer()
    const onVis = () => {
      if (!document.hidden) tirer()
    }
    document.addEventListener('visibilitychange', onVis)
    const iv = setInterval(tirer, 30000)
    return () => {
      vivant = false
      document.removeEventListener('visibilitychange', onVis)
      clearInterval(iv)
    }
    // re-souscrit quand la config change (etat off->idle/inverse)
  }, [sync.etat === 'off'])

  const configurerSync: Ctx['configurerSync'] = async (c) => {
    const test = await ping(c)
    if (!test.ok) {
      setSync({ etat: 'err', derniere: null, message: test.message })
      return test
    }
    setSyncConfig(c)
    syncRef.current = c
    // On RÉCUPÈRE d'abord : si des données existent déjà dans le cloud (ex. 2e
    // appareil), on les adopte au lieu de les écraser. On ne pousse que si le
    // cloud est vide ou plus ancien.
    try {
      const r = await pull(c)
      if (r && r.ts > tsRef.current) {
        applyingRemote.current = true
        tsRef.current = r.ts
        localStorage.setItem(TS_KEY, String(r.ts))
        setData({ ...dataInitiale(), ...r.data, version: VERSION })
      } else {
        if (tsRef.current === 0) {
          tsRef.current = Date.now()
          localStorage.setItem(TS_KEY, String(tsRef.current))
        }
        await push(c, dataRef.current, tsRef.current)
      }
      setSync({ etat: 'ok', derniere: Date.now() })
    } catch (e: any) {
      setSync({ etat: 'err', derniere: null, message: e?.message })
    }
    return { ok: true, message: test.message }
  }

  const desactiverSync: Ctx['desactiverSync'] = () => {
    setSyncConfig(null)
    syncRef.current = null
    setSync({ etat: 'off', derniere: null })
  }

  const synchroniserMaintenant: Ctx['synchroniserMaintenant'] = async () => {
    const c = syncRef.current
    if (!c) return
    try {
      setSync((s) => ({ ...s, etat: 'sync' }))
      const r = await pull(c)
      if (r && r.ts > tsRef.current) {
        applyingRemote.current = true
        tsRef.current = r.ts
        localStorage.setItem(TS_KEY, String(r.ts))
        setData({ ...dataInitiale(), ...r.data, version: VERSION })
      } else {
        await push(c, dataRef.current, tsRef.current)
      }
      setSync({ etat: 'ok', derniere: Date.now() })
    } catch (e: any) {
      setSync({ etat: 'err', derniere: null, message: e?.message })
    }
  }

  const set: Ctx['set'] = (maj) => setData((d) => maj(d))

  const produit = (id: string) => data.produits.find((p) => p.id === id)

  const upsertProduit: Ctx['upsertProduit'] = (p) =>
    set((d) => ({ ...d, produits: mergeById(d.produits, [p]) }))

  const ajouterPersonne: Ctx['ajouterPersonne'] = (p) => {
    const id = uid()
    set((d) => ({ ...d, personnes: [...d.personnes, { ...p, id }] }))
    return id
  }

  const majPersonne: Ctx['majPersonne'] = (id, maj) =>
    set((d) => ({
      ...d,
      personnes: d.personnes.map((p) => (p.id === id ? { ...p, ...maj } : p)),
    }))

  const supprimerPersonne: Ctx['supprimerPersonne'] = (id) =>
    set((d) => ({
      ...d,
      personnes: d.personnes.filter((p) => p.id !== id),
      avis: d.avis.filter((a) => a.personneId !== id),
      journal: d.journal.filter((j) => j.personneId !== id),
      planning: d.planning.map((p) => ({ ...p, pour: p.pour.filter((x) => x !== id) })),
    }))

  const setStock: Ctx['setStock'] = (produitId, quantite, opts) =>
    set((d) => {
      const existe = d.stock.find((s) => s.produitId === produitId)
      if (quantite <= 0) {
        return { ...d, stock: d.stock.filter((s) => s.produitId !== produitId) }
      }
      if (existe) {
        return {
          ...d,
          stock: d.stock.map((s) =>
            s.produitId === produitId ? { ...s, quantite, majLe: Date.now(), ...opts } : s,
          ),
        }
      }
      const prod = d.produits.find((p) => p.id === produitId)
      const nouv: StockItem = {
        produitId,
        quantite,
        unite: opts?.unite ?? 'g',
        lieu: opts?.lieu ?? (prod?.rayon === 'surgele' ? 'congelo' : prod?.perissable ? 'frigo' : 'placard'),
        majLe: Date.now(),
      }
      return { ...d, stock: [...d.stock, nouv] }
    })

  const ajusterStock: Ctx['ajusterStock'] = (produitId, delta) =>
    set((d) => {
      const s = d.stock.find((x) => x.produitId === produitId)
      const q = (s?.quantite ?? 0) + delta
      if (q <= 0) return { ...d, stock: d.stock.filter((x) => x.produitId !== produitId) }
      if (s)
        return {
          ...d,
          stock: d.stock.map((x) =>
            x.produitId === produitId ? { ...x, quantite: q, majLe: Date.now() } : x,
          ),
        }
      return d
    })

  const setGout: Ctx['setGout'] = (personneId, cle, v) =>
    set((d) => ({
      ...d,
      personnes: d.personnes.map((p) => {
        if (p.id !== personneId) return p
        const gouts = { ...p.gouts }
        if (gouts[cle] === v) delete gouts[cle]
        else gouts[cle] = v
        return { ...p, gouts }
      }),
    }))

  const avisPour: Ctx['avisPour'] = (recetteId, personneId) =>
    data.avis.find((a) => a.recetteId === recetteId && a.personneId === personneId)

  const noter: Ctx['noter'] = (recetteId, personneId, note, etoiles) =>
    set((d) => {
      const autres = d.avis.filter(
        (a) => !(a.recetteId === recetteId && a.personneId === personneId),
      )
      const av: AvisRecette = { recetteId, personneId, note, etoiles, dejaTeste: true, majLe: Date.now() }
      return { ...d, avis: [...autres, av] }
    })

  // Faisabilité : tous les ingrédients NON optionnels sont présents dans les placards.
  // (Présence, pas calcul de grammes : à la maison on sait juste si on a des pâtes ou pas.)
  const faisabilite: Ctx['faisabilite'] = (r) => {
    const manquants: Ingredient[] = []
    for (const ing of r.ingredients) {
      if (ing.optionnel) continue
      const s = data.stock.find((x) => x.produitId === ing.produitId)
      if (!s || s.quantite <= 0) manquants.push(ing)
    }
    return { ok: manquants.length === 0, manquants }
  }

  // Score de recommandation selon les goûts des personnes + historique de notes.
  const scoreRecette: Ctx['scoreRecette'] = (r, pour) => {
    let score = 1
    const gens = data.personnes.filter((p) => pour.includes(p.id))
    for (const g of gens) {
      // tags aimés/détestés
      for (const t of r.tags) {
        const v = g.gouts[`tag:${t}`]
        if (v === 1) score += 1.5
        if (v === -1) score -= 2
      }
      // ingrédients détestés -> gros malus
      for (const ing of r.ingredients) {
        const v = g.gouts[`prod:${ing.produitId}`]
        if (v === 1) score += 0.5
        if (v === -1 && !ing.optionnel) score -= 3
      }
      // historique de notes
      const av = data.avis.find((a) => a.recetteId === r.id && a.personneId === g.id)
      if (av) {
        score += av.note * 2
        if (av.etoiles) score += (av.etoiles - 3) * 0.5
      }
    }
    // les recettes jamais testées ont un petit bonus de curiosité
    const dejaTeste = data.avis.some((a) => a.recetteId === r.id)
    if (!dejaTeste) score += 0.6
    // si l'utilisatrice privilégie l'anti-inflammatoire, on pousse ces recettes
    if (data.prefAntiInflam) score += scoreAntiInflam(r) * 0.8
    return score
  }

  const addRecette: Ctx['addRecette'] = (r) => {
    const id = r.id ?? 'perso-' + uid()
    set((d) => ({ ...d, recettes: mergeById(d.recettes, [{ ...r, id, perso: true }]) }))
    return id
  }

  const supprimerRecette: Ctx['supprimerRecette'] = (id) =>
    set((d) => ({
      ...d,
      recettes: d.recettes.filter((r) => r.id !== id),
      planning: d.planning.filter((p) => p.recetteId !== id),
    }))

  const confirmerRecette: Ctx['confirmerRecette'] = (recetteId, portions, pour, deductions) =>
    set((d) => {
      const r = d.recettes.find((x) => x.id === recetteId)
      if (!r) return d
      // déduit du stock UNIQUEMENT ce qui a été confirmé (quantités ajustées par l'utilisateur)
      let stock = d.stock
      for (const ded of deductions) {
        if (ded.quantite <= 0) continue
        const s = stock.find((x) => x.produitId === ded.produitId)
        if (s) {
          const q = s.quantite - ded.quantite
          stock =
            q <= 0
              ? stock.filter((x) => x.produitId !== ded.produitId)
              : stock.map((x) => (x.produitId === ded.produitId ? { ...x, quantite: q, majLe: Date.now() } : x))
        }
      }
      // journalise pour les calories, réparti selon l'appétit de chacun
      // (un enfant compte pour une plus petite part qu'un adulte)
      const date = aujourdhui()
      const parts = pour.map((pid) => d.personnes.find((p) => p.id === pid)?.part ?? 1)
      const sommeParts = parts.reduce((a, b) => a + b, 0) || 1
      const logs: RepasMange[] = pour.map((pid, i) => ({
        id: uid(),
        date,
        recetteId,
        personneId: pid,
        portions: portions * (parts[i] / sommeParts),
        majLe: Date.now(),
      }))
      return { ...d, stock, journal: [...d.journal, ...logs] }
    })

  const ajouterAuxCourses: Ctx['ajouterAuxCourses'] = (items) =>
    set((d) => {
      let courses = [...d.courses]
      for (const ing of items) {
        const ex = courses.find((c) => c.produitId === ing.produitId)
        if (ex) {
          courses = courses.map((c) =>
            c.produitId === ing.produitId ? { ...c, quantite: c.quantite + ing.quantite } : c,
          )
        } else {
          courses.push({ produitId: ing.produitId, quantite: ing.quantite, unite: ing.unite, coche: false })
        }
      }
      return { ...d, courses }
    })

  const toggleCourse: Ctx['toggleCourse'] = (produitId) =>
    set((d) => ({
      ...d,
      courses: d.courses.map((c) => (c.produitId === produitId ? { ...c, coche: !c.coche } : c)),
    }))

  const majQuantiteCourse: Ctx['majQuantiteCourse'] = (produitId, delta) =>
    set((d) => ({
      ...d,
      courses: d.courses
        .map((c) =>
          c.produitId === produitId ? { ...c, quantite: Math.max(0, c.quantite + delta) } : c,
        )
        .filter((c) => c.quantite > 0),
    }))

  const viderCochees: Ctx['viderCochees'] = () =>
    set((d) => {
      // les courses cochées rentrent dans le stock, puis on nettoie la liste
      let stock = d.stock
      for (const c of d.courses.filter((x) => x.coche)) {
        const ex = stock.find((s) => s.produitId === c.produitId)
        stock = ex
          ? stock.map((s) =>
              s.produitId === c.produitId ? { ...s, quantite: s.quantite + c.quantite, majLe: Date.now() } : s,
            )
          : [
              ...stock,
              {
                produitId: c.produitId,
                quantite: c.quantite,
                unite: c.unite,
                lieu: 'placard' as const,
                majLe: Date.now(),
              },
            ]
      }
      return { ...d, stock, courses: d.courses.filter((c) => !c.coche) }
    })

  const planifier: Ctx['planifier'] = (repas) =>
    set((d) => ({ ...d, planning: [...d.planning, { ...repas, id: uid() }] }))

  const retirerPlanning: Ctx['retirerPlanning'] = (id) =>
    set((d) => ({ ...d, planning: d.planning.filter((p) => p.id !== id) }))

  const loggerRepas: Ctx['loggerRepas'] = (recetteId, personneId, portions, date) =>
    set((d) => ({
      ...d,
      journal: [
        ...d.journal,
        { id: uid(), date: date ?? aujourdhui(), recetteId, personneId, portions, majLe: Date.now() },
      ],
    }))

  const loggerLibre: Ctx['loggerLibre'] = (e) =>
    set((d) => ({
      ...d,
      journal: [
        ...d.journal,
        {
          id: uid(),
          date: e.date ?? aujourdhui(),
          libelle: e.libelle,
          kcalManuel: e.kcal,
          moment: e.moment,
          personneId: e.personneId,
          portions: 1,
          majLe: Date.now(),
        },
      ],
    }))

  const supprimerRepas: Ctx['supprimerRepas'] = (id) =>
    set((d) => ({ ...d, journal: d.journal.filter((j) => j.id !== id) }))

  const kcalDuJour: Ctx['kcalDuJour'] = (personneId, date) => {
    const jour = date ?? aujourdhui()
    return data.journal
      .filter((j) => j.personneId === personneId && j.date === jour)
      .reduce((tot, j) => {
        if (j.kcalManuel != null) return tot + j.kcalManuel
        const r = data.recettes.find((x) => x.id === j.recetteId)
        return tot + (r ? r.kcalPortion * j.portions : 0)
      }, 0)
  }

  const reset = () => {
    localStorage.removeItem(KEY)
    setData(dataInitiale())
  }

  const value: Ctx = {
    data,
    set,
    reset,
    produit,
    upsertProduit,
    ajouterPersonne,
    majPersonne,
    supprimerPersonne,
    setStock,
    ajusterStock,
    setGout,
    noter,
    avisPour,
    scoreRecette,
    faisabilite,
    addRecette,
    supprimerRecette,
    confirmerRecette,
    ajouterAuxCourses,
    toggleCourse,
    majQuantiteCourse,
    viderCochees,
    planifier,
    retirerPlanning,
    loggerRepas,
    loggerLibre,
    supprimerRepas,
    kcalDuJour,
    sync,
    configurerSync,
    desactiverSync,
    synchroniserMaintenant,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return ctx
}
