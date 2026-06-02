// Synchronisation iPhone↔iPad via Supabase (optionnelle, opt-in).
// Tout le blob AppData est stocké dans une ligne, repérée par un "code de synchro"
// secret partagé entre les appareils. Dernière écriture gagne (suffisant pour
// un seul utilisateur sur deux appareils utilisés l'un après l'autre).

const KEY = 'popote.sync'
const TABLE = 'popote_sync'

export interface SyncConfig {
  url: string
  key: string
  code: string
}

export function getSyncConfig(): SyncConfig | null {
  try {
    const brut = localStorage.getItem(KEY)
    if (!brut) return null
    const c = JSON.parse(brut)
    if (c?.url && c?.key && c?.code) return c
    return null
  } catch {
    return null
  }
}

export function setSyncConfig(c: SyncConfig | null) {
  if (c) localStorage.setItem(KEY, JSON.stringify(c))
  else localStorage.removeItem(KEY)
}

// client Supabase mémorisé (import dynamique pour ne pas alourdir le bundle initial)
let client: any = null
let clientCle = ''
async function getClient(c: SyncConfig) {
  const cle = c.url + '|' + c.key
  if (client && clientCle === cle) return client
  const { createClient } = await import('@supabase/supabase-js')
  client = createClient(c.url, c.key, { auth: { persistSession: false } })
  clientCle = cle
  return client
}

export interface RemoteData {
  data: any
  ts: number
}

// Récupère les données distantes pour ce code, ou null si aucune.
export async function pull(c: SyncConfig): Promise<RemoteData | null> {
  const sb = await getClient(c)
  const { data, error } = await sb.from(TABLE).select('data, client_ts').eq('code', c.code).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { data: data.data, ts: Number(data.client_ts) || 0 }
}

// Envoie les données (upsert sur le code).
export async function push(c: SyncConfig, payload: any, ts: number): Promise<void> {
  const sb = await getClient(c)
  const { error } = await sb.from(TABLE).upsert({ code: c.code, data: payload, client_ts: ts }, { onConflict: 'code' })
  if (error) throw error
}

// Teste la connexion + l'existence de la table.
export async function ping(c: SyncConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const sb = await getClient(c)
    const { error } = await sb.from(TABLE).select('code').limit(1)
    if (error) return { ok: false, message: error.message }
    return { ok: true, message: 'Connexion OK' }
  } catch (e: any) {
    return { ok: false, message: e?.message ?? 'Échec de connexion' }
  }
}
