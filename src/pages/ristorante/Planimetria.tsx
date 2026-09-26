import { useRef, useState, type ReactNode } from 'react'
import { Printer, Trash2, Move } from 'lucide-react'
import type { Tavolo } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { QrCodice, stampaQr } from '@/components/QrCodice'
import { urlMenu } from '@/lib/menuLingue'
import { config } from '@/data/config'
import { cn } from '@/lib/cn'

const fasce: { zona: Tavolo['zona']; da: number; a: number; colore: string; nome: string }[] = [
  { zona: 'veranda', da: 0, a: 36, colore: 'bg-acqua/15', nome: 'Veranda · fronte mare' },
  { zona: 'sala', da: 36, a: 70, colore: 'bg-tenda/10', nome: 'Sala' },
  { zona: 'terrazza', da: 70, a: 100, colore: 'bg-cabina/10', nome: 'Terrazza' },
]
const zonaDaY = (y: number): Tavolo['zona'] => (y < 36 ? 'veranda' : y < 70 ? 'sala' : 'terrazza')

/** Sottosezione Tavoli: planimetria trascinabile, occupazione di oggi e QR per tavolo. */
export function Planimetria({ occupati, nuovoTavolo }: { occupati: Set<string>; nuovoTavolo: ReactNode }) {
  const { tavoli, spostaTavolo, rimuoviTavolo } = useDemoData()
  const area = useRef<HTMLDivElement>(null)
  const [trascina, setTrascina] = useState<{ id: string; x: number; y: number }>()
  const [selId, setSelId] = useState<string>()
  const sel = tavoli.find((t) => t.id === selId)

  const pos = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect()
    const c = (v: number) => Math.min(95, Math.max(5, Math.round(v * 10) / 10))
    return { x: c(((e.clientX - r.left) / r.width) * 100), y: c(((e.clientY - r.top) / r.height) * 100) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          titolo="Disposizione tavoli"
          sottotitolo={`${tavoli.length} tavoli · ${tavoli.reduce((s, t) => s + t.posti, 0)} posti · ${occupati.size} occupati oggi — trascina per spostare`}
          azione={<Button onClick={() => stampaQr([...tavoli].sort((a, b) => a.numero - b.numero).map((t) => ({ titolo: `Tavolo ${t.numero}`, sottotitolo: 'Menu · IT EN FR DE ES', url: urlMenu(t.numero) })), config.nome)}><Printer className="h-4 w-4" /> QR di tutti i tavoli</Button>}
        />
        <CardBody className="pt-1">
          <div
            ref={area}
            className="relative aspect-[16/10] w-full touch-none select-none overflow-hidden rounded-xl border border-calce-200 bg-white"
            onPointerMove={(e) => trascina && setTrascina({ id: trascina.id, ...pos(e) })}
            onPointerUp={() => { if (trascina) spostaTavolo(trascina.id, trascina.x, trascina.y); setTrascina(undefined) }}
            onPointerLeave={() => setTrascina(undefined)}
          >
            {fasce.map((f) => (
              <div key={f.zona} className={cn('absolute inset-x-0', f.colore)} style={{ top: `${f.da}%`, height: `${f.a - f.da}%` }}>
                <span className="absolute left-2 top-1 text-[10px] font-semibold uppercase tracking-widest text-profondo/40">{f.nome}</span>
              </div>
            ))}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-acqua to-cabina" title="Mare" />
            {tavoli.map((t) => {
              const p = trascina?.id === t.id ? trascina : { x: t.x ?? 50, y: t.y ?? 50 }
              const lato = t.posti > 4 ? 'h-12 w-16' : t.posti > 2 ? 'h-12 w-12' : 'h-10 w-10'
              return (
                <button
                  key={t.id}
                  onPointerDown={(e) => { e.currentTarget.releasePointerCapture?.(e.pointerId); setSelId(t.id); setTrascina({ id: t.id, x: p.x, y: p.y }) }}
                  className={cn(
                    'absolute grid -translate-x-1/2 -translate-y-1/2 cursor-grab place-content-center border-2 text-center shadow-sm transition-shadow active:cursor-grabbing',
                    lato, t.forma === 'quadrato' ? 'rounded-lg' : 'rounded-full',
                    occupati.has(t.id) ? 'border-cabina bg-cabina text-white' : 'border-profondo/25 bg-white text-profondo',
                    selId === t.id && 'ring-4 ring-tenda/60',
                  )}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  title={`Tavolo ${t.numero} · ${t.posti} posti`}
                >
                  <span className="num text-sm font-bold leading-none">{t.numero}</span>
                  <span className="num text-[9px] opacity-70">{t.posti}p</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 flex items-center gap-3 text-xs text-profondo/55">
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-cabina" /> occupato oggi</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border-2 border-profondo/25" /> libero</span>
            <span className="inline-flex items-center gap-1"><Move className="h-3 w-3" /> la zona si aggiorna in base a dove lo lasci</span>
          </p>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader titolo={sel ? `Tavolo ${sel.numero}` : 'Seleziona un tavolo'} sottotitolo={sel ? `${sel.posti} posti · ${zonaDaY(sel.y ?? 50)}${occupati.has(sel.id) ? ' · occupato oggi' : ''}` : 'Clicca un tavolo sulla pianta'} />
          {sel && (
            <CardBody className="space-y-3 pt-1 text-center">
              <QrCodice url={urlMenu(sel.numero)} className="mx-auto w-32" />
              <div className="flex justify-center gap-2">
                <Button onClick={() => stampaQr([{ titolo: `Tavolo ${sel.numero}`, sottotitolo: 'Menu · IT EN FR DE ES', url: urlMenu(sel.numero) }], config.nome)}><Printer className="h-4 w-4" /> Stampa QR</Button>
                <Button onClick={() => { rimuoviTavolo(sel.id); setSelId(undefined) }}><Trash2 className="h-4 w-4 text-boa" /> Elimina</Button>
              </div>
            </CardBody>
          )}
        </Card>
        <Card><CardBody>{nuovoTavolo}</CardBody></Card>
      </div>
    </div>
  )
}

