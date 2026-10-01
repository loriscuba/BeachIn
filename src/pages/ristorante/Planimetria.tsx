import { useRef, useState } from 'react'
import { Printer, Trash2, Move, Users, Phone, X, Plus, Check, RotateCcw, Save, LayoutGrid } from 'lucide-react'
import type { PrenotazioneRistorante, Tavolo, Turno } from '@/data/types'
import { ZONE, nomeZona } from '@/lib/zoneTavoli'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { QrCodice, stampaQr } from '@/components/QrCodice'
import { urlMenu } from '@/lib/menuLingue'
import { config } from '@/data/config'
import { cn } from '@/lib/cn'
import { format, parseISO } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'

/**
 * Tavoli del giorno scelto: planimetria trascinabile, occupazione per turno e QR per tavolo.
 * Ogni giorno parte dalla disposizione standard; modificandolo diventa "personalizzato" e
 * con "Disposizione standard" torna al modello. In modalità Standard si modifica il modello.
 */
export function Planimetria({ prenGiorno, giorno, oggi }: { prenGiorno: PrenotazioneRistorante[]; giorno: string; oggi: string }) {
  const { tavoliGiorno, tavoliDelGiorno, aggiungiTavolo, spostaTavolo, rimuoviTavolo, modificaTavolo, assegnaTavolo, ripristinaDisposizione, salvaComeStandard } = useDemoData()
  const [standard, setStandard] = useState(false)
  // azioni sul giorno oppure (modalità Standard) sul modello
  const g = standard ? undefined : giorno
  const tavoli = tavoliDelGiorno(standard ? '' : giorno)
  const personalizzato = !!tavoliGiorno[giorno]
  // Oggi parte dal turno in corso; gli altri giorni dal pranzo.
  const [turno, setTurno] = useState<Turno>(giorno === oggi && new Date().getHours() >= 16 ? 'cena' : 'pranzo')
  const attive = standard ? [] : prenGiorno.filter((p) => p.turno === turno && p.stato !== 'annullata')
  const occupati = new Set(attive.flatMap((p) => (p.tavoloId ? [p.tavoloId] : [])))
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
        {/* Intestazione a tutta larghezza: titolo e riepilogo sopra, comandi in una riga a parte */}
        <div className="space-y-3 px-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-profondo">
                {standard ? 'Disposizione standard' : `Tavoli · ${giorno === oggi ? 'oggi' : format(parseISO(giorno), 'EEEE d MMMM', { locale: itLocale })}`}
                {!standard && (personalizzato ? <Badge tono="tenda">Personalizzata</Badge> : <Badge tono="neutro">Standard</Badge>)}
              </h3>
              <p className="mt-0.5 text-sm text-profondo/60">
                <span className="num">{tavoli.length}</span> tavoli · <span className="num">{tavoli.reduce((s, t) => s + t.posti, 0)}</span> posti
                {standard
                  ? ' — il modello da cui parte ogni giorno'
                  : <> · <span className="num">{occupati.size}</span> occupati a {turno}</>}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {!standard && personalizzato && <>
                <Button dimensione="sm" onClick={() => ripristinaDisposizione(giorno)} title="Il giorno torna alla disposizione standard"><RotateCcw className="h-4 w-4" /> Disposizione standard</Button>
                <Button dimensione="sm" onClick={() => salvaComeStandard(giorno)} title="Usa questa disposizione come nuovo standard"><Save className="h-4 w-4" /> Salva come standard</Button>
              </>}
              <Button dimensione="sm" onClick={() => stampaQr([...tavoli].sort((a, b) => a.numero - b.numero).map((t) => ({ titolo: `Tavolo ${t.numero}`, sottotitolo: 'Menu · IT EN FR DE ES', url: urlMenu(t.numero) })), config.nome)}><Printer className="h-4 w-4" /> QR di tutti i tavoli</Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-calce-200 bg-calce/40 p-0.5 text-sm">
              <button type="button" onClick={() => setStandard(false)} className={cn('rounded-md px-3 py-1 font-medium', !standard ? 'bg-profondo text-white' : 'text-profondo/70 hover:text-profondo')}>Questo giorno</button>
              <button type="button" onClick={() => { setStandard(true); setSelId(undefined) }} className={cn('inline-flex items-center gap-1 rounded-md px-3 py-1 font-medium', standard ? 'bg-profondo text-white' : 'text-profondo/70 hover:text-profondo')}><LayoutGrid className="h-3.5 w-3.5" /> Standard</button>
            </div>
            {!standard && <div className="flex rounded-lg border border-calce-200 bg-calce/40 p-0.5 text-sm">
              {(['pranzo', 'cena'] as Turno[]).map((x) => (
                <button key={x} type="button" onClick={() => setTurno(x)} className={cn('rounded-md px-3 py-1 font-medium capitalize', turno === x ? 'bg-profondo text-white' : 'text-profondo/70 hover:text-profondo')}>{x}</button>
              ))}
            </div>}
          </div>
        </div>
        <CardBody className="pt-3">
          <div
            ref={area}
            className="relative aspect-[16/10] w-full touch-none select-none overflow-hidden rounded-xl border border-calce-200 bg-white"
            onPointerMove={(e) => trascina && setTrascina({ id: trascina.id, ...pos(e) })}
            onPointerUp={() => { if (trascina) spostaTavolo(trascina.id, trascina.x, trascina.y, g); setTrascina(undefined) }}
            onPointerLeave={() => setTrascina(undefined)}
          >
            {ZONE.map((z) => (
              <div key={z.zona} className={cn('absolute border-2 border-profondo/60', z.colore)} style={{ left: `${z.x0}%`, top: `${z.y0}%`, width: `${z.x1 - z.x0}%`, height: `${z.y1 - z.y0}%` }}>
                <span className="absolute left-2 top-1 text-[10px] font-semibold uppercase tracking-widest text-profondo/45">{z.nome}</span>
              </div>
            ))}
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
          <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-profondo/55">
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-cabina" /> occupato ({turno})</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border-2 border-profondo/25" /> libero</span>
            <span className="inline-flex items-center gap-1"><Move className="h-3 w-3" /> trascina per spostare{standard ? ' (modello)' : ' (solo questo giorno)'}: la zona segue dove lo lasci</span>
          </p>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader titolo={sel ? `Tavolo ${sel.numero}` : 'Seleziona un tavolo'} sottotitolo={sel ? `${nomeZona(sel.zona)} · ${standard ? 'standard' : turno}` : 'Clicca un tavolo sulla pianta'} />
          {sel && <PannelloTavolo
            key={sel.id}
            tavolo={sel}
            turno={turno}
            standard={standard}
            attive={attive}
            onModifica={(d) => modificaTavolo(sel.id, d, g)}
            onAssegna={assegnaTavolo}
            onElimina={() => { rimuoviTavolo(sel.id, g); setSelId(undefined) }}
          />}
        </Card>
        <Card><CardBody><NuovoTavolo key={standard ? 'std' : giorno} tavoli={tavoli} onCrea={(n, p, z) => aggiungiTavolo(n, p, z, g)} /></CardBody></Card>
      </div>
    </div>
  )
}


const campo = 'num h-9 w-full rounded-lg border border-calce-200 bg-white px-2 text-sm text-profondo focus-visible:focus-ring'

/** Dettaglio tavolo: modifica (numero/posti/zona), ospiti del turno, prenotazioni confermate da assegnare, QR. */
function PannelloTavolo({ tavolo: t, turno, standard, attive, onModifica, onAssegna, onElimina }: {
  tavolo: Tavolo; turno: Turno; standard: boolean; attive: PrenotazioneRistorante[]
  onModifica: (d: { numero?: number; posti?: number; zona?: Tavolo['zona'] }) => void
  onAssegna: (prenId: string, tavoloId?: string) => void
  onElimina: () => void
}) {
  const ospiti = attive.filter((p) => p.tavoloId === t.id)
  const libere = attive.filter((p) => p.stato === 'confermata' && !p.tavoloId)
  const intero = (v: string) => Math.max(1, Math.round(Number(v)) || 1)
  return (
    <CardBody className="space-y-4 pt-1">
      <div className="grid grid-cols-3 gap-2">
        <label className="block"><span className="mb-1 block text-xs text-profondo/60">Numero</span>
          <input type="number" min={1} value={t.numero} onChange={(e) => onModifica({ numero: intero(e.target.value) })} className={campo} /></label>
        <label className="block"><span className="mb-1 block text-xs text-profondo/60">Posti</span>
          <input type="number" min={1} value={t.posti} onChange={(e) => onModifica({ posti: intero(e.target.value) })} className={campo} /></label>
        <label className="block"><span className="mb-1 block text-xs text-profondo/60">Zona</span>
          <select value={t.zona} onChange={(e) => onModifica({ zona: e.target.value as Tavolo['zona'] })} className={cn(campo, 'px-1')}>
            {ZONE.map((z) => <option key={z.zona} value={z.zona}>{z.nome.replace('Ristorante ', '')}</option>)}
          </select></label>
      </div>

      {!standard && <>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-profondo/50">Ospiti a {turno}</p>
        {ospiti.length === 0 && <p className="text-sm text-profondo/45">Nessuno: il tavolo è libero.</p>}
        <ul className="space-y-1.5">
          {ospiti.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-cabina/10 px-3 py-2 text-sm text-profondo">
              <span><strong>{p.nome}</strong> · <Users className="inline h-3.5 w-3.5" /> {p.coperti}
                {p.telefono && <> · <Phone className="inline h-3.5 w-3.5" /> {p.telefono}</>}
                {p.note && <span className="block text-xs text-profondo/55">{p.note}</span>}</span>
              <button type="button" onClick={() => onAssegna(p.id, undefined)} className="grid h-6 w-6 shrink-0 place-content-center rounded text-boa hover:bg-white" title="Togli dal tavolo" aria-label="Togli dal tavolo"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-profondo/50">Prenotazioni confermate senza tavolo</p>
        {libere.length === 0 && <p className="text-sm text-profondo/45">Tutte le prenotazioni confermate di {turno} hanno già un tavolo.</p>}
        <ul className="space-y-1.5">
          {libere.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-calce-200 bg-white px-3 py-2 text-sm text-profondo">
              <span><strong>{p.nome}</strong> · {p.coperti} coperti
                {p.coperti > t.posti && <span className="block text-xs text-boa">Più coperti dei posti del tavolo</span>}</span>
              <Button dimensione="sm" variante="primario" onClick={() => onAssegna(p.id, t.id)}>Assegna</Button>
            </li>
          ))}
        </ul>
      </div>
      </>}

      <div className="flex items-center justify-between gap-2 border-t border-calce-200 pt-3">
        <QrCodice url={urlMenu(t.numero)} className="w-16" />
        <div className="flex flex-wrap justify-end gap-2">
          <Button dimensione="sm" onClick={() => stampaQr([{ titolo: `Tavolo ${t.numero}`, sottotitolo: 'Menu · IT EN FR DE ES', url: urlMenu(t.numero) }], config.nome)}><Printer className="h-4 w-4" /> QR</Button>
          <Button dimensione="sm" onClick={onElimina}><Trash2 className="h-4 w-4 text-boa" /> Elimina</Button>
        </div>
      </div>
    </CardBody>
  )
}

const zone = ZONE.map((z) => ({ chiave: z.zona, label: z.nome }))

/** Form per creare un tavolo (nome = numero). */
function NuovoTavolo({ tavoli, onCrea }: { tavoli: Tavolo[]; onCrea: (numero: number, posti: number, zona: Tavolo['zona']) => void }) {
  const prossimo = (tavoli.reduce((max, t) => Math.max(max, t.numero), 0) || 0) + 1
  const [aperto, setAperto] = useState(false)
  const [numero, setNumero] = useState(prossimo)
  const [posti, setPosti] = useState(4)
  const [zona, setZona] = useState<Tavolo['zona']>('veranda')

  const salva = () => {
    if (!Number.isFinite(numero) || numero <= 0) return
    onCrea(Math.round(numero), Math.max(1, Math.round(posti)), zona)
    setAperto(false); setNumero(numero + 1); setPosti(4); setZona('veranda')
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => { setNumero((tavoli.reduce((m, t) => Math.max(m, t.numero), 0) || 0) + 1); setAperto(true) }}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-calce-300 py-2 text-sm text-profondo/60 hover:border-cabina hover:text-cabina"
      >
        <Plus className="h-4 w-4" /> Aggiungi tavolo
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-calce-200 bg-calce/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-profondo">Nuovo tavolo</span>
        <button type="button" onClick={() => setAperto(false)} className="grid h-7 w-7 place-content-center rounded-md text-profondo/45 hover:bg-white" aria-label="Chiudi"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Numero</span>
          <input type="number" min={1} value={numero} onChange={(e) => setNumero(Number(e.target.value))} className="num h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Posti</span>
          <input type="number" min={1} value={posti} onChange={(e) => setPosti(Number(e.target.value))} className="num h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Zona</span>
          <Select value={zona} onChange={(e) => setZona(e.target.value as Tavolo['zona'])} opzioni={zone.map((z) => ({ valore: z.chiave, etichetta: z.label }))} />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variante="primario" dimensione="sm" onClick={salva}><Check className="h-4 w-4" /> Aggiungi</Button>
      </div>
    </div>
  )
}
