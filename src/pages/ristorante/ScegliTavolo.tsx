import type { Tavolo } from '@/data/types'
import { Modal } from '@/components/ui/Modal'
import { ZONE } from '@/lib/zoneTavoli'
import { cn } from '@/lib/cn'

/** Pianta dei tavoli in un modal: tocco su un tavolo libero = assegnato. */
export function ScegliTavolo({ aperto, onChiudi, titolo, coperti, tavoli, occupanti, correnteId, consigliatoId, onScegli }: {
  aperto: boolean
  onChiudi: () => void
  titolo: string
  coperti: number
  tavoli: Tavolo[]
  /** Tavoli già presi nel turno → nome di chi li occupa. */
  occupanti: Map<string, string>
  correnteId?: string
  consigliatoId?: string
  onScegli: (tavoloId?: string) => void
}) {
  const scegli = (id?: string) => { onScegli(id); onChiudi() }
  return (
    <Modal
      aperto={aperto}
      onChiudi={onChiudi}
      titolo={titolo}
      larghezza="max-w-4xl"
      piede={correnteId ? <button type="button" onClick={() => scegli(undefined)} className="text-sm font-medium text-boa hover:underline">Togli il tavolo</button> : undefined}
    >
      <div className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-xl border border-calce-200 bg-white">
        {ZONE.map((z) => (
          <div key={z.zona} className={cn('absolute border-2 border-profondo/40', z.colore)} style={{ left: `${z.x0}%`, top: `${z.y0}%`, width: `${z.x1 - z.x0}%`, height: `${z.y1 - z.y0}%` }}>
            <span className="absolute left-2 top-1 text-[10px] font-semibold uppercase tracking-widest text-profondo/45">{z.nome}</span>
          </div>
        ))}
        {tavoli.map((t) => {
          const chi = t.id === correnteId ? undefined : occupanti.get(t.id)
          const piccolo = t.posti < coperti
          const lato = t.posti > 4 ? 'h-14 w-[4.5rem]' : t.posti > 2 ? 'h-14 w-14' : 'h-12 w-12'
          return (
            <button
              key={t.id}
              type="button"
              disabled={!!chi}
              onClick={() => scegli(t.id)}
              className={cn(
                'absolute grid -translate-x-1/2 -translate-y-1/2 place-content-center border-2 text-center shadow-sm transition',
                lato, t.forma === 'quadrato' ? 'rounded-lg' : 'rounded-full',
                chi ? 'cursor-not-allowed border-calce-200 bg-calce-200 text-profondo/40'
                  : t.id === correnteId ? 'border-profondo bg-profondo text-white'
                    : piccolo ? 'border-tenda bg-white text-profondo/60 hover:bg-tenda/20'
                      : 'border-cabina bg-white text-profondo hover:bg-cabina/10',
                t.id === consigliatoId && t.id !== correnteId && 'ring-4 ring-acqua',
              )}
              style={{ left: `${t.x ?? 50}%`, top: `${t.y ?? 50}%` }}
              title={chi ? `Tavolo ${t.numero} · ${chi}` : `Tavolo ${t.numero} · ${t.posti} posti`}
            >
              <span className="num text-base font-bold leading-none">{t.numero}</span>
              <span className="max-w-[4rem] truncate text-[9px] opacity-80">{chi ?? `${t.posti} posti`}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-3 text-[11px] text-profondo/60">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border-2 border-cabina bg-white" /> libero</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full ring-2 ring-acqua" /> consigliato</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border-2 border-tenda bg-white" /> troppo piccolo</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-calce-200" /> occupato</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-profondo" /> attuale</span>
      </p>
    </Modal>
  )
}
