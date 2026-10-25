/**
 * Scelta del tavolo divisa per zona, con le stesse zone e gli stessi tavoli di Ristorante → Tavoli
 * (disposizione del giorno, configurabile dalla pianta). Usata da cameriere, tablet self e QR tavoli.
 */
import type { Tavolo } from '@/data/types'
import { ZONE } from '@/lib/zoneTavoli'
import { cn } from '@/lib/cn'

export default function TavoliPerZona({ tavoli, scelto, onScegli, badge, evidenzia, nota }: {
  tavoli: Tavolo[]
  scelto: number | null
  onScegli: (numero: number) => void
  /** Pallino rosso col numero (es. comande aperte). */
  badge?: (t: Tavolo) => number
  /** Tavolo in giallo (es. con comande aperte o aperto ai QR). */
  evidenzia?: (t: Tavolo) => boolean
  /** Riga piccola sotto il numero (default: posti). */
  nota?: (t: Tavolo) => string
}) {
  return (
    <div className="space-y-3">
      {ZONE.map((z) => {
        const qui = tavoli.filter((t) => t.zona === z.zona).sort((a, b) => a.numero - b.numero)
        if (!qui.length) return null
        return (
          <div key={z.zona} className={cn('rounded-xl p-2', z.colore)}>
            <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-profondo/60">{z.nome} <span className="num font-normal text-profondo/40">· {qui.length}</span></p>
            <div className="grid grid-cols-4 gap-2 min-[400px]:grid-cols-5 sm:grid-cols-8 lg:grid-cols-9">
              {qui.map((t) => {
                const n = badge?.(t) ?? 0
                const su = scelto === t.numero
                return (
                  <button key={t.id} type="button" onClick={() => onScegli(t.numero)}
                    className={cn('relative grid h-14 place-content-center rounded-xl border text-center transition',
                      su ? 'border-cabina bg-gradient-to-br from-profondo to-cabina text-white shadow' : evidenzia?.(t) ? 'border-tenda bg-tenda/25 text-profondo' : 'border-calce-200 bg-white text-profondo hover:border-cabina')}>
                    <span className="num text-lg font-bold leading-none">{t.numero}</span>
                    <span className={cn('text-[10px]', su ? 'text-white/75' : 'text-profondo/50')}>{nota ? nota(t) : `${t.posti} posti`}</span>
                    {n > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-content-center rounded-full bg-boa px-1 text-[11px] font-bold text-white">{n}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
