import { useState } from 'react'
import { addDays, addMonths, format, parseISO, startOfMonth, startOfWeek, isSameMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { StatoGiorno } from '@/lib/disponibilita'
import { cn } from '@/lib/cn'

/**
 * Calendario del mese per il sito pubblico: i giorni pieni o chiusi sono rossi e non
 * selezionabili; quelli con un solo turno pieno sono gialli.
 */
export function CalendarioDisponibilita({ valore, minimo, onScegli, stato }: {
  valore: string
  minimo: string
  onScegli: (data: string) => void
  stato: (data: string) => StatoGiorno
}) {
  const [mese, setMese] = useState(() => startOfMonth(parseISO(valore)))
  const inizio = startOfWeek(mese, { weekStartsOn: 1 })
  const giorni = Array.from({ length: 42 }, (_, i) => addDays(inizio, i))
  const primoMese = startOfMonth(parseISO(minimo))

  return (
    <div className="rounded-2xl border border-calce-200 bg-calce/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setMese(addMonths(mese, -1))} disabled={mese <= primoMese} className="grid h-8 w-8 place-content-center rounded-full hover:bg-white disabled:opacity-30" aria-label="Mese precedente"><ChevronLeft className="h-4 w-4" /></button>
        <span className="font-display text-base font-semibold capitalize text-profondo">{format(mese, 'MMMM yyyy', { locale: it })}</span>
        <button type="button" onClick={() => setMese(addMonths(mese, 1))} className="grid h-8 w-8 place-content-center rounded-full hover:bg-white" aria-label="Mese successivo"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((g, i) => <span key={i} className="py-1 text-[11px] font-semibold text-profondo/40">{g}</span>)}
        {giorni.map((d) => {
          const iso = format(d, 'yyyy-MM-dd')
          const fuori = !isSameMonth(d, mese)
          const passato = iso < minimo
          const s = passato ? 'libero' : stato(iso)
          const bloccato = passato || s === 'chiuso' || s === 'pieno'
          const scelto = iso === valore
          return (
            <button
              key={iso}
              type="button"
              disabled={bloccato}
              onClick={() => onScegli(iso)}
              title={s === 'chiuso' ? 'Chiuso' : s === 'pieno' ? 'Tutto prenotato' : s === 'parziale' ? 'Un turno è al completo' : undefined}
              className={cn(
                'num relative h-9 rounded-lg text-sm transition-colors',
                fuori && 'opacity-40',
                passato && 'text-profondo/25',
                !passato && (s === 'chiuso' || s === 'pieno') && 'bg-boa/85 text-white line-through decoration-white/60',
                !passato && s === 'parziale' && 'bg-tenda/40 text-profondo hover:bg-tenda/60',
                !passato && s === 'libero' && 'bg-white text-profondo hover:bg-acqua/30',
                scelto && 'ring-2 ring-profondo font-bold',
              )}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-profondo/55">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-white ring-1 ring-calce-200" /> disponibile</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-tenda/60" /> un turno al completo</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-boa/85" /> pieno o chiuso</span>
      </p>
    </div>
  )
}
