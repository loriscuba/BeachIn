import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ModalProps {
  aperto: boolean
  onChiudi: () => void
  titolo: ReactNode
  children: ReactNode
  piede?: ReactNode
  larghezza?: string
}

/** Dialog centrato, sobrio. Montato su body: un antenato con transform/blur non lo ritaglia. */
export function Modal({ aperto, onChiudi, titolo, children, piede, larghezza = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!aperto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aperto, onChiudi])

  if (!aperto) return null

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-profondo-900/50 backdrop-blur-sm" onClick={onChiudi} aria-hidden />
      <div
        className={cn('anim-pop relative w-full overflow-hidden rounded-3xl border border-calce-200 bg-white shadow-[0_40px_80px_-30px_rgba(6,22,29,0.6)]', larghezza)}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-calce-200 bg-white px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-profondo">{titolo}</h2>
          <button className="-mr-1 rounded-lg p-1.5 text-profondo/60 hover:bg-profondo/5 hover:text-profondo" onClick={onChiudi} aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto p-4">{children}</div>
        {piede && <div className="border-t border-calce-200 bg-white p-3">{piede}</div>}
      </div>
    </div>,
    document.body
  )
}
