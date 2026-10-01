/**
 * App admin (rotta pubblica `/adminapp`, mobile): il gestore conferma/rifiuta le richieste
 * di tavolo arrivate dal sito e modifica il menu a voce. Con Supabase i dati sono condivisi dal vivo.
 */
import { useEffect, useRef, useState } from 'react'
import { LogOut, Check, X, Users, Phone, CalendarDays, Mic, Inbox, Bell, BellOff, BellRing, Share, CalendarX2, ChevronDown, CircleCheck, TriangleAlert, OctagonX, RotateCw, Sun, Moon, Clock } from 'lucide-react'
import type { PrenotazioneRistorante, RichiestaRistorante, StatoPrenotazione, Turno } from '@/data/types'
import { PiantaTavoli } from '@/pages/ristorante/ScegliTavolo'
import { nomeZona } from '@/lib/zoneTavoli'
import { disponibilitaTurno } from '@/lib/disponibilita'
import { GiorniChiusi } from '@/components/GiorniChiusi'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { UTENTI_ADMIN } from '@/lib/adminapp'
import { campanello, sbloccaAudio } from '@/lib/suoni'
import { supabaseAttivo } from '@/lib/supabase'
import AssistenteVocale from '@/pages/AssistenteVocale'
import { cn } from '@/lib/cn'
import { attivaPush, preparaInstallazione, statoPush, type StatoPush } from '@/lib/notifichePush'

const CHIAVE = 'adminapp.sessione.v1'
const dataIt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

export default function AdminApp() {
  const [dentro, setDentro] = useState(() => { try { return localStorage.getItem(CHIAVE) === '1' } catch { return false } })
  const esci = () => { try { localStorage.removeItem(CHIAVE) } catch { /* */ } setDentro(false) }
  useEffect(() => { preparaInstallazione() }, [])
  return (
    <div className="min-h-screen bg-calce text-profondo">
      <header className="sticky top-0 z-10 bg-profondo px-4 py-3 text-white shadow">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <p className="font-display text-xl font-semibold leading-none">BeachIn Admin</p>
            <p className="text-[11px] text-white/60">{config.nome} · {supabaseAttivo ? 'dati condivisi (Supabase)' : 'modalità demo locale'}</p>
          </div>
          {dentro && <button onClick={esci} className="grid h-8 w-8 place-content-center rounded-full hover:bg-white/10" aria-label="Esci"><LogOut className="h-4 w-4" /></button>}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4">
        {dentro ? <Area /> : <Login onEntra={() => { try { localStorage.setItem(CHIAVE, '1') } catch { /* */ } setDentro(true) }} />}
      </main>
    </div>
  )
}

function Login({ onEntra }: { onEntra: () => void }) {
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState(false)
  const campo = 'h-12 w-full rounded-xl border border-calce-200 bg-white px-4 text-base focus-visible:focus-ring'
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); sbloccaAudio(); if (UTENTI_ADMIN.some((u) => u.utente === utente.trim().toLowerCase() && u.password === password)) onEntra(); else setErrore(true) }}
      className="mx-auto mt-6 max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-sm"
    >
      <h1 className="text-center font-display text-2xl font-semibold">Area gestore</h1>
      <input value={utente} onChange={(e) => { setUtente(e.target.value); setErrore(false) }} placeholder="Utente" autoCapitalize="none" autoComplete="username" className={campo} />
      <input value={password} onChange={(e) => { setPassword(e.target.value); setErrore(false) }} type="password" placeholder="Password" autoComplete="current-password" className={campo} />
      {errore && <p className="text-sm text-boa">Utente o password non corretti.</p>}
      <button className="h-12 w-full rounded-xl bg-cabina text-base font-semibold text-white hover:bg-profondo">Entra</button>
      <p className="text-center text-xs text-profondo/45">Demo: {UTENTI_ADMIN[0].utente} / {UTENTI_ADMIN[0].password}</p>
    </form>
  )
}

function Area() {
  const { richiesteRistorante, confermaRistorante, rifiutaRistorante, assegnaTavolo, giorniChiusi } = useDemoData()
  const [daConfermareTavolo, setDaConfermareTavolo] = useState<RichiestaRistorante>()
  const [chiusureAperte, setChiusureAperte] = useState(false)
  const chiusureFuture = giorniChiusi.filter((g) => g.data >= config.stagione.oggi).length
  const [tab, setTab] = useState<'prenotazioni' | 'menu'>('prenotazioni')
  const [suoni, setSuoni] = useState(true)
  const daConfermare = richiesteRistorante.filter((r) => r.stato === 'da_confermare')

  // campanello quando arriva una nuova richiesta dal sito
  const viste = useRef(new Set(richiesteRistorante.map((r) => r.id)))
  useEffect(() => {
    const nuove = richiesteRistorante.filter((r) => !viste.current.has(r.id))
    nuove.forEach((r) => viste.current.add(r.id))
    if (suoni && nuove.some((r) => r.stato === 'da_confermare')) campanello()
  }, [richiesteRistorante, suoni])

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <div className="grid flex-1 grid-cols-2 rounded-xl bg-white p-1 text-sm font-semibold shadow-sm">
          <button onClick={() => setTab('prenotazioni')} className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg py-2', tab === 'prenotazioni' ? 'bg-profondo text-white' : 'text-profondo/60')}>
            <Inbox className="h-4 w-4" /> Prenotazioni {daConfermare.length > 0 && <span className="rounded-full bg-boa px-1.5 text-xs text-white">{daConfermare.length}</span>}
          </button>
          <button onClick={() => setTab('menu')} className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg py-2', tab === 'menu' ? 'bg-profondo text-white' : 'text-profondo/60')}><Mic className="h-4 w-4" /> Menu a voce</button>
        </div>
        <button onClick={() => { sbloccaAudio(); setSuoni(!suoni) }} className="grid w-11 place-content-center rounded-xl bg-white text-profondo/60 shadow-sm" aria-label={suoni ? 'Disattiva suoni' : 'Attiva suoni'}>
          {suoni ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>
      </div>

      <Notifiche />

      {tab === 'prenotazioni' && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-profondo/50">Da confermare</h2>
          {daConfermare.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-profondo/50 shadow-sm">Nessuna richiesta in attesa.</p>}
          {daConfermare.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-lg font-semibold">{r.nome}</p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-profondo/70">
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {dataIt(r.data)} · <span className="capitalize">{r.turno}</span></span>
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {r.coperti} coperti</span>
                {r.telefono && <a href={`tel:${r.telefono}`} className="inline-flex items-center gap-1 text-cabina"><Phone className="h-4 w-4" /> {r.telefono}</a>}
              </p>
              {r.note && <p className="mt-1 text-sm italic text-profondo/55">«{r.note}»</p>}
              <Disponibilita r={r} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => rifiutaRistorante(r.id)} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-boa/40 font-semibold text-boa"><X className="h-4 w-4" /> Rifiuta</button>
                <button onClick={() => setDaConfermareTavolo(r)} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-acqua font-semibold text-white"><Check className="h-4 w-4" /> Conferma</button>
              </div>
            </div>
          ))}
          <OggiRistorante />
          <div className="rounded-2xl bg-white shadow-sm">
            <button onClick={() => setChiusureAperte(!chiusureAperte)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
              <span className="inline-flex items-center gap-2 font-semibold"><CalendarX2 className="h-5 w-5 text-boa" /> Giorni chiusi
                {chiusureFuture > 0 && <span className="rounded-full bg-boa px-1.5 text-xs text-white">{chiusureFuture}</span>}</span>
              <ChevronDown className={cn('h-5 w-5 text-profondo/50 transition-transform', chiusureAperte && 'rotate-180')} />
            </button>
            {chiusureAperte && <div className="border-t border-calce-200 p-4"><GiorniChiusi grande /></div>}
          </div>
        </div>
      )}

      {daConfermareTavolo && (
        <SceltaTavolo
          titolo={`Conferma ${daConfermareTavolo.nome} · ${daConfermareTavolo.coperti}p`}
          data={daConfermareTavolo.data}
          turno={daConfermareTavolo.turno}
          coperti={daConfermareTavolo.coperti}
          etichettaSenza="Conferma senza tavolo"
          onChiudi={() => setDaConfermareTavolo(undefined)}
          onScegli={(tavoloId) => {
            const r = daConfermareTavolo
            confermaRistorante(r.id)
            // la prenotazione `PR-<id>` nasce dalla conferma: le assegno subito il tavolo scelto
            if (tavoloId) assegnaTavolo(`PR-${r.id}`, tavoloId)
            setDaConfermareTavolo(undefined)
          }}
        />
      )}

      {tab === 'menu' && <AssistenteVocale />}
    </div>
  )
}

const ordineStato: Record<StatoPrenotazione, number> = { in_attesa: 0, confermata: 0, arrivata: 1, annullata: 2 }

/** Panoramica di oggi: coperti e riempimento per turno, avvisi, lista arrivi con tavolo e "arrivato" a un tocco. */
function OggiRistorante() {
  const { prenotazioniRistorante, richiesteRistorante, tavoliDelGiorno, giorniChiusi, assegnaTavolo, impostaStatoPrenotazione } = useDemoData()
  const oggi = config.stagione.oggi
  const [turno, setTurno] = useState<Turno>(() => (new Date().getHours() < 16 ? 'pranzo' : 'cena'))
  const [daAssegnare, setDaAssegnare] = useState<PrenotazioneRistorante>()
  const tavoli = tavoliDelGiorno(oggi)
  const numeroTavolo = new Map(tavoli.map((t) => [t.id, t.numero]))
  const chiuso = giorniChiusi.find((g) => g.data === oggi)
  const attesaOggi = richiesteRistorante.filter((r) => r.stato === 'da_confermare' && r.data === oggi).length

  const riepilogo = (t: Turno) => {
    const d = disponibilitaTurno(tavoli, prenotazioniRistorante, oggi, t)
    const lista = prenotazioniRistorante.filter((p) => p.data === oggi && p.turno === t && p.stato !== 'annullata')
    return { d, lista, arrivati: lista.filter((p) => p.stato === 'arrivata').length, pct: d.postiTotali ? Math.min(100, Math.round((d.copertiPrenotati / d.postiTotali) * 100)) : 0 }
  }
  const turni = { pranzo: riepilogo('pranzo'), cena: riepilogo('cena') }
  const sel = turni[turno]
  const lista = [...sel.lista].sort((a, b) => ordineStato[a.stato] - ordineStato[b.stato] || (a.ora ?? '99').localeCompare(b.ora ?? '99') || a.nome.localeCompare(b.nome))

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="flex items-baseline justify-between">
        <span className="font-display text-xl font-semibold">Oggi al ristorante</span>
        <span className="text-xs capitalize text-profondo/50">{dataIt(oggi)}</span>
      </h2>
      {chiuso && <p className="mt-2 flex items-center gap-2 rounded-xl bg-boa/10 px-3 py-2 text-sm font-medium text-boa"><OctagonX className="h-4 w-4" /> Oggi è segnato come chiuso{chiuso.nota ? ` (${chiuso.nota})` : ''}.</p>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(['pranzo', 'cena'] as Turno[]).map((t) => {
          const r = turni[t]
          const Icona = t === 'pranzo' ? Sun : Moon
          return (
            <button key={t} onClick={() => setTurno(t)} className={cn('rounded-xl border-2 p-3 text-left transition', turno === t ? 'border-profondo bg-profondo text-white' : 'border-calce-200 bg-calce/50')}>
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-70"><Icona className="h-3.5 w-3.5" /> {t}</span>
              <span className="mt-1 block"><b className="num text-2xl">{r.d.copertiPrenotati}</b> <span className="text-xs opacity-70">/ {r.d.postiTotali} coperti</span></span>
              <span className={cn('mt-2 block h-1.5 overflow-hidden rounded-full', turno === t ? 'bg-white/20' : 'bg-calce-200')}>
                <span className={cn('block h-full rounded-full', r.pct >= 90 ? 'bg-boa' : r.pct >= 65 ? 'bg-tenda' : 'bg-acqua')} style={{ width: `${r.pct}%` }} />
              </span>
              <span className="mt-1.5 block text-[11px] opacity-70">{r.lista.length} pren. · {r.d.tavoliLiberi} tavoli liberi{r.arrivati > 0 ? ` · ${r.arrivati} arrivati` : ''}</span>
            </button>
          )
        })}
      </div>

      {(sel.d.senzaTavolo > 0 || attesaOggi > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          {sel.d.senzaTavolo > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-tenda/25 px-2.5 py-1 text-[#7A5A12]"><TriangleAlert className="h-3.5 w-3.5" /> {sel.d.senzaTavolo} senza tavolo a {turno}</span>}
          {attesaOggi > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-boa/15 px-2.5 py-1 text-boa"><Inbox className="h-3.5 w-3.5" /> {attesaOggi} {attesaOggi === 1 ? 'richiesta' : 'richieste'} per oggi da confermare</span>}
        </div>
      )}

      {lista.length === 0
        ? <p className="mt-3 rounded-xl bg-calce/60 p-4 text-center text-sm text-profondo/50">Nessuna prenotazione a {turno}.</p>
        : (
          <ul className="mt-3 divide-y divide-calce-200">
            {lista.map((p) => {
              const arrivato = p.stato === 'arrivata'
              return (
                <li key={p.id} className={cn('flex items-center gap-3 py-2.5', arrivato && 'opacity-50')}>
                  <span className="w-11 shrink-0 text-center text-xs font-semibold text-profondo/60">{p.ora ?? <Clock className="mx-auto h-4 w-4 opacity-40" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.nome} <span className="font-normal text-profondo/60">· {p.coperti}p</span></p>
                    {p.note && <p className="truncate text-xs italic text-profondo/55">«{p.note}»</p>}
                  </div>
                  {p.telefono && <a href={`tel:${p.telefono}`} className="grid h-9 w-9 shrink-0 place-content-center rounded-full text-cabina hover:bg-cabina/10" aria-label={`Chiama ${p.nome}`}><Phone className="h-4 w-4" /></a>}
                  <button
                    onClick={() => setDaAssegnare(p)}
                    className={cn('h-9 shrink-0 rounded-lg px-2.5 text-sm font-semibold', p.tavoloId ? 'bg-calce text-profondo' : 'bg-tenda/30 text-[#7A5A12]')}
                  >
                    {p.tavoloId ? `T${numeroTavolo.get(p.tavoloId) ?? '?'}` : 'Tavolo'}
                  </button>
                  <button
                    onClick={() => impostaStatoPrenotazione(p.id, arrivato ? 'confermata' : 'arrivata')}
                    className={cn('grid h-9 w-9 shrink-0 place-content-center rounded-full border-2', arrivato ? 'border-acqua bg-acqua text-white' : 'border-calce-200 text-profondo/40')}
                    aria-label={arrivato ? 'Segna come non arrivato' : 'Segna come arrivato'}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

      {daAssegnare && (
        <SceltaTavolo
          titolo={`Tavolo per ${daAssegnare.nome} · ${daAssegnare.coperti}p`}
          data={daAssegnare.data}
          turno={daAssegnare.turno}
          coperti={daAssegnare.coperti}
          correnteId={daAssegnare.tavoloId}
          etichettaSenza={daAssegnare.tavoloId ? 'Togli il tavolo' : undefined}
          onChiudi={() => setDaAssegnare(undefined)}
          onScegli={(tavoloId) => { assegnaTavolo(daAssegnare.id, tavoloId); setDaAssegnare(undefined) }}
        />
      )}
    </section>
  )
}

/**
 * Scelta del tavolo a schermo intero. In orizzontale la pianta della sala; in verticale la pianta sarebbe
 * troppo stretta (tavoli sovrapposti), quindi invito a girare il telefono + elenco rapido dei tavoli.
 */
function SceltaTavolo({ titolo, data, turno, coperti, correnteId, etichettaSenza, onScegli, onChiudi }: {
  titolo: string
  data: string
  turno: Turno
  coperti: number
  correnteId?: string
  /** Bottone per procedere senza tavolo (es. "Conferma senza tavolo", "Togli il tavolo"). */
  etichettaSenza?: string
  onScegli: (tavoloId?: string) => void
  onChiudi: () => void
}) {
  const { tavoliDelGiorno, prenotazioniRistorante } = useDemoData()
  const tavoli = tavoliDelGiorno(data)
  const occupanti = new Map<string, string>()
  for (const p of prenotazioniRistorante) {
    if (p.data === data && p.turno === turno && p.tavoloId && p.stato !== 'annullata') occupanti.set(p.tavoloId, p.nome)
  }
  if (correnteId) occupanti.delete(correnteId)
  const consigliato = disponibilitaTurno(tavoli, prenotazioniRistorante, data, turno, coperti).tavoloAdatto
  const consigliatoId = consigliato?.id !== correnteId ? consigliato?.id : undefined
  // elenco: consigliato, poi liberi adatti (dal più piccolo), poi troppo piccoli, infine occupati
  const peso = (id: string, posti: number) => (id === consigliatoId ? 0 : occupanti.has(id) ? 3 : posti < coperti ? 2 : 1)
  const elenco = [...tavoli].sort((a, b) => peso(a.id, a.posti) - peso(b.id, b.posti) || a.posti - b.posti || a.numero - b.numero)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-calce">
      <div className="flex shrink-0 items-center gap-2 bg-profondo px-3 py-2 text-white">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{titolo} <span className="font-normal capitalize text-white/60">· {dataIt(data)} {turno}</span></p>
        {etichettaSenza && <button onClick={() => onScegli(undefined)} className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold">{etichettaSenza}</button>}
        <button onClick={onChiudi} className="grid h-8 w-8 shrink-0 place-content-center rounded-full hover:bg-white/10" aria-label="Chiudi"><X className="h-5 w-5" /></button>
      </div>

      {/* verticale: invito a girare + elenco */}
      <div className="flex-1 overflow-y-auto p-3 landscape:hidden">
        <p className="flex items-center gap-2 rounded-xl bg-cabina/10 px-3 py-2.5 text-sm text-profondo"><RotateCw className="h-5 w-5 shrink-0 text-cabina" /> Gira il telefono in orizzontale per scegliere sulla pianta della sala.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {elenco.map((t) => {
            const chi = occupanti.get(t.id)
            return (
              <button
                key={t.id}
                disabled={!!chi}
                onClick={() => onScegli(t.id)}
                className={cn('rounded-xl border-2 bg-white p-2 text-left',
                  chi ? 'border-calce-200 bg-calce-200 text-profondo/40'
                    : t.id === correnteId ? 'border-profondo bg-profondo text-white'
                      : t.posti < coperti ? 'border-tenda text-profondo/60' : 'border-cabina',
                  t.id === consigliatoId && 'ring-4 ring-acqua')}
              >
                <span className="block text-lg font-bold leading-none">T{t.numero}</span>
                <span className="mt-1 block truncate text-[11px] opacity-80">{chi ?? `${t.posti} posti`}</span>
                <span className="block truncate text-[10px] opacity-60">{t.id === consigliatoId ? 'consigliato' : nomeZona(t.zona).replace('Ristorante ', '')}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* orizzontale: pianta a tutto schermo */}
      <div className="hidden min-h-0 flex-1 p-2 landscape:block">
        <PiantaTavoli className="h-full w-full" coperti={coperti} tavoli={tavoli} occupanti={occupanti} correnteId={correnteId} consigliatoId={consigliatoId} onScegli={(id) => onScegli(id)} />
      </div>
    </div>
  )
}

/** Controllo immediato sotto la richiesta: il giorno è aperto? quanti tavoli liberi ci sono? ce n'è uno adatto? */
function Disponibilita({ r }: { r: RichiestaRistorante }) {
  const { tavoliDelGiorno, prenotazioniRistorante, giorniChiusi } = useDemoData()
  const chiuso = giorniChiusi.find((g) => g.data === r.data)
  if (chiuso) {
    return (
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-boa/10 px-3 py-2.5 text-sm font-medium text-boa">
        <OctagonX className="mt-0.5 h-4 w-4 shrink-0" /> Quel giorno il ristorante è segnato come chiuso{chiuso.nota ? ` (${chiuso.nota})` : ''}.
      </p>
    )
  }
  const d = disponibilitaTurno(tavoliDelGiorno(r.data), prenotazioniRistorante, r.data, r.turno, r.coperti)
  const esito = d.pieno
    ? { tono: 'bg-boa/10 text-boa', Icona: OctagonX, testo: `Tutto pieno a ${r.turno}` }
    : d.tavoloAdatto
      ? { tono: 'bg-acqua/15 text-profondo', Icona: CircleCheck, testo: `C'è posto: tavolo ${d.tavoloAdatto.numero} da ${d.tavoloAdatto.posti} posti libero` }
      : { tono: 'bg-tenda/20 text-[#7A5A12]', Icona: TriangleAlert, testo: `Nessun tavolo libero da ${r.coperti} posti: serve unire tavoli` }
  return (
    <div className={cn('mt-3 rounded-xl px-3 py-2.5 text-sm', esito.tono)}>
      <p className="flex items-start gap-2 font-semibold"><esito.Icona className="mt-0.5 h-4 w-4 shrink-0" /> {esito.testo}</p>
      <p className="mt-1 pl-6 text-xs text-profondo/65">
        <span className="capitalize">{r.turno}</span> {dataIt(r.data)}: <b className="num">{d.tavoliLiberi}</b> tavoli liberi su {d.tavoliTotali} · <b className="num">{d.postiLiberi}</b> posti liberi su {d.postiTotali}
        {d.senzaTavolo > 0 && <> · {d.senzaTavolo} {d.senzaTavolo === 1 ? 'prenotazione' : 'prenotazioni'} ancora senza tavolo</>}
      </p>
    </div>
  )
}

/** Riquadro per attivare le notifiche push sul telefono (anche a schermo bloccato). */
function Notifiche() {
  const [stato, setStato] = useState<StatoPush>()
  const [errore, setErrore] = useState<string>()
  const [lavoro, setLavoro] = useState(false)
  useEffect(() => { statoPush().then(setStato).catch(() => setStato('non-supportato')) }, [])
  if (!stato || stato === 'attivo') {
    return stato === 'attivo' ? <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-acqua"><BellRing className="h-3.5 w-3.5" /> Notifiche attive su questo telefono</p> : null
  }
  const testo: Record<Exclude<StatoPush, 'attivo'>, React.ReactNode> = {
    'da-attivare': 'Ricevi le nuove prenotazioni come notifica, anche a telefono bloccato.',
    'serve-installazione': <>Su iPhone: tocca <Share className="inline h-4 w-4" /> <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>, poi apri l'app dall'icona e attiva qui le notifiche.</>,
    negato: 'Le notifiche sono bloccate: riattivale dalle impostazioni del browser/telefono per questo sito.',
    'non-supportato': 'Questo browser non supporta le notifiche push. Usa Chrome (Android) o Safari con l’app aggiunta alla Home (iPhone).',
    'senza-server': 'Le notifiche richiedono Supabase configurato (modalità demo locale attiva).',
  }
  const attiva = async () => {
    setLavoro(true); setErrore(undefined)
    try { setStato(await attivaPush()) } catch (e) { setErrore((e as Error).message) } finally { setLavoro(false) }
  }
  return (
    <div className="mb-4 rounded-2xl border border-tenda/60 bg-tenda/15 p-4">
      <p className="flex items-start gap-2 text-sm text-profondo"><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-cabina" /> <span>{testo[stato]}</span></p>
      {stato === 'da-attivare' && (
        <button onClick={attiva} disabled={lavoro} className="mt-3 h-11 w-full rounded-xl bg-cabina font-semibold text-white disabled:opacity-60">{lavoro ? 'Attivazione…' : 'Attiva notifiche'}</button>
      )}
      {errore && <p className="mt-2 text-xs text-boa">Errore: {errore}</p>}
    </div>
  )
}
