import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { getSyncConfig } from '../store/sync'
import { Mascotte } from '../components/Mascotte'

const SQL = `create table popote_sync (
  code text primary key,
  data jsonb,
  client_ts bigint
);
alter table popote_sync enable row level security;
create policy "popote" on popote_sync
  for all using (true) with check (true);`

// code de synchro long et aléatoire (difficile à deviner) — meilleur qu'un mot choisi
function genererCode(): string {
  const a = new Uint8Array(12)
  crypto.getRandomValues(a)
  return 'popote-' + Array.from(a, (b) => b.toString(36)).join('').slice(0, 16)
}

function etatLabel(etat: string) {
  switch (etat) {
    case 'off':
      return { txt: 'Désactivée', bg: 'var(--lilas-clair)', fg: 'var(--texte-doux)' }
    case 'sync':
      return { txt: 'Synchronisation…', bg: 'var(--beurre-clair)', fg: '#8a6a17' }
    case 'ok':
      return { txt: 'À jour ✓', bg: 'var(--menthe-clair)', fg: '#2c6b53' }
    case 'err':
      return { txt: 'Erreur', bg: 'var(--rose-clair)', fg: '#a33a63' }
    default:
      return { txt: 'Prête', bg: 'var(--lilas-clair)', fg: 'var(--lilas)' }
  }
}

export function Sync() {
  const { sync, configurerSync, desactiverSync, synchroniserMaintenant } = useStore()
  const nav = useNavigate()
  const conf = getSyncConfig()
  const actif = sync.etat !== 'off'

  const [url, setUrl] = useState(conf?.url ?? '')
  const [key, setKey] = useState(conf?.key ?? '')
  const [code, setCode] = useState(() => conf?.code ?? genererCode())
  const [aide, setAide] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const lbl = etatLabel(sync.etat)

  async function activer() {
    setEnCours(true)
    setMsg(null)
    const r = await configurerSync({ url: url.trim(), key: key.trim(), code: code.trim() })
    setMsg(r.ok ? 'Sync activée ! Mets les mêmes infos sur ton autre appareil.' : 'Échec : ' + r.message)
    setEnCours(false)
  }

  return (
    <div className="ecran pile" style={{ gap: 16 }}>
      <div className="entete">
        <button className="rond" onClick={() => nav('/profil')}>
          ←
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <h1>Sync 🔄</h1>
          <p className="sous-titre">Mêmes données sur iPhone et iPad.</p>
        </div>
      </div>

      <div className="carte ligne espace">
        <strong>État</strong>
        <span className="tag" style={{ background: lbl.bg, color: lbl.fg }}>
          {lbl.txt}
        </span>
      </div>
      {sync.message && sync.etat === 'err' && (
        <p className="sous-titre" style={{ margin: '0 4px', color: '#a33a63' }}>
          {sync.message}
        </p>
      )}

      <Mascotte
        texte={
          actif
            ? 'Tout est relié. Tape les mêmes infos sur ton autre appareil et hop, mêmes recettes partout.'
            : "L'app marche très bien sans ça. Active la sync seulement si tu veux retrouver tes données sur ton iPad."
        }
        emoji="🔄"
      />

      {actif && (
        <div className="pile" style={{ gap: 10 }}>
          <div className="carte pile" style={{ gap: 6 }}>
            <span className="label" style={{ margin: 0 }}>
              Ton code de synchro (à recopier sur l'autre appareil)
            </span>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.05em' }}>{conf?.code}</div>
          </div>
          <button className="btn bloc" onClick={() => synchroniserMaintenant()}>
            🔄 Synchroniser maintenant
          </button>
          <button className="btn clair bloc" style={{ color: '#a33a63' }} onClick={desactiverSync}>
            Désactiver la sync sur cet appareil
          </button>
          <p className="sous-titre" style={{ textAlign: 'center', margin: 0 }}>
            Désactiver n'efface rien : tes données restent sur l'appareil.
          </p>
        </div>
      )}

      {!actif && (
        <div className="pile" style={{ gap: 12 }}>
          <button className="carte ligne espace" onClick={() => setAide((a) => !a)}>
            <strong>📖 Comment créer le projet Supabase ? (gratuit)</strong>
            <span>{aide ? '▲' : '▼'}</span>
          </button>
          {aide && (
            <div className="carte pile" style={{ gap: 8 }}>
              <p className="sous-titre" style={{ margin: 0 }}>
                1. Va sur <strong>supabase.com</strong>, crée un compte, puis un nouveau projet (gratuit).
                <br />
                2. Dans <strong>Project Settings → API</strong>, copie l'<strong>URL</strong> et la clé
                <strong> anon public</strong>.
                <br />
                3. Dans <strong>SQL Editor</strong>, colle et exécute ce code (crée la table de synchro) :
              </p>
              <pre
                style={{
                  background: 'var(--lilas-fond)',
                  padding: 12,
                  borderRadius: 14,
                  overflowX: 'auto',
                  fontSize: 12,
                  margin: 0,
                  whiteSpace: 'pre',
                }}
              >
                {SQL}
              </pre>
              <button
                className="btn fantome petit"
                onClick={() => {
                  navigator.clipboard?.writeText(SQL)
                  setMsg('SQL copié !')
                }}
              >
                Copier le SQL
              </button>
              <p className="sous-titre" style={{ margin: 0 }}>
                4. Reviens ici, colle l'URL + la clé, choisis un code secret (le même sur tes 2 appareils).
              </p>
            </div>
          )}

          <div className="pile" style={{ gap: 10 }}>
            <div>
              <span className="label">URL du projet Supabase</span>
              <input className="champ" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div>
              <span className="label">Clé anon public</span>
              <input className="champ" placeholder="eyJhbGci…" value={key} onChange={(e) => setKey(e.target.value)} />
            </div>
            <div>
              <span className="label">Code de synchro (secret, identique sur tes 2 appareils)</span>
              <input className="champ" placeholder="popote-xxxxxxxx" value={code} onChange={(e) => setCode(e.target.value)} />
              <button className="btn fantome petit" style={{ marginTop: 8 }} onClick={() => setCode(genererCode())}>
                🎲 Générer un code sûr
              </button>
              <p className="sous-titre" style={{ margin: '6px 0 0' }}>
                Un code long et aléatoire est plus sûr. Note-le pour le saisir à l'identique sur l'autre appareil.
              </p>
            </div>
            <button className="btn bloc" disabled={!url.trim() || !key.trim() || !code.trim() || enCours} onClick={activer}>
              {enCours ? 'Connexion…' : 'Activer la sync'}
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className="carte" style={{ background: 'var(--menthe-clair)' }}>
          <span style={{ fontWeight: 700 }}>{msg}</span>
        </div>
      )}

      <p className="sous-titre" style={{ textAlign: 'center', margin: 0 }}>
        Tes données ne transitent que par <em>ton</em> projet Supabase. Garde ton code de synchro privé.
      </p>
    </div>
  )
}
