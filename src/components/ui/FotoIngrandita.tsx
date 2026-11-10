import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Props {
  foto: string[]
  /** Indice della foto aperta, null = chiusa. */
  indice: number | null
  onCambia: (i: number | null) => void
}

/** Foto a schermo intero con chiudi, frecce, tastiera e scorrimento col dito. Sopra a Modal/Drawer. */
export function FotoIngrandita({ foto, indice, onCambia }: Props) {
  const tocco = useRef<number | null>(null)
  const n = foto.length
  const aperta = indice !== null && n > 0
  const vai = (d: number) => indice !== null && onCambia((indice + d + n) % n)

  useEffect(() => {
    if (!aperta) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCambia(null)
      else if (e.key === 'ArrowRight') vai(1)
      else if (e.key === 'ArrowLeft') vai(-1)
      else return
      // non far chiudere anche la finestra sotto
      e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  if (!aperta) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      onClick={() => onCambia(null)}
      onTouchStart={(e) => { tocco.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (tocco.current === null) return
        const dx = e.changedTouches[0].clientX - tocco.current
        tocco.current = null
        if (Math.abs(dx) > 50) vai(dx < 0 ? 1 : -1)
      }}
    >
      <img
        src={foto[indice!]}
        alt=""
        className="max-h-[100dvh] max-w-full select-none object-contain"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCambia(null) }}
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] grid h-11 w-11 place-content-center rounded-full bg-white/15 text-white hover:bg-white/25"
        aria-label="Chiudi"
      >
        <X className="h-6 w-6" />
      </button>
      {n > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); vai(-1) }} className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-content-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Foto precedente">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); vai(1) }} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-content-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Foto successiva">
            <ChevronRight className="h-6 w-6" />
          </button>
          <span className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white">
            {indice! + 1} / {n}
          </span>
        </>
      )}
    </div>,
    document.body
  )
}
