import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface DrawerProps {
  aperto: boolean
  onChiudi: () => void
  titolo?: ReactNode
  sottotitolo?: ReactNode
  intestazione?: ReactNode // per intestazioni ricche (es. badge stato)
  piede?: ReactNode
  children: ReactNode
  larghezza?: string
}

/** Pannello a scomparsa da destra. */
export function Drawer({
  aperto,
  onChiudi,
  titolo,
  sottotitolo,
  intestazione,
  piede,
  children,
  larghezza = 'max-w-md',
}: DrawerProps) {
  useEffect(() => {
    if (!aperto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aperto, onChiudi])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-profondo-900/40 transition-opacity',
          aperto ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onChiudi}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-calce shadow-drawer transition-transform duration-200',
          larghezza,
          aperto ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-calce-200 bg-white px-4 py-3">
          <div className="min-w-0">
            {intestazione ?? (
              <>
                <h2 className="text-base font-bold text-profondo">{titolo}</h2>
                {sottotitolo && <p className="text-xs text-profondo/55">{sottotitolo}</p>}
              </>
            )}
          </div>
          <button
            className="-mr-1 rounded-lg p-1.5 text-profondo/60 hover:bg-profondo/5 hover:text-profondo"
            onClick={onChiudi}
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {piede && <div className="border-t border-calce-200 bg-white p-3">{piede}</div>}
      </aside>
    </>
  )
}
