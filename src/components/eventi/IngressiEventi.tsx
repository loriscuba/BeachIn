import { useEffect, useMemo, useRef, useState } from 'react'
import { ScanLine, Check, RotateCcw, X, Search, TriangleAlert, OctagonX, Minus, Plus, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { ScannerQr } from '@/components/ScannerQr'
import { codiceDaTesto, eventoPredefinito, oraDa, verificaInvito, type EsitoInvito } from '@/lib/invitiEventi'
import { campanello, ding } from '@/lib/suoni'
import { cn } from '@/lib/cn'
import type { RichiestaEvento } from '@/data/types'

const dataIt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

/** App admin → Ingressi: si scansiona il QR dell'invito ricevuto per mail e si registra l'ingresso all'evento. */
export function IngressiEventi() {
  const { eventi, richiesteEventi, segnaArrivoEvento } = useDemoData()
  const ordinati = useMemo(() => [...eventi].sort((a, b) => a.data.localeCompare(b.data)), [eventi])
  // `?evento=` arriva da Eventi → Presenze: si apre sull'evento che si stava guardando
  const daLink = new URLSearchParams(useLocation().search).get('evento')
  const [eventoId, setEventoId] = useState(() => (daLink && eventi.some((e) => e.id === daLink) ? daLink : eventoPredefinito(eventi, config.oggi)?.id) ?? '')
  const [scansiona, setScansiona] = useState(false)
  const [esito, setEsito] = useState<EsitoInvito>()
  const [quanti, setQuanti] = useState(1)
  const [cerca, setCerca] = useState('')

  const invitati = richiesteEventi.filter((r) => r.eventoId === eventoId && r.stato === 'confermata')
  const attese = invitati.reduce((s, r) => s + r.persone, 0)
  const entrate = invitati.reduce((s, r) => s + (r.arrivati ?? 0), 0)
  const lista = invitati
    .filter((r) => !cerca || `${r.nome} ${r.codice ?? ''}`.toLowerCase().includes(cerca.toLowerCase()))
    .sort((a, b) => (a.arrivati ?? 0) - (b.arrivati ?? 0) || a.nome.localeCompare(b.nome))

  const riquadro = useRef<HTMLDivElement>(null)
  // l'esito sta sotto la fotocamera: sul telefono lo porto in vista, se no sembra che la lettura non sia avvenuta
  useEffect(() => { if (esito) riquadro.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [esito])

  const controlla = (testo: string, evento = eventoId) => {
    const e = verificaInvito(richiesteEventi, codiceDaTesto(testo), evento)
    setEsito(e)
    if (e.tipo === 'ok') { setQuanti(e.r.persone - (e.r.arrivati ?? 0)); ding() } else campanello()
  }
  // un solo campo per nome e codice: Invio verifica l'invitato trovato, o il codice scritto se non trova nessuno
  const cercaOVerifica = () => {
    if (!cerca.trim()) return
    controlla(lista.length === 1 && lista[0].codice ? lista[0].codice : cerca)
    setCerca('')
  }
  const conferma = () => {
    if (esito?.tipo !== 'ok') return
    segnaArrivoEvento(esito.r.id, (esito.r.arrivati ?? 0) + quanti)
    setEsito(undefined)
  }

  return (
    <div className="space-y-3">
      <select value={eventoId} onChange={(e) => { setEventoId(e.target.value); setEsito(undefined) }}
        className="h-12 w-full rounded-xl border-0 bg-white px-3 text-base font-semibold shadow-sm">
        {ordinati.map((e) => {
          // Numero di inviti confermati accanto al nome: si vede subito su quale evento sono.
          const n = richiesteEventi.filter((r) => r.eventoId === e.id && r.stato === 'confermata').length
          return <option key={e.id} value={e.id}>{dataIt(e.data)} · {e.nome}{n ? ` (${n})` : ''}</option>
        })}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="num text-3xl font-bold">{entrate}<span className="text-lg text-profondo/40">/{attese}</span></p><p className="text-sm text-profondo/60">persone entrate</p></div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="num text-3xl font-bold">{Math.max(0, attese - entrate)}</p><p className="text-sm text-profondo/60">ancora attese</p></div>
      </div>

      <button onClick={() => { setScansiona(!scansiona); setEsito(undefined) }}
        className={cn('inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold shadow-sm', scansiona ? 'bg-white text-profondo' : 'bg-profondo text-white')}>
        {scansiona ? <><X className="h-5 w-5" /> Chiudi fotocamera</> : <><ScanLine className="h-5 w-5" /> Scansiona invito</>}
      </button>
      {/* la fotocamera resta accesa: mentre c'è un esito a schermo le letture si ignorano */}
      {scansiona && <ScannerQr onLettura={(t) => { if (!esito) controlla(t) }} />}

      {esito && <div ref={riquadro} className="scroll-mb-24"><EsitoCard esito={esito} quanti={quanti} setQuanti={setQuanti} onConferma={conferma}
        onAnnullaIngresso={(id) => { segnaArrivoEvento(id, 0); setEsito(undefined) }} onChiudi={() => setEsito(undefined)}
        onCambiaEvento={(r) => { setEventoId(r.eventoId); controlla(r.codice ?? '', r.eventoId) }} /></div>}

      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <form onSubmit={(e) => { e.preventDefault(); cercaOVerifica() }} className="mb-2 flex items-center gap-2 rounded-xl bg-calce px-3"><Search className="h-4 w-4 text-profondo/40" />
          <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca nome o codice invito" enterKeyHint="search" className="h-10 min-w-0 flex-1 bg-transparent outline-none" /></form>
        {lista.length === 0 && <p className="py-4 text-center text-sm text-profondo/50">Nessun invito confermato per questo evento.</p>}
        <ul className="divide-y divide-calce-200">
          {lista.map((r) => {
            const dentro = (r.arrivati ?? 0) >= r.persone
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.nome}</p>
                  <p className="text-sm text-profondo/60"><Users className="mr-1 inline h-3.5 w-3.5" />{r.arrivati ?? 0}/{r.persone}{r.arrivoTs ? ` · entrati alle ${oraDa(r.arrivoTs)}` : ''}</p>
                </div>
                {dentro || (r.arrivati ?? 0) > 0
                  ? <button onClick={() => segnaArrivoEvento(r.id, 0)} aria-label="Annulla ingresso" className="grid h-10 w-10 place-content-center rounded-xl bg-acqua/15 text-[#2F6E5F]"><RotateCcw className="h-4 w-4" /></button>
                  : null}
                {!dentro && <button onClick={() => segnaArrivoEvento(r.id, r.persone)} className="inline-flex h-10 items-center gap-1 rounded-xl bg-acqua px-3 font-semibold text-white"><Check className="h-4 w-4" /> Entrati</button>}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function EsitoCard({ esito, quanti, setQuanti, onConferma, onAnnullaIngresso, onChiudi, onCambiaEvento }: {
  esito: EsitoInvito; quanti: number; setQuanti: (n: number) => void; onConferma: () => void; onAnnullaIngresso: (id: string) => void; onChiudi: () => void
  onCambiaEvento: (r: RichiestaEvento) => void
}) {
  if (esito.tipo === 'ok') {
    const r = esito.r
    const restano = r.persone - (r.arrivati ?? 0)
    return (
      <div className="rounded-2xl border-2 border-acqua bg-white p-4 shadow-sm">
        <p className="inline-flex items-center gap-1.5 font-semibold text-[#2F6E5F]"><Check className="h-5 w-5" /> Invito valido</p>
        <p className="mt-1 text-2xl font-bold">{r.nome}</p>
        <p className="text-profondo/60">{r.persone} persone{r.arrivati ? ` · già entrate ${r.arrivati}` : ''}{r.note ? ` · «${r.note}»` : ''}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-semibold">Entrano</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setQuanti(Math.max(1, quanti - 1))} className="grid h-11 w-11 place-content-center rounded-xl bg-calce" aria-label="Meno"><Minus className="h-4 w-4" /></button>
            <span className="num w-8 text-center text-2xl font-bold">{quanti}</span>
            <button onClick={() => setQuanti(Math.min(restano, quanti + 1))} className="grid h-11 w-11 place-content-center rounded-xl bg-calce" aria-label="Più"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
          <button onClick={onChiudi} className="h-12 rounded-xl border border-calce-300 font-semibold text-profondo/70">Annulla</button>
          <button onClick={onConferma} className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-acqua text-lg font-semibold text-white"><Check className="h-5 w-5" /> Registra ingresso</button>
        </div>
      </div>
    )
  }
  const messaggi = {
    gia_entrato: { icona: TriangleAlert, colore: 'border-tenda text-[#7A5A12]', titolo: 'Già entrato', testo: 'r' in esito ? `${esito.r.nome} · ${esito.r.persone} persone, entrati alle ${oraDa(esito.r.arrivoTs)}` : '' },
    altro_evento: { icona: OctagonX, colore: 'border-boa text-boa', titolo: 'Invito per un altro evento', testo: 'r' in esito ? `${esito.r.nome} · ${esito.r.eventoNome} del ${dataIt(esito.r.eventoData)}` : '' },
    non_confermata: { icona: OctagonX, colore: 'border-boa text-boa', titolo: 'Prenotazione non confermata', testo: 'r' in esito ? `${esito.r.nome}: la richiesta non è stata confermata` : '' },
    sconosciuto: { icona: OctagonX, colore: 'border-boa text-boa', titolo: 'Invito non valido', testo: 'Codice non trovato tra le prenotazioni.' },
  }[esito.tipo]
  const Icona = messaggi.icona
  return (
    <div className={cn('rounded-2xl border-2 bg-white p-4 shadow-sm', messaggi.colore.split(' ')[0])}>
      <p className={cn('inline-flex items-center gap-1.5 text-lg font-semibold', messaggi.colore.split(' ')[1])}><Icona className="h-5 w-5" /> {messaggi.titolo}</p>
      <p className="mt-1 text-profondo/70">{messaggi.testo}</p>
      <div className="mt-3 flex gap-2">
        {esito.tipo === 'gia_entrato' && <button onClick={() => onAnnullaIngresso(esito.r.id)} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-calce-300 px-3 font-semibold text-profondo/70"><RotateCcw className="h-4 w-4" /> Annulla ingresso</button>}
        {esito.tipo === 'altro_evento' && <button onClick={() => onCambiaEvento(esito.r)} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-calce-300 px-3 font-semibold text-cabina">Passa a quell’evento</button>}
        <button onClick={onChiudi} className="ml-auto h-11 rounded-xl bg-profondo px-5 font-semibold text-white">OK</button>
      </div>
    </div>
  )
}
