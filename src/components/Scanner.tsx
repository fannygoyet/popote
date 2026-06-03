import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

// On cible les formats des codes-barres alimentaires courants : plus rapide et
// plus fiable que de tout essayer.
const hints = new Map()
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
])
hints.set(DecodeHintType.TRY_HARDER, true)

// Scanner CONTINU : il reste ouvert, tu peux enchaîner plusieurs produits.
// onCode renvoie le nom du produit ajouté (ou null si inconnu) pour l'afficher.
export function Scanner({
  onCode,
  onClose,
}: {
  onCode: (code: string) => Promise<string | null>
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [ajoutes, setAjoutes] = useState<string[]>([])
  const [manuel, setManuel] = useState('')
  const recent = useRef<Map<string, number>>(new Map())
  const enCours = useRef(false)

  async function traiter(code: string) {
    const now = Date.now()
    const dernier = recent.current.get(code) ?? 0
    if (now - dernier < 4000) return // anti double-scan du même article
    recent.current.set(code, now)
    if (enCours.current) return
    enCours.current = true
    try {
      const nom = await onCode(code)
      setAjoutes((a) => [nom ? `✓ ${nom}` : `❓ Code inconnu (${code})`, ...a].slice(0, 6))
    } finally {
      enCours.current = false
    }
  }

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(hints)
    let controls: { stop: () => void } | null = null
    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current!,
        (result, _err, ctrl) => {
          controls = ctrl
          if (result) traiter(result.getText())
        },
      )
      .catch(() => setErreur("Impossible d'ouvrir la caméra. Tu peux saisir le code à la main ci-dessous."))
    return () => controls?.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="scanner-zone">
      <video ref={videoRef} playsInline muted autoPlay />
      <div className="scanner-cible" />

      {/* Barre du haut */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'white', fontWeight: 800, fontSize: 16, textShadow: '0 1px 4px #000' }}>
          📷 Vise un code-barres
        </span>
        <button className="btn clair petit" onClick={onClose}>
          Terminé{ajoutes.length ? ` (${ajoutes.length})` : ''}
        </button>
      </div>

      {/* Liste de ce qui vient d'être ajouté + saisie manuelle */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
          left: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {erreur && (
          <div style={{ background: 'white', padding: 12, borderRadius: 16, textAlign: 'center', fontSize: 14 }}>
            {erreur}
          </div>
        )}
        {ajoutes.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.95)', padding: '10px 14px', borderRadius: 16, fontSize: 14 }}>
            {ajoutes.map((a, i) => (
              <div key={i} style={{ fontWeight: i === 0 ? 800 : 600, opacity: i === 0 ? 1 : 0.6 }}>
                {a}
              </div>
            ))}
          </div>
        )}
        <div className="ligne" style={{ gap: 8 }}>
          <input
            className="champ"
            style={{ flex: 1, background: 'white' }}
            inputMode="numeric"
            placeholder="…ou tape le code à la main"
            value={manuel}
            onChange={(e) => setManuel(e.target.value)}
          />
          <button
            className="btn"
            disabled={manuel.trim().length < 6}
            onClick={() => {
              traiter(manuel.trim())
              setManuel('')
            }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}
