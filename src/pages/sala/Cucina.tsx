/**
 * Cucina e Bar: stessa schermata a tre colonne Da fare → In lavorazione → Pronte (prop `reparto`).
 * Dentro ogni comanda i piatti sono divisi per uscita: «Inizia preparazione» li mette in lavorazione, poi si segnano
 * pronti uno per uno (tocco) o tutta l'uscita; le uscite senza il «via» del cameriere restano in grigio.
 * Ogni reparto vede solo le sue righe (`perReparto`). Al bar (modulo Bar al tavolo) nelle stesse colonne ci sono anche
 * le comande dagli ombrelloni: nuova = Da fare, presa in carico/in preparazione = In lavorazione, pronta = Pronte.
 * Campanello a ogni comanda nuova, minuti di attesa sulla scheda.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BellOff, Check, ChefHat, Clock, Hourglass, Tablet, Users, X } from 'lucide-react'
import type { Comanda, ComandaSala, StatoComandaSala } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabaseAttivo } from '@/lib/supabase'
import { campanello, sbloccaAudio } from '@/lib/suoni'
import { cn } from '@/lib/cn'
import { azioneStatoSala, daPreparare, minutiDa, nomeUscita, perReparto, statoRiga, uscitaChiamata, uscitaDi, usciteDi, type Reparto } from '@/lib/sala'
import { ComandaCard } from './ComandaOmbrellone'

const COLONNE: { stato: StatoComandaSala; titolo: string; colore: string }[] = [
  { stato: 'inviata', titolo: 'Da fare', colore: 'bg-boa' },
  { stato: 'in_preparazione', titolo: 'In lavorazione', colore: 'bg-tenda' },
  { stato: 'pronta', titolo: 'Pronte da servire', colore: 'bg-acqua' },
]

/** Una scheda nelle colonne: comanda del ristorante vista dal reparto, oppure (al bar) comanda dall'ombrellone. */
type Voce = { tipo: 'tavolo'; stato: StatoComandaSala; ts: number; c: ComandaSala; indici: number[] } | { tipo: 'ombrellone'; stato: StatoComandaSala; ts: number; c: Comanda }
const colonnaOmbrellone = (c: Comanda): StatoComandaSala => (c.stato === 'in_attesa' ? 'inviata' : c.stato === 'pronta' ? 'pronta' : 'in_preparazione')

export default function Cucina({ reparto = 'cucina' }: { reparto?: Reparto }) {
  const { comandeSala, comande, avanzaComanda, annullaComanda, annullaComandaSala, segnaRigheSala, chiamaUscitaSala } = useDemoData()
  const [suoni, setSuoni] = useState(false)
  const [ora, setOra] = useState(Date.now())
  // su telefono si vede una colonna alla volta (tablet e computer: tutte e tre)
  const [colonna, setColonna] = useState<StatoComandaSala>('inviata')
  useEffect(() => { const t = window.setInterval(() => setOra(Date.now()), 30000); return () => window.clearInterval(t) }, [])
  const voci = useMemo(() => {
    const tavoli: Voce[] = comandeSala.flatMap((c) => {
      const v = perReparto(c, reparto)
      return v && v.c.stato !== 'servita' ? [{ tipo: 'tavolo' as const, stato: v.c.stato, ts: c.ts, c: v.c, indici: v.indici }] : []
    })
    // al bar anche gli ombrelloni; delle pronte restano le ultime 12 non ancora incassate
    const ombrelloni: Voce[] = reparto !== 'bar' ? [] : comande.filter((c) => !c.pagata).map((c) => ({ tipo: 'ombrellone' as const, stato: colonnaOmbrellone(c), ts: c.ts ?? 0, c }))
    const pronti = new Set(ombrelloni.filter((v) => v.stato === 'pronta').sort((a, b) => b.ts - a.ts).slice(0, 12))
    return [...tavoli, ...ombrelloni.filter((v) => v.stato !== 'pronta' || pronti.has(v))]
  }, [comandeSala, comande, reparto])

  // campanello quando arriva una comanda nuova da fare (anche da un altro dispositivo)
  const chiave = (v: Voce) => `${v.tipo}-${v.c.id}`
  const visti = useRef(new Set(voci.map(chiave)))
  useEffect(() => {
    const nuove = voci.filter((v) => !visti.current.has(chiave(v)))
    nuove.forEach((v) => visti.current.add(chiave(v)))
    if (suoni && nuove.some((v) => v.stato === 'inviata')) campanello()
  }, [voci, suoni])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className={cn('text-xs font-medium', supabaseAttivo ? 'text-acqua' : 'text-tenda')}>
          {supabaseAttivo
            ? reparto === 'bar' ? '● Coda unica del bar: tavoli del ristorante e ombrelloni, su tutti i dispositivi' : '● Comande condivise tra tutti i dispositivi (sala, tablet, cucina)'
            : '● Modalità demo: comande condivise solo tra schede di questo browser'}
        </p>
        <Button dimensione="sm" className="ml-auto" variante={suoni ? 'primario' : 'secondario'} onClick={() => { if (!suoni) { sbloccaAudio(); campanello() } setSuoni(!suoni) }}>
          {suoni ? <><Bell className="h-4 w-4" /> Campanello attivo</> : <><BellOff className="h-4 w-4" /> Attiva campanello</>}
        </Button>
      </div>
      <div className="grid grid-cols-3 rounded-xl bg-white p-1 text-[13px] font-semibold shadow-sm md:hidden">
        {COLONNE.map((col) => {
          const n = voci.filter((v) => v.stato === col.stato).length
          return (
            <button key={col.stato} type="button" onClick={() => setColonna(col.stato)}
              className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg py-2', colonna === col.stato ? 'bg-profondo text-white' : 'text-profondo/60')}>
              <span className={cn('h-2 w-2 rounded-full', col.colore)} />{col.titolo.replace(' da servire', '')}<span className="num opacity-70">{n}</span>
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLONNE.map((col) => {
          // si lavora dalla più vecchia; le pronte dalla più recente
          const lista = voci.filter((v) => v.stato === col.stato).sort((a, b) => (col.stato === 'pronta' ? b.ts - a.ts : a.ts - b.ts))
          return (
            <section key={col.stato} className={cn('min-w-0 space-y-3', colonna !== col.stato && 'hidden md:block')}>
              <h3 className="hidden items-center gap-2 text-sm font-semibold text-profondo md:flex">
                <span className={cn('h-2.5 w-2.5 rounded-full', col.colore)} /> {col.titolo}
                <span className="num text-profondo/45">{lista.length}</span>
              </h3>
              {!lista.length && <p className="rounded-2xl border border-dashed border-calce-300 p-6 text-center text-sm text-profondo/45">Niente qui</p>}
              {lista.map((v) => v.tipo === 'ombrellone'
                ? <ComandaCard key={chiave(v)} comanda={v.c} onAvanza={() => avanzaComanda(v.c.id)} onAnnulla={() => annullaComanda(v.c.id)} />
                : <SchedaComanda key={chiave(v)} c={v.c} ora={ora} {...azioniTavolo(v.c, v.indici, segnaRigheSala)} onVia={(n) => chiamaUscitaSala(v.c.id, n)}
                    // al bar niente X: annullerebbe anche i piatti della cucina
                    onAnnulla={reparto === 'bar' ? undefined : () => { if (confirm(`Annullare la comanda del tavolo ${v.c.tavolo}?`)) annullaComandaSala(v.c.id) }} />)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Azioni sulla vista di un reparto: gli indici della vista si traducono in quelli della comanda (`orig`).
 * Avanza: Da fare → i piatti chiamati in lavorazione; Pronte → servito tutto il pronto.
 */
export function azioniTavolo(c: ComandaSala, orig: number[], segna: (id: string, indici: number[], stato: 'preparazione' | 'pronta' | 'servita') => void) {
  const tutti = (filtro: (st: string, i: number) => boolean) => c.righe.flatMap((r, i) => (filtro(statoRiga(c, r), i) ? [orig[i]] : []))
  return {
    onAvanza: () => (c.stato === 'inviata'
      ? segna(c.id, tutti((st, i) => st === 'attesa' && uscitaChiamata(c, uscitaDi(c.righe[i]))), 'preparazione')
      : segna(c.id, tutti((st) => st === 'pronta'), 'servita')),
    onSegna: (indici: number[], pronta: boolean) => segna(c.id, indici.map((i) => orig[i]), pronta ? 'pronta' : 'preparazione'),
  }
}

export function SchedaComanda({ c, ora, onAvanza, onSegna, onVia, onAnnulla }: {
  c: ComandaSala; ora: number; onAvanza: () => void; onSegna: (indici: number[], pronta: boolean) => void; onVia: (n: number) => void; onAnnulla?: () => void
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
          const daFare = u.righe.filter(({ r }) => daPreparare(statoRiga(c, r))).map(({ i }) => i)
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
                const st = statoRiga(c, r)
                const fare = daPreparare(st)
                const tocca = u.chiamata && st !== 'servita'
                return (
                  <button key={i} type="button" disabled={!tocca} onClick={() => onSegna([i], fare)}
                    className={cn('flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left', tocca && 'hover:bg-calce/50', !fare && 'text-profondo/45')}>
                    <span className={cn('grid h-5 w-5 shrink-0 place-content-center rounded-md border', !fare ? 'border-acqua bg-acqua text-white' : st === 'preparazione' ? 'border-tenda bg-tenda/20' : 'border-calce-300')}>
                      {!fare && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn('min-w-0 flex-1', st === 'servita' && 'line-through')}><span className="num mr-1.5 font-bold text-cabina">{r.quantita}×</span>{r.nome}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
        {c.stato !== 'inviata' && <p className="text-center text-[11px] text-profondo/45">Tocca un piatto per segnarlo pronto: il cameriere decide se portarlo subito</p>}
        {c.note && <p className="rounded-lg bg-tenda/20 px-2.5 py-1.5 text-profondo">📝 {c.note}</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-calce-200 px-4 py-2.5">
        {c.origine === 'self' ? <Badge tono="mare"><Tablet className="h-3 w-3" /> Tablet al tavolo</Badge> : <Badge tono="neutro"><ChefHat className="h-3 w-3" /> {c.cameriere ?? 'Sala'}</Badge>}
        <span className="ml-auto" />
        {onAnnulla && <button type="button" onClick={onAnnulla} className="grid h-8 w-8 place-content-center rounded-lg text-profondo/35 hover:bg-boa/10 hover:text-boa" aria-label="Annulla comanda" title="Annulla comanda"><X className="h-4 w-4" /></button>}
        {azioneStatoSala[c.stato] && <Button dimensione="sm" variante="primario" onClick={onAvanza}>{azioneStatoSala[c.stato]}</Button>}
      </div>
    </Card>
  )
}
