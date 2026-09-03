import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Colonna<T> {
  chiave: string
  intestazione: ReactNode
  cella: (riga: T) => ReactNode
  allineaDx?: boolean
  className?: string
  nascondiMobile?: boolean
}

interface TabellaProps<T> {
  colonne: Colonna<T>[]
  righe: T[]
  chiaveRiga: (riga: T) => string
  onRigaClick?: (riga: T) => void
  vuoto?: ReactNode
  denso?: boolean
}

/** Tabella sobria e densa. Numeri tabellari, riga cliccabile opzionale. */
export function Tabella<T>({
  colonne,
  righe,
  chiaveRiga,
  onRigaClick,
  vuoto = 'Nessun risultato.',
  denso,
}: TabellaProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-calce-200 text-left">
            {colonne.map((c) => (
              <th
                key={c.chiave}
                className={cn(
                  'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-profondo/45',
                  c.allineaDx && 'text-right',
                  c.nascondiMobile && 'hidden sm:table-cell'
                )}
              >
                {c.intestazione}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.length === 0 ? (
            <tr>
              <td colSpan={colonne.length} className="px-3 py-8 text-center text-sm text-profondo/50">
                {vuoto}
              </td>
            </tr>
          ) : (
            righe.map((r) => (
              <tr
                key={chiaveRiga(r)}
                onClick={onRigaClick ? () => onRigaClick(r) : undefined}
                className={cn(
                  'border-b border-calce-200/70 last:border-0',
                  onRigaClick && 'cursor-pointer hover:bg-calce/60'
                )}
              >
                {colonne.map((c) => (
                  <td
                    key={c.chiave}
                    className={cn(
                      denso ? 'px-3 py-1.5' : 'px-3 py-2.5',
                      'text-profondo/85',
                      c.allineaDx && 'text-right',
                      c.nascondiMobile && 'hidden sm:table-cell',
                      c.className
                    )}
                  >
                    {c.cella(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
