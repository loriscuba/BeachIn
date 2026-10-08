/**
 * App del Lido per i clienti (rotta pubblica `/comandapp`, fuori dal gestionale, installabile come PWA).
 * Sezioni (`?sez=`, barra in basso): News · Ombrellone (comande al bar, con login) · Prenota (ristorante/eventi) ·
 * Eventi · Lavagna (proposte del giorno) · Contatti. News e lavagnetta le scrive il gestore (Sito → App clienti / app admin).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Umbrella, LogOut, Plus, Minus, Send, Check, ChefHat, Bell, ClipboardList, ShoppingBag, Newspaper, CalendarCheck,
  PartyPopper, Phone, Pin, MapPin, MessageCircle, Mail, Clock, Facebook, ChevronRight, UtensilsCrossed, Ticket,
  type LucideIcon,
} from 'lucide-react'
import type { CategoriaBar, Evento, StatoComanda } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { config } from '@/data/config'
import { dataEstesa, euro, euroCent } from '@/lib/formatters'
import { PASSI_COMANDA, UTENTI_COMANDAPP, etichettaStatoComanda } from '@/lib/comandapp'
import { ding, sbloccaAudio } from '@/lib/suoni'
import { cn } from '@/lib/cn'
import { impostaManifest } from '@/lib/notifichePush'
import { urlPubblico } from '@/lib/urlPubblico'
import PulsanteInstalla from '@/components/PulsanteInstalla'
import { AnteprimaWhatsApp } from '@/components/AnteprimaWhatsApp'
import { prezzoLavagna } from '@/components/app/GestioneAppClienti'
import { EventoModal, FormRistorante, Sospese } from '@/pages/SitoAnteprima'
import { logoLido } from '@/assets/sito'

type Utente = (typeof UTENTI_COMANDAPP)[number]
type Sez = 'news' | 'ombrellone' | 'prenota' | 'eventi' | 'lavagna' | 'contatti'
const CHIAVE = 'comandapp.sessione.v1'
const icona: Record<StatoComanda, typeof Send> = { in_attesa: Send, presa_in_carico: ClipboardList, in_preparazione: ChefHat, pronta: Bell }

function leggiSessione(): Utente | undefined {
  try { const u = localStorage.getItem(CHIAVE); return UTENTI_COMANDAPP.find((x) => x.utente === u) } catch { return undefined }
}

export default function ComandApp() {
  // installabile come app a sé (icona gialla, distinta dall'app Admin)
  useEffect(() => {
    impostaManifest('comandapp.webmanifest', 'comandapp-icon-192.png', config.nome)
    // service worker: richiesto da alcuni browser Android per proporre l'installazione
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw-admin.js`, { scope: import.meta.env.BASE_URL }).catch(() => undefined)
  }, [])
  const { moduloAttivo } = useModuli()
  const { canaliPrenotazione, notizie } = useDemoData()
  const [utente, setUtente] = useState<Utente | undefined>(leggiSessione)
  const esci = () => { try { localStorage.removeItem(CHIAVE) } catch { /* */ } setUtente(undefined) }

  // sezioni visibili secondo i moduli attivi
  const ristorante = moduloAttivo('ristorante')
  const eventiOn = moduloAttivo('eventi')
  const voci = ([
    { id: 'news', etichetta: 'News', icona: Newspaper, on: true },
    { id: 'ombrellone', etichetta: 'Ombrellone', icona: Umbrella, on: moduloAttivo('comande') },
    { id: 'prenota', etichetta: 'Prenota', icona: CalendarCheck, on: (ristorante && canaliPrenotazione.ristorante) || (eventiOn && canaliPrenotazione.eventi) },
    { id: 'eventi', etichetta: 'Eventi', icona: PartyPopper, on: eventiOn },
    { id: 'lavagna', etichetta: 'Lavagna', icona: UtensilsCrossed, on: ristorante },
    { id: 'contatti', etichetta: 'Contatti', icona: Phone, on: true },
  ] satisfies { id: Sez; etichetta: string; icona: LucideIcon; on: boolean }[]).filter((v) => v.on)
  const [q, setQ] = useSearchParams()
  const richiesta = q.get('sez') as Sez | null
  const sez: Sez = voci.some((v) => v.id === richiesta) ? richiesta! : utente && voci.some((v) => v.id === 'ombrellone') ? 'ombrellone' : 'news'
  const vai = (s: Sez) => { setQ({ sez: s }); window.scrollTo({ top: 0 }) }
  // pallino sulle news nuove (per dispositivo)
  const ultimaNews = notizie.reduce((m, n) => Math.max(m, n.ts), 0)
  const [vista, setVista] = useState(() => { try { return Number(localStorage.getItem('comandapp.news.vista') ?? 0) } catch { return 0 } })
  useEffect(() => {
    if (sez !== 'news' || !ultimaNews) return
    try { localStorage.setItem('comandapp.news.vista', String(ultimaNews)) } catch { /* */ }
    setVista(ultimaNews)
  }, [sez, ultimaNews])

  return (
    <div className="min-h-screen bg-calce text-profondo">
      <header className="sticky top-0 z-20 bg-profondo px-4 py-2.5 text-white shadow">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={logoLido} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5" />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold leading-none">{config.nome}</p>
              <p className="text-[11px] text-white/60">{voci.find((v) => v.id === sez)?.etichetta}</p>
            </div>
          </div>
          {utente && (
            <div className="flex items-center gap-1">
              <button onClick={() => vai('ombrellone')} className="inline-flex items-center gap-1 rounded-full bg-tenda px-3 py-1 text-sm font-bold text-profondo"><Umbrella className="h-4 w-4" /> {utente.ombrellone}</button>
              <button onClick={esci} className="grid h-8 w-8 place-content-center rounded-full hover:bg-white/10" aria-label="Esci"><LogOut className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <PulsanteInstalla nome={config.nome} />
        {sez === 'news' && <News />}
        {sez === 'ombrellone' && (utente ? <Area utente={utente} /> : <Login onEntra={(u) => { try { localStorage.setItem(CHIAVE, u.utente) } catch { /* */ } setUtente(u) }} />)}
        {sez === 'prenota' && <Prenota ristorante={ristorante} eventiOn={eventiOn} />}
        {sez === 'eventi' && <Eventi />}
        {sez === 'lavagna' && <Lavagna />}
        {sez === 'contatti' && <Contatti />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-calce-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-md">
          {voci.map((v) => {
            const Icona = v.icona
            const attiva = v.id === sez
            return (
              <button key={v.id} onClick={() => vai(v.id)} className={cn('relative flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold', attiva ? 'text-cabina' : 'text-profondo/45')}>
                <Icona className={cn('h-5 w-5', attiva && 'scale-110')} />
                <span className="truncate">{v.etichetta}</span>
                {v.id === 'news' && ultimaNews > vista && <span className="absolute right-[calc(50%-14px)] top-3 h-2 w-2 rounded-full bg-boa" />}
              </button>
            )
          })}
        </div>
      </nav>
      <AnteprimaWhatsApp />
    </div>
  )
}

function Titolo({ children, sotto }: { children: React.ReactNode; sotto?: string }) {
  return (
    <div className="mb-3">
      <h1 className="font-display text-2xl font-semibold">{children}</h1>
      {sotto && <p className="text-sm text-profondo/55">{sotto}</p>}
    </div>
  )
}

function News() {
  const { notizie } = useDemoData()
  const lista = useMemo(() => [...notizie].sort((a, b) => Number(!!b.fissata) - Number(!!a.fissata) || b.ts - a.ts), [notizie])
  return (
    <div>
      <Titolo sotto="Novità e avvisi dal Lido">News</Titolo>
      {lista.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-profondo/50 shadow-sm">Nessuna news per ora.</p>}
      <div className="space-y-3">
        {lista.map((n) => (
          <article key={n.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {n.foto && <img src={n.foto} alt="" className="max-h-64 w-full object-cover" />}
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium capitalize text-profondo/45">
                {n.fissata && <span className="inline-flex items-center gap-1 rounded-full bg-boa/10 px-2 py-0.5 normal-case text-boa"><Pin className="h-3 w-3" /> In evidenza</span>}
                {dataEstesa(n.data)}
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-snug">{n.titolo}</h2>
              {n.testo && <p className="mt-1 whitespace-pre-line text-sm text-profondo/75">{n.testo}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function Prenota({ ristorante, eventiOn }: { ristorante: boolean; eventiOn: boolean }) {
  const { canaliPrenotazione, eventi } = useDemoData()
  const opzioni = [ristorante && 'ristorante', eventiOn && 'eventi'].filter(Boolean) as ('ristorante' | 'eventi')[]
  const [scelta, setScelta] = useState(opzioni[0])
  const tipo = opzioni.includes(scelta) ? scelta : opzioni[0]
  const [aperto, setAperto] = useState<Evento>()
  const prossimi = useMemo(() => eventi.filter((e) => e.data >= config.stagione.oggi).sort((a, b) => a.data.localeCompare(b.data)), [eventi])
  return (
    <div>
      <Titolo sotto="Richiedi un tavolo o un posto a un evento: ti confermiamo noi">Prenota</Titolo>
      {opzioni.length > 1 && (
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-white p-1 text-sm font-semibold shadow-sm">
          <button onClick={() => setScelta('ristorante')} className={cn('rounded-lg py-2', tipo === 'ristorante' ? 'bg-profondo text-white' : 'text-profondo/60')}>Ristorante</button>
          <button onClick={() => setScelta('eventi')} className={cn('rounded-lg py-2', tipo === 'eventi' ? 'bg-profondo text-white' : 'text-profondo/60')}>Eventi</button>
        </div>
      )}
      {tipo === 'ristorante' && (canaliPrenotazione.ristorante
        ? <FormRistorante onInviato={() => undefined} />
        : <Sospese testo="Le prenotazioni online del ristorante sono momentaneamente sospese. Chiamaci per prenotare." />)}
      {tipo === 'eventi' && (!canaliPrenotazione.eventi
        ? <Sospese testo="Le prenotazioni online per gli eventi sono momentaneamente sospese. Contattaci per partecipare." />
        : prossimi.length === 0
          ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-profondo/50 shadow-sm">Nessun evento in programma al momento.</p>
          : <div className="space-y-3">{prossimi.map((e) => <SchedaEvento key={e.id} evento={e} onApri={() => setAperto(e)} azione="Prenota" />)}</div>)}
      <EventoModal evento={aperto} prenotabile={canaliPrenotazione.eventi} onChiudi={() => setAperto(undefined)} onPrenotato={() => undefined} />
    </div>
  )
}

function SchedaEvento({ evento: e, onApri, azione, passato }: { evento: Evento; onApri: () => void; azione: string; passato?: boolean }) {
  return (
    <button onClick={onApri} className={cn('flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-white text-left shadow-sm', passato && 'opacity-75')}>
      {e.foto ? <img src={e.foto} alt="" className="h-24 w-24 shrink-0 object-cover" /> : <span className="grid h-24 w-24 shrink-0 place-content-center bg-tenda/30"><PartyPopper className="h-7 w-7 text-profondo/50" /></span>}
      <div className="min-w-0 flex-1 py-2">
        <p className="text-xs font-semibold capitalize text-cabina">{dataEstesa(e.data)}</p>
        <p className="truncate font-semibold">{e.nome}</p>
        <p className="inline-flex items-center gap-1 text-xs text-profondo/55"><Ticket className="h-3.5 w-3.5" /> {passato ? 'Concluso · guarda le foto' : e.prezzo ? `${euro(e.prezzo)} a persona` : 'Ingresso gratuito'}</p>
      </div>
      <span className="mr-3 inline-flex shrink-0 items-center text-sm font-semibold text-cabina">{azione}<ChevronRight className="h-4 w-4" /></span>
    </button>
  )
}

function Eventi() {
  const { eventi, canaliPrenotazione } = useDemoData()
  const [aperto, setAperto] = useState<Evento>()
  const oggi = config.stagione.oggi
  const prossimi = useMemo(() => eventi.filter((e) => e.data >= oggi).sort((a, b) => a.data.localeCompare(b.data)), [eventi, oggi])
  const passati = useMemo(() => eventi.filter((e) => e.data < oggi).sort((a, b) => b.data.localeCompare(a.data)), [eventi, oggi])
  return (
    <div>
      <Titolo sotto="Tornei, musica, cene sotto le stelle">Eventi</Titolo>
      {prossimi.length === 0 && <p className="mb-3 rounded-2xl bg-white p-6 text-center text-sm text-profondo/50 shadow-sm">Nessun evento in programma: torna a trovarci presto!</p>}
      <div className="space-y-3">{prossimi.map((e) => <SchedaEvento key={e.id} evento={e} onApri={() => setAperto(e)} azione="Dettagli" />)}</div>
      {passati.length > 0 && (
        <>
          <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-profondo/45">Eventi passati</p>
          <div className="space-y-3">{passati.map((e) => <SchedaEvento key={e.id} evento={e} onApri={() => setAperto(e)} azione="Foto" passato />)}</div>
        </>
      )}
      <EventoModal evento={aperto} prenotabile={canaliPrenotazione.eventi} onChiudi={() => setAperto(undefined)} onPrenotato={() => undefined} />
    </div>
  )
}

function Lavagna() {
  const { lavagnetta } = useDemoData()
  return (
    <div>
      {/* lavagna d'ardesia con cornice di legno, scritta a gesso */}
      <div className="rounded-2xl bg-[#8B5E3C] p-2.5 shadow-lg">
        <div className="rounded-xl bg-[#26352F] px-5 py-6 text-white shadow-[inset_0_0_40px_rgba(0,0,0,0.45)]">
          <p className="text-center font-gesso text-4xl font-bold leading-none">Oggi in cucina</p>
          <p className="mt-1 text-center font-gesso text-xl capitalize text-white/60">{dataEstesa(config.oggi)}</p>
          <div className="mx-auto my-4 h-px w-2/3 bg-white/25" />
          {lavagnetta.length === 0 && <p className="py-6 text-center font-gesso text-2xl text-white/60">La lavagna è ancora da scrivere…</p>}
          <ul className="space-y-3">
            {lavagnetta.map((v) => (
              <li key={v.id}>
                <div className="flex items-baseline gap-2 font-gesso text-2xl leading-tight">
                  <span>{v.nome}</span>
                  <span className="mb-1.5 flex-1 border-b-2 border-dotted border-white/25" />
                  {v.prezzo != null && <span className="text-tenda">{prezzoLavagna(v.prezzo)}</span>}
                </div>
                {v.descrizione && <p className="font-gesso text-lg leading-tight text-white/60">{v.descrizione}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <a href={urlPubblico('menu')} className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 font-semibold shadow-sm">
        <span className="inline-flex items-center gap-2"><UtensilsCrossed className="h-5 w-5 text-cabina" /> Menu completo del ristorante</span>
        <ChevronRight className="h-5 w-5 text-profondo/40" />
      </a>
    </div>
  )
}

function Contatti() {
  const tel = config.telefono.replace(/\s/g, '')
  const wa = tel.replace(/^\+/, '')
  const righe: { icona: LucideIcon; testo: string; sotto?: string; href: string }[] = [
    { icona: Phone, testo: config.telefono, sotto: 'Chiamaci', href: `tel:${tel}` },
    { icona: MessageCircle, testo: 'WhatsApp', sotto: 'Scrivici un messaggio', href: `https://wa.me/${wa}` },
    ...(config.email ? [{ icona: Mail, testo: config.email, sotto: 'Email', href: `mailto:${config.email}` }] : []),
    { icona: MapPin, testo: config.indirizzo, sotto: `${config.localita} · Apri in Maps`, href: config.mappa },
    ...(config.facebook ? [{ icona: Facebook, testo: 'Facebook', sotto: 'Foto e aggiornamenti', href: config.facebook }] : []),
  ]
  const o = config.orari
  return (
    <div>
      <Titolo sotto="Siamo qui, sul mare di Savona">Contatti</Titolo>
      <div className="divide-y divide-calce-200 overflow-hidden rounded-2xl bg-white shadow-sm">
        {righe.map((r) => {
          const Icona = r.icona
          return (
            <a key={r.testo} href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex items-center gap-3 px-4 py-3 active:bg-calce">
              <span className="grid h-10 w-10 shrink-0 place-content-center rounded-full bg-cabina/10 text-cabina"><Icona className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{r.testo}</span>{r.sotto && <span className="block text-xs text-profondo/55">{r.sotto}</span>}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-profondo/30" />
            </a>
          )
        })}
      </div>
      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 inline-flex items-center gap-2 font-semibold"><Clock className="h-5 w-5 text-cabina" /> Orari</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-profondo/55">Spiaggia</dt><dd className="num">{o.apertura} – {o.chiusura} <span className="text-profondo/45">({o.stagioneSpiaggia})</span></dd>
          <dt className="text-profondo/55">Bar</dt><dd className="num">{o.barApertura} – {o.barChiusura}</dd>
          <dt className="text-profondo/55">Pranzo</dt><dd className="num">{o.ristorantePranzo}</dd>
          <dt className="text-profondo/55">Cena</dt><dd className="num">{o.ristoranteCena}</dd>
        </dl>
        <p className="mt-2 text-xs text-profondo/45">Ristorante aperto tutto l'anno.</p>
      </div>
    </div>
  )
}

function Login({ onEntra }: { onEntra: (u: Utente) => void }) {
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState(false)
  const entra = (e: React.FormEvent) => {
    e.preventDefault()
    sbloccaAudio()
    const u = UTENTI_COMANDAPP.find((x) => x.utente === utente.trim().toLowerCase() && x.password === password)
    if (u) onEntra(u); else setErrore(true)
  }
  const campo = 'h-12 w-full rounded-xl border border-calce-200 bg-white px-4 text-base focus-visible:focus-ring'
  return (
    <form onSubmit={entra} className="mt-6 space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 text-center">
        <Umbrella className="mx-auto h-10 w-10 text-cabina" />
        <h1 className="mt-2 font-display text-2xl font-semibold">Ordina dal tuo ombrellone</h1>
        <p className="text-sm text-profondo/60">Accedi con le credenziali ricevute alla cassa.</p>
      </div>
      <input value={utente} onChange={(e) => { setUtente(e.target.value); setErrore(false) }} placeholder="Utente" autoCapitalize="none" autoComplete="username" className={campo} />
      <input value={password} onChange={(e) => { setPassword(e.target.value); setErrore(false) }} type="password" placeholder="Password" autoComplete="current-password" className={campo} />
      {errore && <p className="text-sm text-boa">Utente o password non corretti.</p>}
      <button className="h-12 w-full rounded-xl bg-cabina text-base font-semibold text-white hover:bg-profondo">Entra</button>
      <p className="pt-1 text-center text-xs text-profondo/45">Demo: {UTENTI_COMANDAPP[0].utente} / {UTENTI_COMANDAPP[0].password}</p>
    </form>
  )
}

function Area({ utente }: { utente: Utente }) {
  const { comande, inviaComanda, articoliBar, sezioniBar } = useDemoData()
  const [tab, setTab] = useState<'ordina' | 'ordini'>('ordina')
  // stesso listino del gestionale (Bar → Listino): solo articoli disponibili, categorie nell'ordine scelto
  const articoli = useMemo(() => articoliBar.filter((a) => a.disponibile !== false), [articoliBar])
  const categorie = useMemo(() => sezioniBar.filter((s) => articoli.some((a) => a.categoria === s.id)), [sezioniBar, articoli])
  const [scelta, setCat] = useState<CategoriaBar>()
  const cat = scelta && categorie.some((c) => c.id === scelta) ? scelta : categorie[0]?.id
  const [qta, setQta] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')

  const mie = comande.filter((c) => c.ombrellone === utente.ombrellone && c.origine === 'app')
  // "ding" quando una mia comanda diventa pronta
  const pronte = useRef(new Set(mie.filter((c) => c.stato === 'pronta').map((c) => c.id)))
  useEffect(() => {
    const nuove = mie.filter((c) => c.stato === 'pronta' && !pronte.current.has(c.id))
    nuove.forEach((c) => pronte.current.add(c.id))
    if (nuove.length) ding()
  }, [mie])

  const righe = articoli.filter((a) => qta[a.id]).map((a) => ({ articoloId: a.id, nome: a.nome, quantita: qta[a.id], prezzoUnitario: a.prezzoVendita }))
  const totale = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)
  const pezzi = righe.reduce((s, r) => s + r.quantita, 0)
  const cambia = (id: string, d: number) => setQta((q) => { const v = Math.max(0, (q[id] ?? 0) + d); const n = { ...q }; if (v) n[id] = v; else delete n[id]; return n })
  const invia = () => {
    if (!righe.length) return
    inviaComanda(utente.ombrellone, righe, note, { origine: 'app', cliente: utente.nome })
    ding(); setQta({}); setNote(''); setTab('ordini')
  }

  return (
    <div className="pb-28">
      <p className="mb-3 text-sm text-profondo/60">Ciao <b className="text-profondo">{utente.nome}</b>, ti portiamo tutto all'ombrellone {utente.ombrellone}.</p>
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-white p-1 text-sm font-semibold shadow-sm">
        <button onClick={() => setTab('ordina')} className={cn('rounded-lg py-2', tab === 'ordina' ? 'bg-profondo text-white' : 'text-profondo/60')}>Ordina</button>
        <button onClick={() => setTab('ordini')} className={cn('rounded-lg py-2', tab === 'ordini' ? 'bg-profondo text-white' : 'text-profondo/60')}>I miei ordini {mie.some((c) => c.stato !== 'pronta') && '•'}</button>
      </div>

      {tab === 'ordina' && (articoli.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-sm text-profondo/50 shadow-sm">Il bar non ha articoli disponibili al momento.</p> : (
        <>
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {categorie.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={cn('shrink-0 rounded-full px-4 py-1.5 text-sm font-medium', cat === c.id ? 'bg-cabina text-white' : 'bg-white text-profondo/70 shadow-sm')}>{c.nome}</button>
            ))}
          </div>
          <ul className="space-y-2">
            {articoli.filter((a) => a.categoria === cat).map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.nome}</p>
                  <p className="num text-sm text-profondo/55">{euroCent(a.prezzoVendita)}</p>
                </div>
                {qta[a.id] ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => cambia(a.id, -1)} className="grid h-9 w-9 place-content-center rounded-full bg-calce" aria-label="Meno"><Minus className="h-4 w-4" /></button>
                    <span className="num w-5 text-center font-bold">{qta[a.id]}</span>
                    <button onClick={() => cambia(a.id, 1)} className="grid h-9 w-9 place-content-center rounded-full bg-cabina text-white" aria-label="Più"><Plus className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => cambia(a.id, 1)} className="grid h-9 w-9 place-content-center rounded-full bg-cabina text-white" aria-label="Aggiungi"><Plus className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
          {pezzi > 0 && (
            <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-calce-200 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <div className="mx-auto max-w-md space-y-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (es. senza ghiaccio)" className="h-10 w-full rounded-lg border border-calce-200 px-3 text-sm" />
                <button onClick={invia} className="flex h-12 w-full items-center justify-between rounded-xl bg-boa px-4 font-semibold text-white">
                  <span className="inline-flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Ordina {pezzi} {pezzi === 1 ? 'articolo' : 'articoli'}</span>
                  <span className="num">{euroCent(totale)}</span>
                </button>
              </div>
            </div>
          )}
        </>
      ))}

      {tab === 'ordini' && (
        <div className="space-y-3">
          {mie.length === 0 && <p className="py-10 text-center text-sm text-profondo/50">Nessun ordine ancora.</p>}
          {mie.map((c) => {
            const passo = PASSI_COMANDA.indexOf(c.stato)
            return (
              <div key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-profondo/55">Ordine delle {c.ora}</span>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-bold', c.stato === 'pronta' ? 'bg-acqua text-white' : 'bg-tenda/30 text-profondo')}>{etichettaStatoComanda[c.stato]}</span>
                </div>
                <div className="mb-3 flex items-center">
                  {PASSI_COMANDA.map((s, i) => {
                    const Icona = icona[s]
                    return (
                      <div key={s} className="flex flex-1 items-center last:flex-none">
                        <span className={cn('grid h-8 w-8 place-content-center rounded-full', i <= passo ? 'bg-cabina text-white' : 'bg-calce text-profondo/35', i === passo && c.stato !== 'pronta' && 'animate-pulse')} title={etichettaStatoComanda[s]}>
                          {i < passo || c.stato === 'pronta' ? <Check className="h-4 w-4" /> : <Icona className="h-4 w-4" />}
                        </span>
                        {i < PASSI_COMANDA.length - 1 && <span className={cn('h-0.5 flex-1', i < passo ? 'bg-cabina' : 'bg-calce')} />}
                      </div>
                    )
                  })}
                </div>
                {c.stato === 'pronta' && <p className="mb-2 text-sm font-semibold text-acqua">Il tuo ordine è pronto: arriva all'ombrellone {c.ombrellone}!</p>}
                <ul className="space-y-0.5 text-sm text-profondo/75">
                  {c.righe.map((r) => <li key={r.articoloId} className="flex justify-between"><span>{r.quantita}× {r.nome}</span><span className="num">{euroCent(r.quantita * r.prezzoUnitario)}</span></li>)}
                </ul>
                <p className="num mt-2 border-t border-calce-200 pt-2 text-right font-bold">{euroCent(c.totale)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
