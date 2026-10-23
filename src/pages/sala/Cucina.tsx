/**
 * Cucina: le comande del ristorante (dal cameriere o dal tablet al tavolo) in tre colonne
 * Da fare → In lavorazione → Pronte. Dentro ogni comanda i piatti sono divisi per uscita: si segnano
 * pronti uno per uno (tocco) o tutta l'uscita; le uscite senza il «via» del cameriere restano in grigio.
 * Campanello a ogni comanda nuova, minuti di attesa sulla scheda.
 */
import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Check, ChefHat, Clock, Hourglass, Tablet, Users, X } from 'lucide-react'
import type { ComandaSala, StatoComandaSala } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabaseAttivo } from '@/lib/supabase'
import { campanello, sbloccaAudio } from '@/lib/suoni'
import { cn } from '@/lib/cn'
import { azioneStatoSala, minutiDa, nomeUscita, usciteDi } from '@/lib/sala'

const COLONNE: { stato: StatoComandaSala; titolo: string; colore: string }[] = [
  { stato: 'inviata', titolo: 'Da fare', colore: 'bg-boa' },
  { stato: 'in_preparazione', titolo: 'In lavorazione', colore: 'bg-tenda' },
  { stato: 'pronta', titolo: 'Pronte da servire', colore: 'bg-acqua' },
]

export default function Cucina() {
  const { comandeSala, avanzaComandaSala, annullaComandaSala, segnaRigheSala, chiamaUscitaSala } = useDemoData()
  const [suoni, setSuoni] = useState(false)
  const [ora, setOra] = useState(Date.now())
  // su telefono si vede una colonna alla volta (tablet e computer: tutte e tre)
  const [colonna, setColonna] = useState<StatoComandaSala>('inviata')
  useEffect(() => { const t = window.setInterval(() => setOra(Date.now()), 30000); return () => window.clearInterval(t) }, [])

  // campanello quando arriva una comanda nuova (anche da un altro dispositivo)
  const visti = useRef(new Set(comandeSala.map((c) => c.id)))
  useEffect(() => {
    const nuove = comandeSala.filter((c) => !visti.current.has(c.id))
    nuove.forEach((c) => visti.current.add(c.id))
    if (suoni && nuove.some((c) => c.stato === 'inviata')) campanello()
  }, [comandeSala, suoni])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className={cn('text-xs font-medium', supabaseAttivo ? 'text-acqua' : 'text-tenda')}>
          {supabaseAttivo ? '● Comande condivise tra tutti i dispositivi (sala, tablet, cucina)' : '● Modalità demo: comande condivise solo tra schede di questo browser'}
        </p>
        <Button dimensione="sm" className="ml-auto" variante={suoni ? 'primario' : 'secondario'} onClick={() => { if (!suoni) { sbloccaAudio(); campanello() } setSuoni(!suoni) }}>
          {suoni ? <><Bell className="h-4 w-4" /> Campanello attivo</> : <><BellOff className="h-4 w-4" /> Attiva campanello</>}
        </Button>
      </div>
      <div className="grid grid-cols-3 rounded-xl bg-white p-1 text-[13px] font-semibold shadow-sm md:hidden">
        {COLONNE.map((col) => {
          const n = comandeSala.filter((c) => c.stato === col.stato).length
          return (
            <button key={col.stato} type="button" onClick={() => setColonna(col.stato)}
              className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg py-2', colonna === col.stato ? 'bg-profondo text-white' : 'text-profondo/60')}>
              <span className={cn('h-2 w-2 rounded-full', col.colore)} />{col.titolo.replace(' da servire', '')}<span className="num opacity-70">{n}</span>
            </button>
          )
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {COLONNE.map((col) => {
          // in cucina si lavora dalla più vecchia
          const lista = comandeSala.filter((c) => c.stato === col.stato).sort((a, b) => a.ts - b.ts)
          return (
            <section key={col.stato} className={cn('space-y-3', colonna !== col.stato && 'hidden md:block')}>
              <h3 className="hidden items-center gap-2 text-sm font-semibold text-profondo md:flex">
                <span className={cn('h-2.5 w-2.5 rounded-full', col.colore)} /> {col.titolo}
                <span className="num text-profondo/45">{lista.length}</span>
              </h3>
              {!lista.length && <p className="rounded-2xl border border-dashed border-calce-300 p-6 text-center text-sm text-profondo/45">Niente qui</p>}
              {lista.map((c) => <SchedaComanda key={c.id} c={c} ora={ora} onAvanza={() => avanzaComandaSala(c.id)} onSegna={(indici, pronta) => segnaRigheSala(c.id, indici, pronta ? 'pronta' : 'attesa')} onVia={(n) => chiamaUscitaSala(c.id, n)} onAnnulla={() => { if (confirm(`Annullare la comanda del tavolo ${c.tavolo}?`)) annullaComandaSala(c.id) }} />)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function SchedaComanda({ c, ora, onAvanza, onSegna, onVia, onAnnulla }: {
  c: ComandaSala; ora: number; onAvanza: () => void; onSegna: (indici: number[], pronta: boolean) => void; onVia: (n: number) => void; onAnnulla: () => void
}) {
  const min = minutiDa(c.ts, ora)
  const uscite = usciteDi(c)
  return (
    <Card className={cn('overflow-hidden', c.stato === 'inviata' && min >= 10 && 'ring-2 ring-boa/60')}>
      <div className="flex items-center gap-2 border-b border-calce-200 px-4 py-2.5">
        <span className="font-display text-2xl font-semibold text-profondo">Tavolo {c.tavolo}</span>
        {c.coperti && <span className="inline-flex items-center gap-1 text-xs text-profondo/55"><Users className="h-3.5 w-3.5" />{c.coperti}</span>}
        <span className={cn('num ml-auto inline-flex items-center gap-1 text-xs font-semibold', min >= 15 ? 'text-boa' : 'text-profondo/55')}><Clock className="h-3.5 w-3.5" />{c.ora} · {min}′</span>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm">
        {uscite.map((u) => {
          const daFare = u.righe.filter(({ r }) => (r.stato ?? 'attesa') === 'attesa').map(({ i }) => i)
          return (
            <div key={u.n} className={cn('rounded-xl border px-2.5 py-2', !u.chiamata ? 'border-dashed border-calce-300 text-profondo/50' : u.stato === 'attesa' ? 'border-calce-200' : 'border-acqua/40 bg-acqua/5')}>
              <div className="mb-1 flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-profondo/55">{nomeUscita(u.n)}</p>
                {!u.chiamata && (
                  <button type="button" onClick={() => onVia(u.n)} title="Inizia comunque questa uscita" className="inline-flex items-center gap-1 rounded-full px-1.5 text-[11px] text-profondo/60 hover:bg-calce/60">
                    <Hourglass className="h-3 w-3" /> aspetta il via
                  </button>
                )}
                {u.stato === 'servita' && <span className="text-[11px] text-profondo/45">servita</span>}
                {u.chiamata && daFare.length > 0 && (
                  <button type="button" onClick={() => onSegna(daFare, true)} className="ml-auto rounded-full bg-acqua/20 px-3 py-1 text-xs font-semibold text-profondo hover:bg-acqua/35">Uscita pronta</button>
                )}
              </div>
              {u.righe.map(({ r, i }) => {
                const st = r.stato ?? 'attesa'
                const tocca = u.chiamata && st !== 'servita'
                return (
                  <button key={i} type="button" disabled={!tocca} onClick={() => onSegna([i], st === 'attesa')}
                    className={cn('flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left', tocca && 'hover:bg-calce/50', st !== 'attesa' && 'text-profondo/45')}>
                    <span className={cn('grid h-5 w-5 shrink-0 place-content-center rounded-md border', st === 'attesa' ? 'border-calce-300' : 'border-acqua bg-acqua text-white')}>
                      {st !== 'attesa' && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn('min-w-0 flex-1', st === 'servita' && 'line-through')}><span className="num mr-1.5 font-bold text-cabina">{r.quantita}×</span>{r.nome}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
        {c.note && <p className="rounded-lg bg-tenda/20 px-2.5 py-1.5 text-profondo">📝 {c.note}</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-calce-200 px-4 py-2.5">
        {c.origine === 'self' ? <Badge tono="mare"><Tablet className="h-3 w-3" /> Tablet al tavolo</Badge> : <Badge tono="neutro"><ChefHat className="h-3 w-3" /> {c.cameriere ?? 'Sala'}</Badge>}
        <button type="button" onClick={onAnnulla} className="ml-auto grid h-8 w-8 place-content-center rounded-lg text-profondo/35 hover:bg-boa/10 hover:text-boa" aria-label="Annulla comanda" title="Annulla comanda"><X className="h-4 w-4" /></button>
        {azioneStatoSala[c.stato] && <Button dimensione="sm" variante="primario" onClick={onAvanza}>{azioneStatoSala[c.stato]}</Button>}
      </div>
    </Card>
  )
}
