import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { CameraOff } from 'lucide-react'

/**
 * Lettore QR dalla fotocamera posteriore (getUserMedia + jsQR, niente rete).
 * Chiama `onLettura` una volta per codice; lo stesso codice viene ignorato per 3 secondi.
 */
export function ScannerQr({ onLettura, attivo = true }: { onLettura: (testo: string) => void; attivo?: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const cb = useRef(onLettura)
  cb.current = onLettura
  const [errore, setErrore] = useState('')

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

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s
        if (video.current) { video.current.srcObject = s; void video.current.play() }
        raf = requestAnimationFrame(leggi)
      })
      .catch(() => setErrore('Fotocamera non disponibile: consenti l’accesso alla fotocamera o inserisci il codice a mano.'))
    if (!navigator.mediaDevices) setErrore('Questo browser non dà accesso alla fotocamera: inserisci il codice a mano.')

    return () => { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()) }
  }, [attivo])

  if (errore) return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-profondo/70 shadow-sm"><CameraOff className="h-5 w-5 shrink-0 text-boa" /> {errore}</div>
  )
  return (
    <div className="relative overflow-hidden rounded-2xl bg-profondo">
      <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
      {/* mirino */}
      <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/85 shadow-[0_0_0_999px_rgba(15,59,76,0.35)]" />
    </div>
  )
}
