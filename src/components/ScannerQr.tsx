import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { CameraOff, RotateCw } from 'lucide-react'

/**
 * Lettore QR dalla fotocamera posteriore (getUserMedia + jsQR, niente rete).
 * Chiama `onLettura` una volta per codice; lo stesso codice viene ignorato per 3 secondi.
 */
export function ScannerQr({ onLettura, attivo = true }: { onLettura: (testo: string) => void; attivo?: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const cb = useRef(onLettura)
  cb.current = onLettura
  const [errore, setErrore] = useState('')
  const [tentativo, setTentativo] = useState(0)

  useEffect(() => {
    if (!attivo) return
    let stream: MediaStream | undefined
    let raf = 0
    let ultimo = { testo: '', t: 0 }
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const leggi = () => {
      const v = video.current
      if (v && ctx && v.readyState >= 2 && v.videoWidth) {
        // riduco il fotogramma: jsQR è più veloce e i QR dell'invito sono grandi
        const scala = Math.min(1, 640 / v.videoWidth)
        canvas.width = Math.round(v.videoWidth * scala)
        canvas.height = Math.round(v.videoHeight * scala)
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        const ora = Date.now()
        if (qr?.data && (qr.data !== ultimo.testo || ora - ultimo.t > 3000)) {
          ultimo = { testo: qr.data, t: ora }
          navigator.vibrate?.(80)
          cb.current(qr.data)
        }
      }
      raf = requestAnimationFrame(leggi)
    }

    let chiuso = false
    const avvia = async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'NonSupportato' })
      try {
        return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      } catch (e) {
        // alcuni tablet/browser rifiutano i vincoli: riprovo con una fotocamera qualsiasi (non se il permesso è negato)
        if ((e as Error).name === 'NotAllowedError' || (e as Error).name === 'SecurityError') throw e
        return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
    }
    setErrore('')
    avvia()
      .then((s) => {
        if (chiuso) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        if (video.current) { video.current.srcObject = s; void video.current.play().catch(() => {}) }
        raf = requestAnimationFrame(leggi)
      })
      .catch((e: Error) => setErrore(messaggioErrore(e.name)))

    return () => { chiuso = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()) }
  }, [attivo, tentativo])

  if (errore) return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <p className="flex items-start gap-3 text-sm text-profondo/75"><CameraOff className="mt-0.5 h-5 w-5 shrink-0 text-boa" /> {errore}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTentativo((n) => n + 1)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-calce-300 px-4 font-semibold text-profondo/75"><RotateCw className="h-4 w-4" /> Riprova</button>
      </div>
    </div>
  )
  return (
    <div className="relative overflow-hidden rounded-2xl bg-profondo">
      <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
      {/* mirino */}
      <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/85 shadow-[0_0_0_999px_rgba(15,59,76,0.35)]" />
    </div>
  )
}

function messaggioErrore(nome: string): string {
  switch (nome) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Permesso fotocamera negato. Consentilo dalle impostazioni del sito (lucchetto o ⋮ → Impostazioni sito → Fotocamera → Consenti) e tocca Riprova, oppure scrivi il codice.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Nessuna fotocamera trovata su questo dispositivo: scrivi il codice a mano.'
    case 'NotReadableError':
    case 'AbortError':
      return 'La fotocamera è occupata da un’altra app: chiudila e tocca Riprova, oppure scrivi il codice.'
    case 'NonSupportato':
      return 'Questa finestra non dà accesso diretto alla fotocamera: scrivi il codice a mano.'
    default:
      return `Fotocamera non disponibile (${nome || 'errore sconosciuto'}): scrivi il codice a mano.`
  }
}
