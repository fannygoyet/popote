import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

// Scanner code-barres plein écran. Appelle onCode(code) à la première lecture.
export function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let controls: { stop: () => void } | null = null
    let stoppe = false

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, _err, ctrl) => {
        controls = ctrl
        if (stoppe) return
        if (result) {
          stoppe = true
          ctrl.stop()
          onCode(result.getText())
        }
      })
      .catch(() => setErreur("Impossible d'ouvrir la caméra. Autorise l'accès, ou ajoute à la main."))

    return () => {
      stoppe = true
      controls?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="scanner-zone">
      <video ref={videoRef} playsInline muted />
      <div className="scanner-cible" />
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
        <span style={{ color: 'white', fontWeight: 800, fontSize: 18, textShadow: '0 1px 4px #000' }}>
          📷 Scanne un code-barres
        </span>
        <button className="btn clair petit" onClick={onClose}>
          Fermer
        </button>
      </div>
      {erreur && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 30px)',
            left: 16,
            right: 16,
            background: 'white',
            padding: 16,
            borderRadius: 18,
            textAlign: 'center',
          }}
        >
          {erreur}
        </div>
      )}
    </div>
  )
}
