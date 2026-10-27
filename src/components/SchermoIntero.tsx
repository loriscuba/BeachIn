/**
 * Schermo intero per le code di lavoro (Cucina, Coda bar, Comande): copre testata, menu e barre e lascia solo
 * il contenuto e una X per uscire. Dove c'è l'API Fullscreen (PC, Android, iPad) si nasconde anche il browser;
 * su iPhone basta coprire l'app. Il velo va nel guscio dell'app (portale) così nessun antenato lo rinchiude,
 * e resta dentro `[data-tema]` per il tema scuro.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function useSchermoIntero() {
  const [attivo, setAttivo] = useState(false)
  const esci = () => {
    setAttivo(false)
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }
  const entra = () => {
    setAttivo(true)
    document.documentElement.requestFullscreen?.().catch(() => {})
  }
  useEffect(() => {
    if (!attivo) return
    // uscita dal fullscreen del browser (Esc, gesto di sistema) = uscita anche dall'app
    const cambio = () => { if (!document.fullscreenElement) setAttivo(false) }
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') setAttivo(false) }
    document.addEventListener('fullscreenchange', cambio)
    window.addEventListener('keydown', tasto)
    return () => {
      document.removeEventListener('fullscreenchange', cambio)
      window.removeEventListener('keydown', tasto)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [attivo])
  return { attivo, entra, esci }
}

export function PulsanteSchermoIntero({ onClick }: { onClick: () => void }) {
  return <Button dimensione="sm" onClick={onClick}><Maximize2 className="h-4 w-4" /> Schermo intero</Button>
}

export function SchermoIntero({ onEsci, children }: { onEsci: () => void; children: ReactNode }) {
  const guscio = document.querySelector('[data-tema]') ?? document.body
  return createPortal(
    <div className="schermo-intero fixed inset-0 z-[90] overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))] sm:px-4">
      <button type="button" onClick={onEsci} aria-label="Esci dallo schermo intero" title="Esci dallo schermo intero"
        className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[91] grid h-11 w-11 place-items-center rounded-full bg-profondo text-white shadow-lg">
        <X className="h-5 w-5" />
      </button>
      {children}
    </div>,
    guscio,
  )
}
