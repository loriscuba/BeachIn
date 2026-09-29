import { useState } from 'react'
import { CalendarX2, Plus, Undo2 } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { cn } from '@/lib/cn'

const dataIt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

/** Raggruppa date consecutive con la stessa nota in periodi (es. "lun 3 – ven 7 nov"). */
function periodi(date: { data: string; nota?: string }[]) {
  const out: { dal: string; al: string; nota?: string; giorni: string[] }[] = []
  for (const g of date) {
    const ultimo = out[out.length - 1]
    const dopo = ultimo && new Date(`${ultimo.al}T12:00:00`)
    dopo?.setDate(dopo.getDate() + 1)
    const iso = dopo && `${dopo.getFullYear()}-${String(dopo.getMonth() + 1).padStart(2, '0')}-${String(dopo.getDate()).padStart(2, '0')}`
    if (ultimo && iso === g.data && ultimo.nota === g.nota) { ultimo.al = g.data; ultimo.giorni.push(g.data) }
    else out.push({ dal: g.data, al: g.data, nota: g.nota, giorni: [g.data] })
  }
  return out
}

/** Segna uno o più giorni di chiusura del ristorante; il sito pubblico li mostra in rosso. */
export function GiorniChiusi({ grande }: { grande?: boolean }) {
  const { giorniChiusi, chiudiGiorni, riapriGiorno } = useDemoData()
  const oggi = config.stagione.oggi
  const [dal, setDal] = useState(oggi)
  const [al, setAl] = useState(oggi)
  const [nota, setNota] = useState('')
  const futuri = giorniChiusi.filter((g) => g.data >= oggi)
  const campo = cn('w-full rounded-lg border border-calce-200 bg-white px-3 text-profondo focus-visible:focus-ring', grande ? 'h-11 text-base' : 'h-9 text-sm')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="mb-1 block text-xs font-medium text-profondo/60">Dal</span>
          <input type="date" value={dal} min={oggi} onChange={(e) => { setDal(e.target.value); if (e.target.value > al) setAl(e.target.value) }} className={campo} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-profondo/60">Al (compreso)</span>
          <input type="date" value={al} min={dal} onChange={(e) => setAl(e.target.value)} className={campo} /></label>
        <label className="col-span-2 block"><span className="mb-1 block text-xs font-medium text-profondo/60">Motivo (facoltativo)</span>
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="es. evento privato, ferie, maltempo" className={campo} /></label>
      </div>
      <button
        type="button"
        disabled={!dal || !al}
        onClick={() => { chiudiGiorni(dal, al, nota.trim() || undefined); setNota('') }}
        className={cn('inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-boa font-semibold text-white hover:bg-[#cf4a24] disabled:opacity-50', grande ? 'h-11' : 'h-9 text-sm')}
      >
        <Plus className="h-4 w-4" /> {dal === al ? 'Segna giorno chiuso' : 'Segna giorni chiusi'}
      </button>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-profondo/50">Chiusure in programma</p>
        {futuri.length === 0 && <p className="text-sm text-profondo/45">Nessuna chiusura: il sito accetta richieste tutti i giorni.</p>}
        <ul className="space-y-1.5">
          {periodi(futuri).map((p) => (
            <li key={p.dal} className="flex items-center justify-between gap-2 rounded-lg border border-boa/30 bg-boa/5 px-3 py-2 text-sm text-profondo">
              <span className="min-w-0">
                <span className="inline-flex items-center gap-1.5 font-semibold capitalize"><CalendarX2 className="h-4 w-4 shrink-0 text-boa" />{p.dal === p.al ? dataIt(p.dal) : `${dataIt(p.dal)} – ${dataIt(p.al)}`}</span>
                {p.nota && <span className="block truncate text-xs text-profondo/55">{p.nota}</span>}
              </span>
              <button type="button" onClick={() => p.giorni.forEach(riapriGiorno)} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-cabina hover:bg-white" title="Riapri">
                <Undo2 className="h-3.5 w-3.5" /> Riapri
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
