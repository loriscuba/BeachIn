import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react'
import type { PrenotazioneRistorante, RichiestaRistorante, Turno } from '@/data/types'
import { cn } from '@/lib/cn'

const MAX_CHIP = 4

/** Vista settimanale delle prenotazioni (pranzo/cena per giorno): click su un giorno = dettaglio sotto. */
export function CalendarioPrenotazioni({ giorno, oggi, onGiorno, prenotazioni, richieste }: {
  giorno: string
  oggi: string
  onGiorno: (g: string) => void
  prenotazioni: PrenotazioneRistorante[]
  /** Richieste dal sito ancora da confermare. */
  richieste: RichiestaRistorante[]
}) {
  const inizio = startOfWeek(parseISO(giorno), { weekStartsOn: 1 })
  const giorni = Array.from({ length: 7 }, (_, i) => format(addDays(inizio, i), 'yyyy-MM-dd'))
  const sposta = (n: number) => onGiorno(format(addDays(parseISO(giorno), n), 'yyyy-MM-dd'))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => sposta(-7)} className="grid h-8 w-8 place-content-center rounded-lg border border-calce-200 hover:bg-calce/60" aria-label="Settimana precedente"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => sposta(7)} className="grid h-8 w-8 place-content-center rounded-lg border border-calce-200 hover:bg-calce/60" aria-label="Settimana successiva"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => onGiorno(oggi)} className="h-8 rounded-lg border border-calce-200 px-3 text-sm hover:bg-calce/60">Oggi</button>
        </div>
        <span className="text-sm font-semibold capitalize text-profondo">
          {format(inizio, 'd MMM', { locale: it })} – {format(addDays(inizio, 6), 'd MMM yyyy', { locale: it })}
        </span>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="grid min-w-[720px] grid-cols-7 gap-1.5">
          {giorni.map((g) => {
            const delGiorno = prenotazioni.filter((p) => p.data === g && p.stato !== 'annullata')
            const coperti = delGiorno.reduce((s, p) => s + p.coperti, 0)
            const daConf = richieste.filter((r) => r.data === g)
            const d = parseISO(g)
            return (
              <button
                key={g}
                onClick={() => onGiorno(g)}
                className={cn(
                  'flex min-h-[220px] flex-col rounded-xl border p-1.5 text-left transition',
                  g === giorno ? 'border-cabina bg-cabina/5 ring-2 ring-cabina/30' : 'border-calce-200 bg-white hover:border-cabina/50',
                  g < oggi && 'opacity-60',
                )}
              >
                <div className="mb-1 flex items-baseline justify-between px-0.5">
                  <span className="text-[11px] font-semibold uppercase text-profondo/50">{format(d, 'EEE', { locale: it })}</span>
                  <span className={cn('num grid h-6 min-w-6 place-content-center rounded-full px-1 text-sm font-bold', g === oggi ? 'bg-boa text-white' : 'text-profondo')}>{format(d, 'd')}</span>
                </div>
                <p className="mb-1 px-0.5 text-[10px] text-profondo/50">{coperti} coperti{daConf.length > 0 && <span className="ml-1 font-semibold text-boa">· {daConf.length} da conf.</span>}</p>
                {(['pranzo', 'cena'] as Turno[]).map((t) => {
                  const lista = delGiorno.filter((p) => p.turno === t)
                  const ric = daConf.filter((r) => r.turno === t)
                  return (
                    <div key={t} className="mb-1 flex-1 rounded-lg bg-calce/50 p-1">
                      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-profondo/40">{t}</p>
                      <div className="space-y-0.5">
                        {ric.map((r) => (
                          <p key={r.id} className="flex items-center gap-1 truncate rounded border border-dashed border-boa/60 bg-white px-1 text-[10px] text-boa" title={`${r.nome} · ${r.coperti} · da confermare`}>
                            <Globe className="h-2.5 w-2.5 shrink-0" /> {r.nome} · {r.coperti}
                          </p>
                        ))}
                        {lista.slice(0, MAX_CHIP).map((p) => (
                          <p key={p.id} className={cn('truncate rounded px-1 text-[10px]', p.stato === 'in_attesa' ? 'bg-tenda/30 text-profondo' : p.tavoloId ? 'bg-cabina/15 text-profondo' : 'bg-white text-profondo ring-1 ring-cabina/30')} title={`${p.nome} · ${p.coperti} coperti${p.tavoloId ? '' : ' · senza tavolo'}`}>
                            {p.nome} · {p.coperti}
                          </p>
                        ))}
                        {lista.length > MAX_CHIP && <p className="px-1 text-[10px] text-profondo/50">+{lista.length - MAX_CHIP} altre</p>}
                      </div>
                    </div>
                  )
                })}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-profondo/55">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-cabina/30" /> con tavolo</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-white ring-1 ring-cabina/40" /> senza tavolo</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-tenda/50" /> in attesa</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-dashed border-boa" /> dal sito, da confermare</span>
      </p>
    </div>
  )
}
