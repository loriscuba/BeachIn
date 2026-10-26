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

/**
 * Tabella sobria e densa. Numeri tabellari, riga cliccabile opzionale.
 * Su telefono ogni riga diventa una scheda: la prima colonna fa da titolo, le altre sono etichetta e valore
 * (le colonne `nascondiMobile` restano fuori). Niente scorrimento orizzontale.
 */
export function Tabella<T>({
  colonne,
  righe,
  chiaveRiga,
  onRigaClick,
  vuoto = 'Nessun risultato.',
  denso,
}: TabellaProps<T>) {
  const [prima, ...altre] = colonne.filter((c) => !c.nascondiMobile)
  return (
    <>
    <ul className="space-y-2 sm:hidden">
      {righe.length === 0 ? (
        <li className="px-3 py-8 text-center text-sm text-profondo/50">{vuoto}</li>
      ) : (
        righe.map((r) => (
          <li
            key={chiaveRiga(r)}
            onClick={onRigaClick ? () => onRigaClick(r) : undefined}
            className={cn('rounded-xl border border-calce-200 bg-white/70 px-3 py-2.5 text-sm', onRigaClick && 'cursor-pointer active:bg-calce/60')}
          >
            {prima && <div className="min-w-0 font-semibold text-profondo">{prima.cella(r)}</div>}
            {altre.length > 0 && (
              <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                {altre.map((c) => (
                  <div key={c.chiave} className={cn('min-w-0', c.allineaDx && 'text-right')}>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-profondo/45">{c.intestazione}</dt>
                    <dd className="min-w-0 break-words text-profondo/85">{c.cella(r)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))
      )}
    </ul>
    <div className="hidden overflow-x-auto sm:block">
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
    </>
  )
}
