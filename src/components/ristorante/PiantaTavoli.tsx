import { useState } from 'react'
import { Plus, Minus, X, Trash2, Users, Phone } from 'lucide-react'
import type { PrenotazioneRistorante, Tavolo, Turno } from '@/data/types'
import { cn } from '@/lib/cn'

type Zona = Tavolo['zona']
const etichetta: Record<Zona, string> = { veranda: 'Ristorante Veranda', interno: 'Ristorante Interno', ciringuito: 'Ciringuito' }

interface Props {
  tavoli: Tavolo[]
  prenOggi: PrenotazioneRistorante[]
  onAggiungi: (numero: number, posti: number, zona: Zona) => void
  onRimuovi: (id: string) => void
  onAssegna: (prenId: string, tavoloId?: string) => void
}

/** Pianta del locale: Veranda + Interno a sinistra, Ciringuito a destra. Click su un tavolo = dettaglio. */
export function PiantaTavoli({ tavoli, prenOggi, onAggiungi, onRimuovi, onAssegna }: Props) {
  const [turno, setTurno] = useState<Turno>(new Date().getHours() < 16 ? 'pranzo' : 'cena')
  const [selId, setSelId] = useState<string>()
  const [posti, setPosti] = useState(4)

  const attive = prenOggi.filter((p) => p.turno === turno && p.stato !== 'annullata')
  const perTavolo = (id: string) => attive.filter((p) => p.tavoloId === id)
  const daAssegnare = attive.filter((p) => p.stato === 'confermata' && !p.tavoloId)
  const sel = tavoli.find((t) => t.id === selId)
  const prossimo = tavoli.reduce((m, t) => Math.max(m, t.numero), 0) + 1

  const zona = (z: Zona, className: string) => {
    const tz = tavoli.filter((t) => t.zona === z).sort((a, b) => a.numero - b.numero)
    return (
      <div className={cn('flex flex-col rounded-lg border-2 border-profondo/70 bg-white p-2', className)}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-profondo/60">{etichetta[z]}</span>
          <button
            type="button"
            onClick={() => onAggiungi(prossimo, posti, z)}
            className="flex items-center gap-1 rounded-md border border-dashed border-calce-300 px-1.5 py-0.5 text-[11px] text-profondo/60 hover:border-cabina hover:text-cabina"
            title={`Aggiungi tavolo ${prossimo} da ${posti} posti`}
          >
            <Plus className="h-3 w-3" /> Tavolo
          </button>
        </div>
        <div className="flex flex-1 flex-wrap content-start gap-2">
          {tz.length === 0 && <p className="text-xs text-profondo/40">Nessun tavolo.</p>}
          {tz.map((t) => {
            const occ = perTavolo(t.id).length > 0
            return (
              <div key={t.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setSelId(t.id === selId ? undefined : t.id)}
                  className={cn(
                    'grid h-12 w-12 place-content-center rounded-lg border text-center transition',
                    occ ? 'border-cabina bg-cabina/15' : 'border-calce-200 bg-calce/40 hover:border-cabina',
                    t.id === selId && 'ring-2 ring-tenda'
                  )}
                  title={`Tavolo ${t.numero} · ${t.posti} posti`}
                >
                  <span className="num text-sm font-bold leading-none text-profondo">{t.numero}</span>
                  <span className="num text-[10px] text-profondo/50">{t.posti}p</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onRimuovi(t.id); if (t.id === selId) setSelId(undefined) }}
                  className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 place-content-center rounded-full bg-boa text-white group-hover:grid"
                  aria-label={`Elimina tavolo ${t.numero}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-calce-200 p-0.5 text-sm">
          {(['pranzo', 'cena'] as Turno[]).map((x) => (
            <button key={x} type="button" onClick={() => setTurno(x)}
              className={cn('rounded-md px-3 py-1 capitalize', turno === x ? 'bg-profondo text-white' : 'text-profondo/60')}>
              {x}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-profondo/60">
          Posti nuovo tavolo
          <button type="button" onClick={() => setPosti((p) => Math.max(1, p - 1))} className="grid h-6 w-6 place-content-center rounded border border-calce-200" aria-label="Meno posti"><Minus className="h-3 w-3" /></button>
          <span className="num w-4 text-center font-semibold text-profondo">{posti}</span>
          <button type="button" onClick={() => setPosti((p) => Math.min(20, p + 1))} className="grid h-6 w-6 place-content-center rounded border border-calce-200" aria-label="Più posti"><Plus className="h-3 w-3" /></button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 sm:grid-rows-[2fr_1fr]">
        {zona('veranda', 'min-h-[180px]')}
        {zona('ciringuito', 'min-h-[180px] sm:row-span-2')}
        {zona('interno', 'min-h-[100px]')}
      </div>

      {sel && (
        <div className="rounded-xl border border-calce-200 bg-calce/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-profondo">
              Tavolo {sel.numero} · {sel.posti} posti · {etichetta[sel.zona]} · <span className="capitalize">{turno}</span>
            </span>
            <div className="flex gap-1">
              <button type="button" onClick={() => { onRimuovi(sel.id); setSelId(undefined) }} className="grid h-7 w-7 place-content-center rounded-md text-boa hover:bg-white" aria-label="Elimina tavolo" title="Elimina tavolo"><Trash2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => setSelId(undefined)} className="grid h-7 w-7 place-content-center rounded-md text-profondo/45 hover:bg-white" aria-label="Chiudi"><X className="h-4 w-4" /></button>
            </div>
          </div>
          {perTavolo(sel.id).length > 0 ? (
            <ul className="space-y-1.5">
              {perTavolo(sel.id).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                  <span className="text-profondo">
                    <strong>{p.nome}</strong> · <Users className="inline h-3.5 w-3.5" /> {p.coperti}
                    {p.telefono && <> · <Phone className="inline h-3.5 w-3.5" /> {p.telefono}</>}
                    {p.note && <span className="text-profondo/55"> · {p.note}</span>}
                  </span>
                  <button type="button" onClick={() => onAssegna(p.id, undefined)} className="text-xs text-boa hover:underline">Libera</button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="mb-1.5 text-xs text-profondo/55">Tavolo libero. Prenotazioni confermate da assegnare:</p>
              {daAssegnare.length === 0 && <p className="text-sm text-profondo/45">Nessuna prenotazione da assegnare.</p>}
              <ul className="space-y-1.5">
                {daAssegnare.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                    <span className={cn('text-profondo', p.coperti > sel.posti && 'text-profondo/50')}>
                      <strong>{p.nome}</strong> · {p.coperti} coperti{p.coperti > sel.posti && ' (troppi posti)'}
                    </span>
                    <button type="button" onClick={() => onAssegna(p.id, sel.id)} className="rounded-md bg-cabina px-2 py-1 text-xs text-white hover:bg-profondo">Assegna qui</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
