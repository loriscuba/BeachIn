/**
 * Comande dall'ombrellone — servizio in spiaggia.
 * A sinistra si compone l'ordine (numero ombrellone + articoli del bar) e si
 * invia; a destra, al bar, arriva la coda delle comande con lo stato
 * (nuova → presa in carico → in preparazione → pronta). Le comande arrivano anche
 * da ComandApp (`/comandapp`, app del bagnante): all'arrivo suona il campanello.
 * Con il modulo Bar al tavolo la coda è unica: ci sono anche le bevande dei tavoli del ristorante.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Minus, Send, Check, Umbrella, Coffee, Search, Bell, BellOff, Smartphone, ExternalLink, Copy } from 'lucide-react'
import type { CategoriaBar, RigaComanda } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import CodaBar, { ComandaCard } from './sala/CodaBar'
import { codaBar } from '@/lib/sala'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { euroCent, numero } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { QrCodice } from '@/components/QrCodice'
import { supabaseAttivo } from '@/lib/supabase'
import { campanello, sbloccaAudio } from '@/lib/suoni'
import { urlComandApp, UTENTI_COMANDAPP } from '@/lib/comandapp'

export default function Comande() {
  const { comande, comandeSala, inviaComanda, avanzaComanda, annullaComanda, articoliBar, sezioniBar } = useDemoData()
  const unica = useModuli().moduloAttivo('bar-tavolo')
  // stesso listino di ComandApp: solo gli articoli disponibili, nell'ordine delle categorie
  const articoli = useMemo(
    () => sezioniBar.flatMap((s) => articoliBar.filter((a) => a.categoria === s.id && a.disponibile !== false)),
    [articoliBar, sezioniBar]
  )
  const [ombrellone, setOmbrellone] = useState('')
  const [note, setNote] = useState('')
  const [qta, setQta] = useState<Record<string, number>>({})
  const [filtro, setFiltro] = useState<CategoriaBar | 'tutte'>('tutte')
  const [cerca, setCerca] = useState('')
  const [inviata, setInviata] = useState(false)
  const [suoni, setSuoni] = useState(false)
  const [copiato, setCopiato] = useState(false)
  const link = urlComandApp()

  // Campanello quando arriva una comanda nuova (es. da ComandApp in un'altra scheda).
  const visti = useRef(new Set(comande.map((c) => c.id)))
  useEffect(() => {
    const nuove = comande.filter((c) => !visti.current.has(c.id))
    nuove.forEach((c) => visti.current.add(c.id))
    if (suoni && !unica && nuove.some((c) => c.stato === 'in_attesa')) campanello()
  }, [comande, suoni, unica])

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

  const aperte = unica ? codaBar(comande, comandeSala).daFare.length : comande.filter((c) => c.stato !== 'pronta').length

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <QrCodice url={link} className="w-20 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-2 font-semibold text-profondo"><Smartphone className="h-4 w-4 text-cabina" /> ComandApp — l'app del bagnante</p>
            <p className="break-all text-xs text-profondo/55">{link}</p>
            <p className={cn('mt-1 text-xs font-medium', supabaseAttivo ? 'text-acqua' : 'text-tenda')}>{supabaseAttivo ? '● Supabase: ordini condivisi tra tutti i dispositivi' : '● Modalità demo: ordini condivisi solo tra schede di questo browser'}</p>
            <p className="mt-1 text-xs text-profondo/55">Accesso demo: {UTENTI_COMANDAPP.map((u) => `${u.utente} / ${u.password}`).join(' · ')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button dimensione="sm" onClick={() => { navigator.clipboard?.writeText(link); setCopiato(true); window.setTimeout(() => setCopiato(false), 2000) }}><Copy className="h-4 w-4" /> {copiato ? 'Copiato!' : 'Copia link'}</Button>
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-calce-200 px-3 py-1.5 text-sm font-medium text-profondo hover:bg-calce/50"><ExternalLink className="h-4 w-4" /> Apri</a>
            <Button dimensione="sm" variante={suoni ? 'primario' : 'secondario'} onClick={() => { if (!suoni) { sbloccaAudio(); campanello() } setSuoni(!suoni) }}>
              {suoni ? <><Bell className="h-4 w-4" /> Suoni attivi</> : <><BellOff className="h-4 w-4" /> Attiva suoni</>}
            </Button>
          </div>
        </CardBody>
      </Card>
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
                opzioni={[{ valore: 'tutte', etichetta: 'Tutte' }, ...sezioniBar.map((s) => ({ valore: s.id, etichetta: s.nome }))]}
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
          sottotitolo={unica ? 'Coda unica: ombrelloni e tavoli del ristorante' : 'Ordini in arrivo dagli ombrelloni'}
          azione={<Badge tono={aperte > 0 ? 'boa' : 'neutro'}>{aperte} da evadere</Badge>}
        />
        <CardBody className="space-y-2 pt-2">
          {unica ? <div className="max-h-[30rem] overflow-y-auto pr-1"><CodaBar compatta suoni={suoni} /></div> : <>
          {comande.length === 0 && (
            <p className="py-10 text-center text-sm text-profondo/45">Nessuna comanda. Invia il primo ordine dall'ombrellone.</p>
          )}
          <div className="max-h-[30rem] space-y-2 overflow-y-auto pr-1">
            {comande.map((c) => (
              <ComandaCard key={c.id} comanda={c} onAvanza={() => avanzaComanda(c.id)} onAnnulla={() => annullaComanda(c.id)} />
            ))}
          </div>
          </>}
        </CardBody>
      </Card>
    </div>
    </div>
  )
}
