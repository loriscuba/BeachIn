/**
 * Schermo intero per le code di lavoro (Cucina, Coda bar, Comande): copre testata, menu e barre e lascia solo
 * il contenuto e una barra sottile con «Esci». Dove c'è l'API Fullscreen (PC, Android, iPad) si nasconde anche il browser;
 * su iPhone basta coprire l'app. Il velo va nel guscio dell'app (portale) così nessun antenato lo rinchiude,
 * e resta dentro `[data-tema]` per il tema scuro.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, Minimize2 } from 'lucide-react'
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

export function SchermoIntero({ titolo, onEsci, children }: { titolo: ReactNode; onEsci: () => void; children: ReactNode }) {
  const guscio = document.querySelector('[data-tema]') ?? document.body
  // niente margini grandi: in orizzontale (tablet, TV) le comande usano tutto lo schermo
  return createPortal(
    <div className="schermo-intero fixed inset-0 z-[90] overflow-y-auto pb-[env(safe-area-inset-bottom)] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] sm:pl-[max(0.75rem,env(safe-area-inset-left))] sm:pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div className="flex items-center gap-2 py-1.5">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-profondo">{titolo}</p>
        <button type="button" onClick={onEsci} title="Esci dallo schermo intero"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-profondo px-3 py-1.5 text-xs font-semibold text-white shadow">
          <Minimize2 className="h-3.5 w-3.5" /> Esci
        </button>
      </div>
      {children}
    </div>,
    guscio,
  )
}
