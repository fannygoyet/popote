import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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
}

const StoreContext = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(charger)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data))
  }, [data])

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
      // journalise pour les calories (réparti entre les convives)
      const date = aujourdhui()
      const logs: RepasMange[] = pour.map((pid) => ({
        id: uid(),
        date,
        recetteId,
        personneId: pid,
        portions: portions / Math.max(pour.length, 1),
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
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return ctx
}
