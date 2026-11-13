/**
 * Pezzi della vecchia pagina Comande (ombrelloni), ora dentro Monitor Bar:
 * - `FormComandaOmbrellone`: lo staff inserisce a mano un ordine dall'ombrellone (numero + articoli del bar);
 * - `CartaComandApp`: QR e link dell'app del bagnante;
 * - `StrumentiOmbrelloni`: i due pulsanti in testa al Monitor Bar che aprono le finestre (?nuova=1 apre subito il modulo).
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Minus, Send, Check, Search, Smartphone, ExternalLink, Copy, Umbrella, QrCode } from 'lucide-react'
import type { CategoriaBar, RigaComanda } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { useSessione } from '@/context/SessioneContext'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { euroCent, numero } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { QrCodice } from '@/components/QrCodice'
import { supabaseAttivo } from '@/lib/supabase'
import { urlComandApp, UTENTI_COMANDAPP } from '@/lib/comandapp'

export function FormComandaOmbrellone({ onInviata }: { onInviata?: () => void }) {
  const { inviaComanda, articoliBar, sezioniBar } = useDemoData()
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
    onInviata?.()
  }

  return (
  <div className="flex flex-1 flex-col gap-3">
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
  </div>
  )
}

export function CartaComandApp() {
  const [copiato, setCopiato] = useState(false)
  const link = urlComandApp()
  return (
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
        </div>
      </CardBody>
    </Card>
  )
}

export function StrumentiOmbrelloni() {
  const { moduloAttivo } = useModuli()
  const { puo } = useSessione()
  const [params, setParams] = useSearchParams()
  const [nuova, setNuova] = useState(false)
  const [app, setApp] = useState(false)
  const conOmbrelloni = moduloAttivo('comande') && puo('comande')

  // la scorciatoia "Nuova comanda" e i vecchi link /comande arrivano con ?nuova=1
  useEffect(() => {
    if (params.get('nuova') !== '1') return
    if (conOmbrelloni) setNuova(true)
    const p = new URLSearchParams(params); p.delete('nuova'); setParams(p, { replace: true })
  }, [params, setParams, conOmbrelloni])

  if (!conOmbrelloni) return null
  return (
    <>
      <Button dimensione="sm" variante="primario" onClick={() => setNuova(true)}><Umbrella className="h-4 w-4" /> Nuova comanda</Button>
      <Button dimensione="sm" onClick={() => setApp(true)}><QrCode className="h-4 w-4" /> App clienti</Button>
      <Modal aperto={nuova} onChiudi={() => setNuova(false)} titolo="Nuova comanda dall'ombrellone" larghezza="max-w-xl">
        <div className="p-4"><FormComandaOmbrellone onInviata={() => setNuova(false)} /></div>
      </Modal>
      <Modal aperto={app} onChiudi={() => setApp(false)} titolo="ComandApp — app del bagnante" larghezza="max-w-xl">
        <div className="p-4"><CartaComandApp /></div>
      </Modal>
    </>
  )
}
