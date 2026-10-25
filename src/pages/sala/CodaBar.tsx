/**
 * Coda unica del bar (modulo Bar al tavolo): in una sola lista, dalla più vecchia, le comande dagli ombrelloni
 * (ComandApp e banco) e le bevande ordinate ai tavoli del ristorante (cameriere o tablet self).
 * Gli ombrelloni avanzano di stato come in Comande; per i tavoli il barista segna pronta la singola bevanda
 * (tocco) o tutte, e il cameriere la vede «pronto» nel già ordinato. `ComandaCard` è usata anche da Comande.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BellOff, Check, ChefHat, Clock, Coffee, Hourglass, Tablet, Umbrella, X } from 'lucide-react'
import type { Comanda, ComandaSala, StatoComanda } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { euroCent } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { supabaseAttivo } from '@/lib/supabase'
import { campanello, sbloccaAudio } from '@/lib/suoni'
import { etichettaStatoComanda as etichettaStato } from '@/lib/comandapp'
import { codaBar, minutiDa, nomeUscita, perReparto, righeBarDaFare, statoRiga, uscitaChiamata, uscitaDi, type VoceBar } from '@/lib/sala'

const tonoStato: Record<StatoComanda, 'boa' | 'tenda' | 'stagionale' | 'acqua'> = {
  in_attesa: 'boa', presa_in_carico: 'tenda', in_preparazione: 'stagionale', pronta: 'acqua',
}
const azione: Partial<Record<StatoComanda, string>> = {
  in_attesa: 'Prendi in carico', presa_in_carico: 'Inizia preparazione', in_preparazione: 'Pronta',
}


/** `compatta`: solo l'elenco (dentro la pagina Comande, che ha già il suo bottone del campanello: `suoni`). */
export default function CodaBar({ compatta = false, suoni: suoniFuori = false }: { compatta?: boolean; suoni?: boolean }) {
  const { comande, comandeSala } = useDemoData()
  const { daFare, pronte } = useMemo(() => codaBar(comande, comandeSala), [comande, comandeSala])
  const [suoniQui, setSuoni] = useState(false)
  const suoni = compatta ? suoniFuori : suoniQui
  const [ora, setOra] = useState(Date.now())
  useEffect(() => { const t = window.setInterval(() => setOra(Date.now()), 30000); return () => window.clearInterval(t) }, [])

  // campanello a ogni voce nuova da preparare (ombrellone o tavolo, anche da un altro dispositivo)
  const chiave = (v: VoceBar) => `${v.tipo}-${v.c.id}`
  const visti = useRef(new Set(daFare.map(chiave)))
  useEffect(() => {
    const nuove = daFare.filter((v) => !visti.current.has(chiave(v)))
    nuove.forEach((v) => visti.current.add(chiave(v)))
    if (suoni && nuove.length) campanello()
  }, [daFare, suoni])

  const elenco = (lista: VoceBar[], vuoto: string) => (
    <div className="space-y-2">
      {!lista.length && <p className="rounded-2xl border border-dashed border-calce-300 p-6 text-center text-sm text-profondo/45">{vuoto}</p>}
      {lista.map((v) => <SchedaVoce key={chiave(v)} v={v} ora={ora} />)}
    </div>
  )

  if (compatta) return <div className="space-y-2">{elenco(daFare, 'Niente da preparare.')}{pronte.length > 0 && <><p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">Pronte</p>{elenco(pronte, '')}</>}</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className={cn('text-xs font-medium', supabaseAttivo ? 'text-acqua' : 'text-tenda')}>
          {supabaseAttivo ? '● Coda unica: tavoli del ristorante e ombrelloni, su tutti i dispositivi' : '● Modalità demo: coda condivisa solo tra schede di questo browser'}
        </p>
        <Button dimensione="sm" className="ml-auto" variante={suoni ? 'primario' : 'secondario'} onClick={() => { if (!suoni) { sbloccaAudio(); campanello() } setSuoni(!suoni) }}>
          {suoni ? <><Bell className="h-4 w-4" /> Campanello attivo</> : <><BellOff className="h-4 w-4" /> Attiva campanello</>}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="min-w-0 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-profondo"><span className="h-2.5 w-2.5 rounded-full bg-boa" /> Da preparare <span className="num text-profondo/45">{daFare.length}</span></h3>
          {elenco(daFare, 'Niente da preparare')}
        </section>
        <section className="min-w-0 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-profondo"><span className="h-2.5 w-2.5 rounded-full bg-acqua" /> Pronte <span className="num text-profondo/45">{pronte.length}</span></h3>
          {elenco(pronte, 'Ancora niente di pronto')}
        </section>
      </div>
    </div>
  )
}

function SchedaVoce({ v, ora }: { v: VoceBar; ora: number }) {
  const { avanzaComanda, annullaComanda } = useDemoData()
  if (v.tipo === 'ombrellone') return <ComandaCard comanda={v.c} onAvanza={() => avanzaComanda(v.c.id)} onAnnulla={() => annullaComanda(v.c.id)} />
  return <SchedaTavolo c={v.c} ora={ora} />
}

/** Bevande di un tavolo: tocco = pronta (o di nuovo da fare), «Tutto pronto» per tutte. */
function SchedaTavolo({ c, ora }: { c: ComandaSala; ora: number }) {
  const { segnaRigheSala } = useDemoData()
  const vista = perReparto(c, 'bar')
  if (!vista) return null
  const daFare = righeBarDaFare(c)
  const min = minutiDa(c.ts, ora)
  return (
    <div className={cn('rounded-xl border bg-white p-3', daFare.length ? 'border-calce-200' : 'border-calce-200 bg-calce/40 opacity-70', daFare.length > 0 && min >= 10 && 'ring-2 ring-boa/50')}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-profondo">
          <Coffee className="h-4 w-4 text-cabina" /> Tavolo {c.tavolo}
          {c.origine === 'self' ? <Badge tono="mare"><Tablet className="h-3 w-3" /> Tablet</Badge> : <span className="inline-flex items-center gap-1 text-xs font-normal text-profondo/50"><ChefHat className="h-3 w-3" />{c.cameriere ?? 'Sala'}</span>}
        </span>
        <span className={cn('num inline-flex items-center gap-1 text-xs', min >= 15 && daFare.length ? 'font-semibold text-boa' : 'text-profondo/45')}><Clock className="h-3.5 w-3.5" />{c.ora} · {min}′</span>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm">
        {vista.indici.map((i) => {
          const r = c.righe[i]
          const st = statoRiga(c, r)
          const chiamata = uscitaChiamata(c, uscitaDi(r))
          return (
            <li key={i}>
              <button type="button" disabled={st === 'servita'} onClick={() => segnaRigheSala(c.id, [i], st === 'attesa' ? 'pronta' : 'attesa')}
                className={cn('flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-calce/50', st !== 'attesa' && 'text-profondo/45', !chiamata && st === 'attesa' && 'text-profondo/50')}>
                <span className={cn('grid h-5 w-5 shrink-0 place-content-center rounded-md border', st === 'attesa' ? 'border-calce-300' : 'border-acqua bg-acqua text-white')}>{st !== 'attesa' && <Check className="h-3.5 w-3.5" />}</span>
                <span className={cn('min-w-0 flex-1', st === 'servita' && 'line-through')}><span className="num mr-1.5 font-bold text-cabina">{r.quantita}×</span>{r.nome}</span>
                {!chiamata && st === 'attesa' && <span className="inline-flex shrink-0 items-center gap-1 text-[11px]"><Hourglass className="h-3 w-3" /> {nomeUscita(uscitaDi(r))}, aspetta il via</span>}
                {st === 'servita' && <span className="text-[11px]">servita</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {c.note && <p className="mt-1 text-xs italic text-profondo/55">Note: {c.note}</p>}
      {daFare.length > 0 && (
        <div className="mt-2 flex justify-end border-t border-calce-200 pt-2">
          <Button variante="primario" dimensione="sm" onClick={() => segnaRigheSala(c.id, daFare, 'pronta')}><Check className="h-4 w-4" /> Tutto pronto</Button>
        </div>
      )}
    </div>
  )
}

export function ComandaCard({ comanda: c, onAvanza, onAnnulla }: { comanda: Comanda; onAvanza: () => void; onAnnulla: () => void }) {
  const consegnata = c.stato === 'pronta'
  return (
    <div className={cn('rounded-xl border p-3', consegnata ? 'border-calce-200 bg-calce/40 opacity-70' : 'border-calce-200 bg-white')}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-profondo"><Umbrella className="h-4 w-4 text-cabina" /> {c.ombrellone || '—'}{c.origine === 'app' && <Badge tono="mare">App</Badge>}{c.cliente && <span className="text-xs font-normal text-profondo/50">{c.cliente}</span>}</span>
        <div className="flex items-center gap-2">
          <span className="num text-xs text-profondo/45">{c.ora}</span>
          <Badge tono={tonoStato[c.stato]} puntino>{etichettaStato[c.stato]}</Badge>
        </div>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm text-profondo/80">
        {c.righe.map((r) => (
          <li key={r.articoloId} className="flex justify-between gap-2">
            <span><span className="num font-semibold">{r.quantita}×</span> {r.nome}</span>
            <span className="num text-profondo/55">{euroCent(r.quantita * r.prezzoUnitario)}</span>
          </li>
        ))}
      </ul>
      {c.note && <p className="mt-1 text-xs italic text-profondo/55">Note: {c.note}</p>}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-calce-200 pt-2">
        <span className="num text-sm font-bold text-profondo">{euroCent(c.totale)}</span>
        <div className="flex items-center gap-2">
          {!consegnata && (
            <button type="button" onClick={onAnnulla} className="grid h-8 w-8 place-content-center rounded-lg text-profondo/45 hover:bg-boa/10 hover:text-boa" title="Annulla comanda" aria-label="Annulla comanda"><X className="h-4 w-4" /></button>
          )}
          {azione[c.stato] && <Button variante={c.stato === 'in_preparazione' ? 'primario' : 'secondario'} dimensione="sm" onClick={onAvanza}>{c.stato === 'in_preparazione' && <Check className="h-4 w-4" />} {azione[c.stato]}</Button>}
          {consegnata && <span className="inline-flex items-center gap-1 text-sm font-medium text-acqua"><Check className="h-4 w-4" /> Pronta</span>}
        </div>
      </div>
    </div>
  )
}
