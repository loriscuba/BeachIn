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
import { InvitoNotifiche } from '@/components/AttivaNotifiche'
import { AnteprimaWhatsApp } from '@/components/AnteprimaWhatsApp'
import { prezzoLavagna } from '@/components/app/GestioneAppClienti'
import { EventoModal, FormRistorante, Sospese } from '@/pages/SitoAnteprima'
import { logoLido } from '@/assets/sito'

type Utente = (typeof UTENTI_COMANDAPP)[number]
type Sez = 'news' | 'ombrellone' | 'prenota' | 'eventi' | 'lavagna' | 'contatti'
const CHIAVE = 'comandapp.sessione.v1'
const icona: Record<StatoComanda, typeof Send> = { in_attesa: Send, presa_in_carico: ClipboardList, in_preparazione: ChefHat, pronta: Bell }
// stile pulito (spunto da app di viaggio): fondo chiaro, card bianche con ombra, petrolio come colore principale, tile colorate a rotazione (testo navy leggibile su tutte)
const TINTE = ['bg-tenda', 'bg-acqua', 'bg-rosa', 'bg-cielo']
const tinta = (i: number) => TINTE[i % TINTE.length]

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
    <div className="min-h-screen bg-carta text-profondo">
      <header className="sticky top-0 z-20 border-b border-profondo/10 bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={logoLido} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5 ring-2 ring-tenda" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em]">{config.nome}</p>
              <p className="text-xs capitalize text-profondo/60">{dataEstesa(config.oggi)}</p>
            </div>
          </div>
          {utente && (
            <div className="flex items-center gap-1">
              <button onClick={() => vai('ombrellone')} className="inline-flex items-center gap-1 rounded-full bg-laguna px-3 py-1 text-sm font-bold text-white"><Umbrella className="h-4 w-4" /> {utente.ombrellone}</button>
              <button onClick={esci} className="grid h-8 w-8 place-content-center rounded-full hover:bg-profondo/10" aria-label="Esci"><LogOut className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <PulsanteInstalla nome={config.nome} />
        <InvitoNotifiche app="clienti" titolo="Resta aggiornato" descrizione="Ricevi una notifica quando pubblichiamo una news o aggiorniamo la lavagna del giorno." />
        {sez === 'news' && <News scorciatoie={voci.filter((v) => v.id !== 'news' && v.id !== 'contatti')} vai={vai} />}
        {sez === 'ombrellone' && (utente ? <Area utente={utente} /> : <Login onEntra={(u) => { try { localStorage.setItem(CHIAVE, u.utente) } catch { /* */ } setUtente(u) }} />)}
        {sez === 'prenota' && <Prenota ristorante={ristorante} eventiOn={eventiOn} />}
        {sez === 'eventi' && <Eventi />}
        {sez === 'lavagna' && <Lavagna />}
        {sez === 'contatti' && <Contatti />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-profondo/10 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md gap-1 px-1.5 py-1.5">
          {voci.map((v) => {
            const Icona = v.icona
            const attiva = v.id === sez
            return (
              <button key={v.id} onClick={() => vai(v.id)} className={cn('relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10.5px] font-semibold transition-colors', attiva ? 'text-laguna' : 'text-profondo/50')}>
                <Icona className="h-5 w-5" />
                <span className="truncate">{v.etichetta}</span>
                {v.id === 'news' && ultimaNews > vista && <span className="absolute right-[calc(50%-14px)] top-2 h-2 w-2 rounded-full bg-laguna" />}
              </button>
            )
          })}
        </div>
      </nav>
      <AnteprimaWhatsApp />
    </div>
  )
}

/** Titolo di sezione: sottotitolo grigio sopra, titolo grande con la parola `accento` in petrolio. */
function Titolo({ children, accento, sotto }: { children: React.ReactNode; accento?: string; sotto?: string }) {
  return (
    <div className="mb-5 mt-2">
      {sotto && <p className="text-sm text-profondo/60">{sotto}</p>}
      <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{children}{accento && <> <span className="text-laguna">{accento}</span></>}</h1>
    </div>
  )
}

const vuoto = 'rounded-3xl bg-white shadow-[0_4px_20px_rgba(15,59,76,0.07)] p-6 text-center text-sm text-profondo/60'

/** Home: scorciatoie colorate alle sezioni (come le categorie delle app di viaggio) e poi le news. */
function News({ scorciatoie, vai }: { scorciatoie: { id: Sez; etichetta: string; icona: LucideIcon }[]; vai: (s: Sez) => void }) {
  const { notizie } = useDemoData()
  const lista = useMemo(() => [...notizie].sort((a, b) => Number(!!b.fissata) - Number(!!a.fissata) || b.ts - a.ts), [notizie])
  return (
    <div>
      <Titolo sotto="Benvenuto al Lido" accento="oggi?">Cosa ti serve</Titolo>
      {scorciatoie.length > 0 && (
        <div className="mb-6 grid grid-cols-4 gap-2">
          {scorciatoie.map((v, i) => {
            const Icona = v.icona
            return (
              <button key={v.id} onClick={() => vai(v.id)} className="flex flex-col items-center gap-1.5 text-xs font-medium">
                <span className={cn('grid h-14 w-14 place-content-center rounded-2xl', tinta(i))}><Icona className="h-6 w-6" /></span>
                {v.etichetta}
              </button>
            )
          })}
        </div>
      )}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">News dal Lido</h2>
        <span className="text-xs text-profondo/60">{lista.length} {lista.length === 1 ? 'notizia' : 'notizie'}</span>
      </div>
      {lista.length === 0 && <p className={vuoto}>Nessuna news per ora.</p>}
      <div className="space-y-3">
        {lista.map((n, i) => (
          <article key={n.id} className={cn('overflow-hidden rounded-3xl shadow-[0_4px_20px_rgba(15,59,76,0.07)]', n.fissata ? 'bg-laguna text-white' : 'bg-white')}>
            {n.foto && <img src={n.foto} alt="" className="max-h-64 w-full object-cover" />}
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium capitalize">
                {n.fissata
                  ? <span className="inline-flex items-center gap-1 rounded-full bg-tenda px-2 py-0.5 normal-case text-profondo"><Pin className="h-3 w-3" /> In evidenza</span>
                  : <span className={cn('rounded-full px-2 py-0.5 text-profondo', tinta(i))}>{dataEstesa(n.data)}</span>}
                {n.fissata && <span className="text-white/85">{dataEstesa(n.data)}</span>}
              </p>
              <h2 className="mt-2 text-lg font-bold leading-snug">{n.titolo}</h2>
              {n.testo && <p className={cn('mt-1 whitespace-pre-line text-sm', n.fissata ? 'text-white/90' : 'text-profondo/75')}>{n.testo}</p>}
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
      <Titolo sotto="Ti confermiamo noi" accento="posto">Prenota il tuo</Titolo>
      {opzioni.length > 1 && (
        <div className="mb-4 flex gap-2 text-sm font-semibold">
          <button onClick={() => setScelta('ristorante')} className={cn('h-10 rounded-full px-4', tipo === 'ristorante' ? 'bg-laguna text-white' : 'bg-tenda')}>Ristorante</button>
          <button onClick={() => setScelta('eventi')} className={cn('h-10 rounded-full px-4', tipo === 'eventi' ? 'bg-laguna text-white' : 'bg-acqua')}>Eventi</button>
        </div>
      )}
      {tipo === 'ristorante' && (canaliPrenotazione.ristorante
        ? <FormRistorante onInviato={() => undefined} />
        : <Sospese testo="Le prenotazioni online del ristorante sono momentaneamente sospese. Chiamaci per prenotare." />)}
      {tipo === 'eventi' && (!canaliPrenotazione.eventi
        ? <Sospese testo="Le prenotazioni online per gli eventi sono momentaneamente sospese. Contattaci per partecipare." />
        : prossimi.length === 0
          ? <p className={vuoto}>Nessun evento in programma al momento.</p>
          : <div className="space-y-3">{prossimi.map((e, i) => <SchedaEvento key={e.id} evento={e} indice={i} onApri={() => setAperto(e)} azione="Prenota" />)}</div>)}
      <EventoModal evento={aperto} prenotabile={canaliPrenotazione.eventi} onChiudi={() => setAperto(undefined)} onPrenotato={() => undefined} />
    </div>
  )
}

/** Card evento con foto grande e data in sovrimpressione (come le destinazioni delle app di viaggio). */
function SchedaEvento({ evento: e, indice = 0, onApri, azione, passato }: { evento: Evento; indice?: number; onApri: () => void; azione: string; passato?: boolean }) {
  return (
    <button onClick={onApri} className={cn('block w-full overflow-hidden rounded-3xl bg-white text-left shadow-[0_4px_20px_rgba(15,59,76,0.07)]', passato && 'opacity-75')}>
      <span className="relative block">
        {e.foto ? <img src={e.foto} alt="" className="h-40 w-full object-cover" /> : <span className={cn('grid h-40 w-full place-content-center', tinta(indice))}><PartyPopper className="h-9 w-9" /></span>}
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-profondo">{dataEstesa(e.data)}</span>
      </span>
      <span className="flex items-center gap-3 p-4">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold leading-tight">{e.nome}</span>
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-profondo/65"><Ticket className="h-3.5 w-3.5" /> {passato ? 'Concluso · guarda le foto' : e.prezzo ? `${euro(e.prezzo)} a persona` : 'Ingresso gratuito'}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-laguna px-4 py-2 text-sm font-semibold text-white">{azione}<ChevronRight className="h-4 w-4" /></span>
      </span>
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
      <Titolo sotto="Tornei, musica, cene sotto le stelle" accento="spiaggia">Eventi in</Titolo>
      {prossimi.length === 0 && <p className={cn(vuoto, 'mb-3')}>Nessun evento in programma: torna a trovarci presto!</p>}
      <div className="space-y-3">{prossimi.map((e, i) => <SchedaEvento key={e.id} evento={e} indice={i} onApri={() => setAperto(e)} azione="Dettagli" />)}</div>
      {passati.length > 0 && (
        <>
          <p className="mb-2 mt-6 text-sm text-profondo/60">Eventi passati</p>
          <div className="space-y-3">{passati.map((e, i) => <SchedaEvento key={e.id} evento={e} indice={i + 1} onApri={() => setAperto(e)} azione="Foto" passato />)}</div>
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
      <a href={urlPubblico('menu')} className="mt-4 flex items-center justify-between rounded-2xl bg-tenda px-4 py-4 font-semibold">
        <span className="inline-flex items-center gap-2 font-bold text-lg font-normal"><UtensilsCrossed className="h-5 w-5" /> Menu completo del ristorante</span>
        <ChevronRight className="h-5 w-5" />
      </a>
    </div>
  )
}

function Contatti() {
  const tel = config.telefono.replace(/\s/g, '')
  const wa = (config.whatsapp || config.telefono).replace(/[\s+]/g, '')
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
      <Titolo sotto="Siamo qui, sul mare di Savona" accento="trovarci">Vieni a</Titolo>
      <div className="divide-y divide-calce-200 overflow-hidden rounded-3xl bg-white shadow-[0_4px_20px_rgba(15,59,76,0.07)]">
        {righe.map((r, i) => {
          const Icona = r.icona
          return (
            <a key={r.testo} href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex items-center gap-3 px-4 py-3 active:bg-calce">
              <span className={cn('grid h-10 w-10 shrink-0 place-content-center rounded-full', tinta(i))}><Icona className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{r.testo}</span>{r.sotto && <span className="block text-xs text-profondo/65">{r.sotto}</span>}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-profondo/40" />
            </a>
          )
        })}
      </div>
      <div className="mt-4 rounded-2xl bg-acqua p-4">
        <p className="mb-2 inline-flex items-center gap-2 font-bold text-lg"><Clock className="h-5 w-5" /> Orari</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-profondo/75">Spiaggia</dt><dd className="num">{o.apertura} – {o.chiusura} <span className="text-profondo/75">({o.stagioneSpiaggia})</span></dd>
          <dt className="text-profondo/75">Bar</dt><dd className="num">{o.barApertura} – {o.barChiusura}</dd>
          <dt className="text-profondo/75">Pranzo</dt><dd className="num">{o.ristorantePranzo}</dd>
          <dt className="text-profondo/75">Cena</dt><dd className="num">{o.ristoranteCena}</dd>
        </dl>
        {o.nota && <p className="mt-2 text-xs text-profondo/75">{o.nota}</p>}
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
    <form onSubmit={entra} className="mt-6 space-y-3 rounded-3xl bg-white shadow-[0_4px_20px_rgba(15,59,76,0.07)] p-5">
      <div className="mb-2 text-center">
        <span className="mx-auto grid h-14 w-14 place-content-center rounded-full bg-tenda"><Umbrella className="h-7 w-7" /></span>
        <h1 className="mt-3 font-bold text-3xl leading-tight">Ordina dal tuo <span className="text-laguna">ombrellone</span></h1>
        <p className="text-sm text-profondo/60">Accedi con le credenziali ricevute alla cassa.</p>
      </div>
      <input value={utente} onChange={(e) => { setUtente(e.target.value); setErrore(false) }} placeholder="Utente" autoCapitalize="none" autoComplete="username" className={campo} />
      <input value={password} onChange={(e) => { setPassword(e.target.value); setErrore(false) }} type="password" placeholder="Password" autoComplete="current-password" className={campo} />
      {errore && <p className="text-sm text-boa">Utente o password non corretti.</p>}
      <button className="h-12 w-full rounded-full bg-laguna text-base font-semibold text-white hover:bg-profondo">Entra</button>
      <p className="pt-1 text-center text-xs text-profondo/60">Demo: {UTENTI_COMANDAPP[0].utente} / {UTENTI_COMANDAPP[0].password}</p>
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
      <div className="mb-4 mt-2">
        <p className="text-sm text-profondo/60">Ti portiamo tutto al posto</p>
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">Ciao, <span className="text-laguna">{utente.nome}.</span></h1>
      </div>
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-laguna px-4 py-3 text-white">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">Il tuo posto oggi</span>
        <span className="inline-flex items-center gap-1.5 font-bold text-2xl"><Umbrella className="h-5 w-5" /> {utente.ombrellone}</span>
      </div>
      <div className="mb-4 flex gap-2 text-sm font-semibold">
        <button onClick={() => setTab('ordina')} className={cn('h-10 rounded-full px-4', tab === 'ordina' ? 'bg-laguna text-white' : 'bg-white')}>Ordina</button>
        <button onClick={() => setTab('ordini')} className={cn('h-10 rounded-full px-4', tab === 'ordini' ? 'bg-laguna text-white' : 'bg-white')}>I miei ordini {mie.some((c) => c.stato !== 'pronta') && '•'}</button>
      </div>

      {tab === 'ordina' && (articoli.length === 0 ? <p className={vuoto}>Il bar non ha articoli disponibili al momento.</p> : (
        <>
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {categorie.map((c, i) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={cn('h-10 shrink-0 rounded-full px-4 text-sm font-semibold', cat === c.id ? 'bg-laguna text-white' : tinta(i))}>{c.nome}</button>
            ))}
          </div>
          <ul className="divide-y divide-profondo/10 border-y border-profondo/10">
            {articoli.filter((a) => a.categoria === cat).map((a, i) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <p className="min-w-0 flex-1 font-bold text-lg leading-tight">{a.nome}</p>
                <span className={cn('num rounded-lg px-2.5 py-1 text-sm font-semibold', tinta(i))}>{euroCent(a.prezzoVendita)}</span>
                {qta[a.id] ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => cambia(a.id, -1)} className="grid h-10 w-10 place-content-center rounded-full bg-white" aria-label="Meno"><Minus className="h-4 w-4" /></button>
                    <span className="num w-5 text-center font-bold">{qta[a.id]}</span>
                    <button onClick={() => cambia(a.id, 1)} className="grid h-10 w-10 place-content-center rounded-full bg-laguna text-white" aria-label="Più"><Plus className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => cambia(a.id, 1)} className="grid h-10 w-10 place-content-center rounded-full bg-laguna text-white" aria-label="Aggiungi"><Plus className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
          {pezzi > 0 && (
            <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 border-t border-profondo/10 bg-carta p-3">
              <div className="mx-auto max-w-md space-y-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (es. senza ghiaccio)" className="h-10 w-full rounded-full border border-profondo/15 bg-white px-4 text-sm" />
                <button onClick={invia} className="flex h-12 w-full items-center justify-between rounded-full bg-laguna px-5 font-semibold text-white">
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
          {mie.length === 0 && <p className="py-10 text-center text-sm text-profondo/60">Nessun ordine ancora.</p>}
          {mie.map((c) => {
            const passo = PASSI_COMANDA.indexOf(c.stato)
            return (
              <div key={c.id} className="rounded-3xl bg-white shadow-[0_4px_20px_rgba(15,59,76,0.07)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold text-lg">Ordine delle {c.ora}</span>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-bold text-profondo', c.stato === 'pronta' ? 'bg-acqua' : 'bg-tenda')}>{etichettaStatoComanda[c.stato]}</span>
                </div>
                <div className="mb-3 flex items-center">
                  {PASSI_COMANDA.map((s, i) => {
                    const Icona = icona[s]
                    return (
                      <div key={s} className="flex flex-1 items-center last:flex-none">
                        <span className={cn('grid h-8 w-8 place-content-center rounded-full', i <= passo ? 'bg-laguna text-white' : 'bg-calce text-profondo/40', i === passo && c.stato !== 'pronta' && 'animate-pulse')} title={etichettaStatoComanda[s]}>
                          {i < passo || c.stato === 'pronta' ? <Check className="h-4 w-4" /> : <Icona className="h-4 w-4" />}
                        </span>
                        {i < PASSI_COMANDA.length - 1 && <span className={cn('h-0.5 flex-1', i < passo ? 'bg-laguna' : 'bg-calce')} />}
                      </div>
                    )
                  })}
                </div>
                {c.stato === 'pronta' && <p className="mb-2 rounded-xl bg-acqua px-3 py-2 text-sm font-semibold">Il tuo ordine è pronto: arriva all'ombrellone {c.ombrellone}!</p>}
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
