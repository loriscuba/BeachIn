import { useState } from 'react'
import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { GiornoChiuso, PrenotazioneRistorante, RichiestaRistorante } from '@/data/types'
import { cn } from '@/lib/cn'

/** Calendario del mese per scegliere il giorno: pallino = giorno con prenotazioni, rosso = chiuso. */
export function CalendarioMese({ giorno, oggi, onGiorno, prenotazioni, richieste, chiusi }: {
  giorno: string
  oggi: string
  onGiorno: (g: string) => void
  prenotazioni: PrenotazioneRistorante[]
  richieste: RichiestaRistorante[]
  chiusi: GiornoChiuso[]
}) {
  const [mese, setMese] = useState(() => startOfMonth(parseISO(giorno)))
  const [meseGiorno, setMeseGiorno] = useState(giorno.slice(0, 7))
  // se il giorno scelto cambia mese (frecce in alto, richieste), il calendario lo segue
  if (giorno.slice(0, 7) !== meseGiorno) { setMeseGiorno(giorno.slice(0, 7)); setMese(startOfMonth(parseISO(giorno))) }

  const inizio = startOfWeek(mese, { weekStartsOn: 1 })
  const fine = endOfMonth(mese)
  const celle: Date[] = []
  for (let d = inizio; d <= fine || celle.length % 7 !== 0; d = addDays(d, 1)) celle.push(d)
  const conPren = new Set(prenotazioni.filter((p) => p.stato !== 'annullata').map((p) => p.data))
  const conRich = new Set(richieste.map((r) => r.data))
  const chiusiSet = new Set(chiusi.map((c) => c.data))

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-base font-semibold capitalize text-profondo">{format(mese, 'MMMM yyyy', { locale: it })}</span>
        <span className="flex gap-1">
          <button type="button" onClick={() => setMese(addMonths(mese, -1))} className="grid h-9 w-9 place-content-center rounded-lg text-profondo hover:bg-calce/60" aria-label="Mese precedente"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setMese(addMonths(mese, 1))} className="grid h-9 w-9 place-content-center rounded-lg text-profondo hover:bg-calce/60" aria-label="Mese successivo"><ChevronRight className="h-4 w-4" /></button>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((g, i) => <span key={i} className="pb-1 text-[11px] font-semibold text-profondo/45">{g}</span>)}
        {celle.map((d) => {
          const g = format(d, 'yyyy-MM-dd')
          const fuori = d.getMonth() !== mese.getMonth()
          if (fuori) return <span key={g} />
          const scelto = g === giorno
          const chiuso = chiusiSet.has(g)
          return (
            <button
              key={g}
              type="button"
              onClick={() => onGiorno(g)}
              className={cn(
                'relative mx-auto grid h-10 w-10 place-content-center rounded-xl text-sm transition',
                scelto ? 'bg-profondo font-semibold text-white' : chiuso ? 'bg-boa/10 text-boa' : 'text-profondo hover:bg-calce/70',
                g === oggi && !scelto && 'font-bold ring-1 ring-profondo/30',
                g < oggi && !scelto && 'opacity-50',
              )}
            >
              <span className="num">{d.getDate()}</span>
              {(conPren.has(g) || conRich.has(g)) && (
                <span className={cn('absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full', conRich.has(g) ? 'bg-boa' : scelto ? 'bg-white' : 'bg-cabina')} />
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-calce-200 pt-2.5 text-[11px] text-profondo/55">
        <span className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-cabina" /> con prenotazioni</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-boa" /> da confermare</span>
        </span>
        <span>{format(parseISO(giorno), 'd MMMM', { locale: it })} selezionato</span>
      </p>
    </div>
  )
}
