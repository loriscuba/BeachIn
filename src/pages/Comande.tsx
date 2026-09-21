/**
 * Comande dall'ombrellone — servizio in spiaggia.
 * A sinistra si compone l'ordine (numero ombrellone + articoli del bar) e si
 * invia; a destra, al bar, arriva la coda delle comande con lo stato
 * (in attesa → in preparazione → consegnata). Dati statici in memoria
 * (context), pronti per il DB.
 */
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Minus, Send, Check, X, Umbrella, Coffee, Search } from 'lucide-react'
import type { ArticoloBar, CategoriaBar, Comanda, RigaComanda, StatoComanda } from '@/data/types'
import { getArticoliBar } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { euroCent, numero } from '@/lib/formatters'
import { etichetteCategoriaBar } from '@/lib/etichette'
import { cn } from '@/lib/cn'

const tonoStato: Record<StatoComanda, 'tenda' | 'stagionale' | 'acqua'> = {
  in_attesa: 'tenda', in_preparazione: 'stagionale', consegnata: 'acqua',
}
const etichettaStato: Record<StatoComanda, string> = {
  in_attesa: 'In attesa', in_preparazione: 'In preparazione', consegnata: 'Consegnata',
}

export default function Comande() {
  const { comande, inviaComanda, avanzaComanda, annullaComanda } = useDemoData()
  const [articoli, setArticoli] = useState<ArticoloBar[]>([])
  const [caricato, setCaricato] = useState(false)
  const [ombrellone, setOmbrellone] = useState('')
  const [note, setNote] = useState('')
  const [qta, setQta] = useState<Record<string, number>>({})
  const [filtro, setFiltro] = useState<CategoriaBar | 'tutte'>('tutte')
  const [cerca, setCerca] = useState('')
  const [inviata, setInviata] = useState(false)

  useEffect(() => {
    getArticoliBar().then((a) => { setArticoli(a); setCaricato(true) })
  }, [])

  const q = cerca.trim().toLowerCase()
  const mostrati = articoli.filter(
    (a) => (filtro === 'tutte' || a.categoria === filtro) && (q === '' || a.nome.toLowerCase().includes(q))
  )

  const righe: RigaComanda[] = useMemo(
    () =>
      articoli
        .filter((a) => (qta[a.id] ?? 0) > 0)
        .map((a) => ({ articoloId: a.id, nome: a.nome, quantita: qta[a.id], prezzoUnitario: a.prezzoVendita })),
    [articoli, qta]
  )
  const totale = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)
  const nPezzi = righe.reduce((s, r) => s + r.quantita, 0)
  const puoInviare = ombrellone.trim() !== '' && righe.length > 0

  const cambia = (id: string, delta: number) =>
    setQta((q) => {
      const v = Math.max(0, (q[id] ?? 0) + delta)
      const next = { ...q }
      if (v === 0) delete next[id]
      else next[id] = v
      return next
    })

  const invia = () => {
    if (!puoInviare) return
    inviaComanda(ombrellone, righe, note)
    setQta({}); setNote(''); setOmbrellone('')
    setInviata(true)
    window.setTimeout(() => setInviata(false), 3000)
  }

  const aperte = comande.filter((c) => c.stato !== 'consegnata').length

  if (!caricato) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Nuovo ordine dall'ombrellone */}
      <Card className="flex flex-col">
        <CardHeader
          titolo={<span className="inline-flex items-center gap-2"><Umbrella className="h-4 w-4 text-cabina" /> Nuovo ordine</span>}
          sottotitolo="Numero ombrellone + articoli del bar"
        />
        <CardBody className="flex flex-1 flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium text-profondo/60">Ombrellone</span>
              <input
                value={ombrellone}
                onChange={(e) => setOmbrellone(e.target.value)}
                placeholder="es. A-12"
                className="h-10 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring"
              />
            </label>
            <div className="w-40">
              <span className="mb-1 block text-xs font-medium text-profondo/60">Categoria</span>
              <Select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as CategoriaBar | 'tutte')}
                opzioni={[{ valore: 'tutte', etichetta: 'Tutte' }, ...Object.entries(etichetteCategoriaBar).map(([v, l]) => ({ valore: v, etichetta: l }))]}
              />
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-profondo/40" />
            <input
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
              placeholder="Cerca articolo…"
              className="h-9 w-full rounded-lg border border-calce-200 bg-white pl-9 pr-3 text-sm text-profondo focus-visible:focus-ring"
            />
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-calce-200 bg-calce/50 p-2">
            {mostrati.length === 0 && (
              <p className="py-6 text-center text-sm text-profondo/45">Nessun articolo trovato.</p>
            )}
            {mostrati.map((a) => {
              const n = qta[a.id] ?? 0
              return (
                <div key={a.id} className={cn('flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5', n > 0 ? 'border-cabina' : 'border-calce-200')}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-profondo">{a.nome}</p>
                    <p className="num text-xs text-profondo/55">{euroCent(a.prezzoVendita)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={() => cambia(a.id, -1)} disabled={n === 0} className="grid h-7 w-7 place-content-center rounded-md border border-calce-200 text-profondo/70 disabled:opacity-40 hover:bg-calce" aria-label={`Meno ${a.nome}`}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="num w-5 text-center text-sm font-semibold text-profondo">{n}</span>
                    <button type="button" onClick={() => cambia(a.id, 1)} className="grid h-7 w-7 place-content-center rounded-md border border-calce-200 text-profondo/70 hover:bg-calce" aria-label={`Più ${a.nome}`}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )
            })}
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (facoltative): es. senza ghiaccio"
            className="h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring"
          />

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-calce-200 pt-3">
            <div className="text-sm text-profondo/70">
              {nPezzi > 0 ? <>{numero(nPezzi)} articoli · <span className="num font-bold text-profondo">{euroCent(totale)}</span></> : 'Nessun articolo'}
            </div>
            <Button variante="primario" onClick={invia} disabled={!puoInviare}>
              <Send className="h-4 w-4" /> Invia al bar
            </Button>
          </div>
          {inviata && <p className="flex items-center gap-1.5 text-sm text-acqua"><Check className="h-4 w-4" /> Comanda inviata al bar.</p>}
        </CardBody>
      </Card>

      {/* Coda comande al bar */}
      <Card>
        <CardHeader
          titolo={<span className="inline-flex items-center gap-2"><Coffee className="h-4 w-4 text-cabina" /> Comande al bar</span>}
          sottotitolo="Ordini in arrivo dagli ombrelloni"
          azione={<Badge tono={aperte > 0 ? 'boa' : 'neutro'}>{aperte} da evadere</Badge>}
        />
        <CardBody className="space-y-2 pt-2">
          {comande.length === 0 && (
            <p className="py-10 text-center text-sm text-profondo/45">Nessuna comanda. Invia il primo ordine dall'ombrellone.</p>
          )}
          <div className="max-h-[30rem] space-y-2 overflow-y-auto pr-1">
            {comande.map((c) => (
              <ComandaCard key={c.id} comanda={c} onAvanza={() => avanzaComanda(c.id)} onAnnulla={() => annullaComanda(c.id)} />
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function ComandaCard({ comanda: c, onAvanza, onAnnulla }: { comanda: Comanda; onAvanza: () => void; onAnnulla: () => void }) {
  const consegnata = c.stato === 'consegnata'
  return (
    <div className={cn('rounded-xl border p-3', consegnata ? 'border-calce-200 bg-calce/40 opacity-70' : 'border-calce-200 bg-white')}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-profondo"><Umbrella className="h-4 w-4 text-cabina" /> {c.ombrellone || '—'}</span>
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
          {c.stato === 'in_attesa' && <Button variante="secondario" dimensione="sm" onClick={onAvanza}>Prendi in carico</Button>}
          {c.stato === 'in_preparazione' && <Button variante="primario" dimensione="sm" onClick={onAvanza}><Check className="h-4 w-4" /> Consegnata</Button>}
          {consegnata && <span className="inline-flex items-center gap-1 text-sm font-medium text-acqua"><Check className="h-4 w-4" /> Consegnata</span>}
        </div>
      </div>
    </div>
  )
}
