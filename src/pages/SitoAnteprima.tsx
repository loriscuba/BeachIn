import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Umbrella, Home, Coffee, UtensilsCrossed, Waves, Car, Star, Phone, Mail, MapPin,
  Clock, Check, Inbox, CalendarDays, Menu as MenuIcon, X, Sparkles, Ticket,
} from 'lucide-react'
import type { Evento, FilaId, Periodo, Piatto, StatoSito, Turno, TipologiaPostazione, VoceTariffa } from '@/data/types'
import { getDisponibilitaSito, getListinoPubblicato, getMenu, getStatoSito } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Logo } from '@/components/layout/Logo'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { euro, dataEstesa, data as fmtData, giornoMese } from '@/lib/formatters'
import { etichettePeriodo, etichetteCategoriaPiatto } from '@/lib/etichette'
import { cn } from '@/lib/cn'

const servizi = [
  { icona: Umbrella, nome: 'Ombrelloni e gazebo', desc: '180 postazioni su 9 file, dalla prima fila al fondo.' },
  { icona: Home, nome: 'Cabine e armadietti', desc: '40 cabine e servizio spogliatoi.' },
  { icona: Coffee, nome: 'Bar', desc: 'Colazioni, aperitivi e servizio in spiaggia.' },
  { icona: UtensilsCrossed, nome: 'Ristorante', desc: 'Cucina di mare a pranzo e a cena.' },
  { icona: Waves, nome: 'Noleggi', desc: 'SUP, pedalò, canoa e kayak.' },
  { icona: Car, nome: 'Parcheggio', desc: 'Posti riservati per i nostri clienti.' },
]
const file: FilaId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
const periodi: Periodo[] = ['bassa', 'media', 'alta', 'altissima']
const nav = [
  ['servizi', 'Servizi'], ['listino', 'Listino'], ['ristorante', 'Ristorante'],
  ['prenota', 'Prenota'], ['eventi', 'Eventi'], ['contatti', 'Contatti'],
]

export default function SitoAnteprima() {
  const { eventi, postaCliente, canaliPrenotazione, galleria } = useDemoData()
  const [sito, setSito] = useState<StatoSito>()
  const [disp, setDisp] = useState<{ libere: number; totali: number; occupazione: number }>()
  const [listino, setListino] = useState<VoceTariffa[]>([])
  const [menu, setMenu] = useState<Piatto[]>([])
  const [postaAperta, setPostaAperta] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)
  const [toast, setToast] = useState<string>()
  const [eventoSel, setEventoSel] = useState<Evento>()

  useEffect(() => {
    Promise.all([getStatoSito(), getDisponibilitaSito(), getListinoPubblicato(), getMenu()]).then(
      ([s, d, l, m]) => { setSito(s); setDisp(d); setListino(l); setMenu(m) }
    )
  }, [])

  const matrice = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of listino) if (v.durata === 'giornaliera' && v.tipologia === 'ombrellone_2_lettini') m.set(`${v.fila}|${v.periodo}`, v.prezzo)
    return m
  }, [listino])

  const nonLette = postaCliente.filter((m) => !m.letto).length
  const oggi = config.stagione.oggi
  const eventiFuturi = [...eventi].filter((e) => e.data >= oggi).sort((a, b) => a.data.localeCompare(b.data))
  const eventiPassati = [...eventi].filter((e) => e.data < oggi).sort((a, b) => b.data.localeCompare(a.data))
  // In vetrina: prima i prossimi eventi, poi quelli appena conclusi (con foto/recap).
  const eventiVetrina = [...eventiFuturi, ...eventiPassati].slice(0, 8)

  const mostraToast = (t: string) => { setToast(t); window.setTimeout(() => setToast(undefined), 6000) }

  const scrollTo = (id: string) => {
    setMenuMobile(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-calce text-profondo">
      {/* Barra */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-profondo">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <button onClick={() => scrollTo('top')} className="shrink-0"><Logo /></button>
          <nav className="hidden items-center gap-5 lg:flex">
            {nav.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-sm font-medium text-white/70 hover:text-white">{label}</button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPostaAperta(true)}
              className="relative inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              <Inbox className="h-4 w-4" /> <span className="hidden sm:inline">La mia posta</span>
              {nonLette > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-boa px-1 text-[11px] font-bold text-white">{nonLette}</span>}
            </button>
            <Link to="/sito" className="hidden items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 sm:inline-flex">
              <ArrowLeft className="h-4 w-4" /> Gestionale
            </Link>
            <button onClick={() => setMenuMobile((v) => !v)} className="rounded-lg p-2 text-white lg:hidden" aria-label="Menu">
              {menuMobile ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuMobile && (
          <div className="border-t border-white/10 px-5 py-2 lg:hidden">
            {nav.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full py-2 text-left text-sm text-white/80">{label}</button>
            ))}
            <Link to="/sito" className="block py-2 text-sm text-tenda">Vai al gestionale →</Link>
          </div>
        )}
      </header>

      <div id="top" />

      {/* Hero */}
      <section className="relative overflow-hidden bg-profondo text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-cabina/30 to-profondo-900" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 text-center sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-tenda">{config.localita}</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">{sito?.home.titolo ?? config.nome}</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/75">{sito?.home.testo}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => scrollTo('prenota')} className="rounded-lg bg-boa px-5 py-3 font-semibold text-white transition-colors hover:bg-boa/90">Prenota l’ombrellone</button>
            <button onClick={() => scrollTo('ristorante')} className="rounded-lg bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15">Prenota un tavolo</button>
          </div>
          {disp && (
            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acqua opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-acqua" /></span>
              <span className="text-sm"><span className="num font-bold">{disp.libere} ombrelloni liberi</span> oggi · disponibilità in tempo reale</span>
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-16 px-5 py-16">
        {/* Servizi */}
        <section id="servizi">
          <Titolo occhiello="I servizi" titolo="Tutto quello che ti serve in spiaggia" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servizi.map((s) => (
              <div key={s.nome} className="rounded-2xl border border-calce-200 bg-white p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-cabina/10 text-cabina"><s.icona className="h-5 w-5" /></span>
                <h3 className="mt-3 font-bold text-profondo">{s.nome}</h3>
                <p className="mt-1 text-sm text-profondo/60">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Listino */}
        <section id="listino">
          <Titolo occhiello="Listino" titolo="Prezzi ombrellone + 2 lettini" nota="Tariffa giornaliera per fila e periodo. Prezzi sincronizzati col gestionale." />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-calce-200 bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b border-calce-200 text-left">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">Fila</th>
                {periodi.map((pp) => <th key={pp} className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{etichettePeriodo[pp]}</th>)}
              </tr></thead>
              <tbody>
                {file.map((f) => (
                  <tr key={f} className="border-b border-calce-200/70 last:border-0">
                    <td className="px-4 py-2.5 font-bold text-profondo/70">Fila {f}</td>
                    {periodi.map((pp) => <td key={pp} className="num px-4 py-2.5 text-right font-medium text-profondo">{matrice.has(`${f}|${pp}`) ? euro(matrice.get(`${f}|${pp}`)!) : '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ristorante */}
        <section id="ristorante" className="grid gap-8 lg:grid-cols-2">
          <div>
            <Titolo occhiello="Ristorante" titolo="Cucina di mare, vista mare" />
            <ul className="mt-6 divide-y divide-calce-200 rounded-2xl border border-calce-200 bg-white">
              {menu.filter((p) => ['antipasti', 'primi', 'secondi'].includes(p.categoria)).slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div><p className="text-sm font-medium text-profondo">{p.nome}</p><p className="text-xs text-profondo/45">{etichetteCategoriaPiatto[p.categoria]}</p></div>
                  <span className="num text-sm font-semibold text-profondo">{euro(p.prezzo)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:pt-14">
            {canaliPrenotazione.ristorante
              ? <FormRistorante onInviato={(nome) => { mostraToast(`Richiesta tavolo inviata, ${nome}! Controlla “La mia posta”.`); setPostaAperta(true) }} />
              : <Sospese testo="Le prenotazioni del ristorante online sono momentaneamente sospese. Chiamaci per riservare un tavolo." />}
          </div>
        </section>

        {/* Prenota ombrellone */}
        <section id="prenota" className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Titolo occhiello="Prenota" titolo="Richiedi il tuo ombrellone" />
            {canaliPrenotazione.ombrelloni
              ? <FormOmbrellone onInviato={(nome) => { mostraToast(`Richiesta ombrellone inviata, ${nome}! Controlla “La mia posta”.`); setPostaAperta(true) }} />
              : <Sospese className="mt-5" testo="Le prenotazioni online degli ombrelloni sono momentaneamente sospese. Passa in cassa o chiamaci per la disponibilità." />}
          </div>
          <div className="lg:col-span-2">
            {disp && (
              <div className="flex h-full flex-col justify-center rounded-2xl bg-profondo p-6 text-white">
                <p className="text-sm text-white/60">Disponibilità di oggi</p>
                <p className="num mt-1 text-5xl font-extrabold">{disp.libere}</p>
                <p className="text-white/70">ombrelloni liberi su {disp.totali}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-acqua" style={{ width: `${disp.occupazione * 100}%` }} /></div>
                <p className="mt-2 text-xs text-white/50">{dataEstesa(config.stagione.oggi)}</p>
              </div>
            )}
          </div>
        </section>

        {/* Eventi */}
        <section id="eventi">
          <Titolo occhiello="Eventi" titolo="Cosa succede in spiaggia" nota="Aggiornati dal gestionale in tempo reale." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {eventiVetrina.length === 0 && <p className="text-sm text-profondo/50">Nessun evento al momento.</p>}
            {eventiVetrina.map((e) => {
              const passato = e.data < oggi
              const nFoto = e.galleria?.length ?? 0
              return (
              <button
                key={e.id}
                onClick={() => setEventoSel(e)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-calce-200 bg-white text-left transition-shadow hover:shadow-pop"
              >
                <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-cabina to-profondo">
                  {e.foto && <img src={e.foto} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-profondo backdrop-blur"><CalendarDays className="h-3.5 w-3.5" /> {giornoMese(e.data)}</span>
                  {passato
                    ? <span className="absolute right-2 top-2 rounded-full bg-profondo/80 px-2 py-0.5 text-xs font-bold text-white backdrop-blur">Concluso</span>
                    : !!e.prezzo && <span className="absolute right-2 top-2 rounded-full bg-boa px-2 py-0.5 text-xs font-bold text-white">{euro(e.prezzo)}</span>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-bold text-profondo">{e.nome}</h3>
                  <p className="mt-1 flex-1 text-sm text-profondo/60 line-clamp-2">{e.descrizione}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cabina">
                    {passato ? (nFoto > 0 ? `Rivedi le foto (${nFoto}) →` : 'Rivivi l’evento →') : (canaliPrenotazione.eventi ? 'Scopri e prenota →' : 'Scopri di più →')}
                  </span>
                </div>
              </button>
              )
            })}
          </div>
        </section>

        {/* Galleria */}
        {galleria.length > 0 && (
          <section id="galleria">
            <Titolo occhiello="Galleria" titolo="Il nostro stabilimento" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {galleria.map((f, i) => (
                <div key={f.id} className="relative aspect-[4/3] overflow-hidden rounded-xl" style={{ background: f.immagine ? undefined : ['#2E7D9A', '#7FB7A8', '#F2C14E', '#E4572E'][i % 4] }}>
                  {f.immagine && <img src={f.immagine} alt={f.titolo} className="h-full w-full object-cover" />}
                  {f.titolo && (
                    <div className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-profondo-900/60 to-transparent p-2">
                      <span className="text-xs font-medium text-white">{f.titolo}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recensioni */}
        {sito && (
          <section>
            <Titolo occhiello="Dicono di noi" titolo="Le recensioni dei clienti" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sito.recensioni.filter((r) => r.pubblicata).slice(0, 6).map((r) => (
                <div key={r.id} className="rounded-2xl border border-calce-200 bg-white p-5">
                  <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={i < r.voto ? 'h-4 w-4 fill-tenda text-tenda' : 'h-4 w-4 text-calce-300'} />)}</div>
                  <p className="mt-2 text-sm text-profondo/75">“{r.testo}”</p>
                  <p className="mt-2 text-xs font-medium text-profondo/50">— {r.autore}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contatti */}
        <section id="contatti" className="grid gap-6 rounded-2xl bg-profondo p-8 text-white lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Dove siamo</h2>
            <ul className="mt-4 space-y-2 text-white/80">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-tenda" /> {config.indirizzo}, {config.localita}</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-tenda" /> <span className="num">{config.telefono}</span></li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-tenda" /> {config.email}</li>
              <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-tenda" /> {config.orari.apertura}–{config.orari.chiusura}</li>
            </ul>
          </div>
          <div className="grid place-items-center rounded-xl bg-white/5"><span className="py-10 text-sm text-white/40">Mappa dello stabilimento</span></div>
        </section>
      </main>

      <footer className="border-t border-calce-200 bg-white py-6 text-center text-xs text-profondo/45">
        {config.nome} · {config.localita} · P.IVA {config.partitaIva} — Sito dimostrativo generato dal gestionale BeachIn
      </footer>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 anim-pop">
          <div className="flex items-center gap-2 rounded-full bg-profondo px-4 py-2.5 text-sm text-white shadow-pop">
            <Check className="h-4 w-4 text-acqua" /> {toast}
          </div>
        </div>
      )}

      {/* La mia posta (cliente) */}
      <PostaCliente aperta={postaAperta} onChiudi={() => setPostaAperta(false)} />

      {/* Dettaglio evento + prenotazione */}
      <EventoModal
        evento={eventoSel}
        prenotabile={canaliPrenotazione.eventi}
        onChiudi={() => setEventoSel(undefined)}
        onPrenotato={(nome) => { setEventoSel(undefined); mostraToast(`Richiesta di partecipazione inviata, ${nome}! Controlla “La mia posta”.`); setPostaAperta(true) }}
      />
    </div>
  )
}

function EventoModal({ evento: e, prenotabile, onChiudi, onPrenotato }: { evento?: Evento; prenotabile: boolean; onChiudi: () => void; onPrenotato: (nome: string) => void }) {
  const { inviaRichiestaEvento } = useDemoData()
  const [f, setF] = useState({ nome: '', email: '', telefono: '', persone: '2', note: '' })
  const [inviato, setInviato] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const valido = f.nome.trim() && f.email.trim()
  const passato = !!e && e.data < config.stagione.oggi

  // reset del form quando cambia l'evento selezionato
  useEffect(() => { setF({ nome: '', email: '', telefono: '', persone: '2', note: '' }); setInviato(false) }, [e?.id])

  const invia = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!e) return
    inviaRichiestaEvento({
      nome: f.nome.trim(), email: f.email.trim(), telefono: f.telefono.trim(),
      eventoId: e.id, eventoNome: e.nome, eventoData: e.data,
      persone: Math.max(1, Number(f.persone) || 1), note: f.note.trim() || undefined,
    })
    setInviato(true)
    onPrenotato(f.nome.trim().split(' ')[0])
  }

  return (
    <Modal aperto={!!e} onChiudi={onChiudi} titolo={e?.nome ?? ''}>
      {e && (
        <div className="space-y-4">
          {e.foto && <img src={e.foto} alt="" className="-mt-1 h-48 w-full rounded-xl object-cover" />}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tenda/20 px-2.5 py-1 text-xs font-semibold text-[#7A5A12]"><CalendarDays className="h-3.5 w-3.5" /> <span className="capitalize">{dataEstesa(e.data)}</span></span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cabina/10 px-2.5 py-1 text-xs font-semibold text-cabina"><Ticket className="h-3.5 w-3.5" /> {e.prezzo ? `${euro(e.prezzo)} a persona` : 'Ingresso gratuito'}</span>
          </div>
          <p className="whitespace-pre-line text-sm text-profondo/75">{e.descrizione}</p>

          {e.galleria && e.galleria.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-profondo/45">Foto dell’evento</p>
              <div className="grid grid-cols-3 gap-2">
                {e.galleria.map((src, i) => (
                  <img key={i} src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}

          {passato ? (
            <div className="rounded-2xl border border-calce-200 bg-calce/40 p-4 text-sm text-profondo/70">Evento concluso — grazie a chi ha partecipato! Qui sopra trovi le foto.</div>
          ) : !prenotabile ? (
            <Sospese testo="Le prenotazioni online per gli eventi sono momentaneamente sospese. Contattaci per partecipare." />
          ) : inviato ? (
            <div className="rounded-2xl border border-acqua/40 bg-acqua/10 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-acqua text-white"><Check className="h-5 w-5" /></span>
                <div><p className="font-semibold text-profondo">Richiesta inviata!</p><p className="text-sm text-profondo/60">Trovi la ricevuta ne “La mia posta”. Ti confermiamo la partecipazione dal gestionale.</p></div>
              </div>
            </div>
          ) : (
            <form onSubmit={invia} className="grid grid-cols-2 gap-3 rounded-2xl border border-calce-200 bg-calce/40 p-4">
              <p className="col-span-2 flex items-center gap-1.5 font-bold text-profondo"><Ticket className="h-4 w-4 text-cabina" /> Prenota la tua partecipazione</p>
              <Campo label="Nome e cognome" span2><input required className={pc} value={f.nome} onChange={(ev) => set('nome', ev.target.value)} placeholder="Mario Rossi" /></Campo>
              <Campo label="Email"><input type="email" required className={pc} value={f.email} onChange={(ev) => set('email', ev.target.value)} placeholder="tu@email.it" /></Campo>
              <Campo label="Telefono"><input className={pc} value={f.telefono} onChange={(ev) => set('telefono', ev.target.value)} placeholder="340 1234567" /></Campo>
              <Campo label="Persone"><input type="number" min={1} className={pc} value={f.persone} onChange={(ev) => set('persone', ev.target.value)} /></Campo>
              <Campo label="Note"><input className={pc} value={f.note} onChange={(ev) => set('note', ev.target.value)} placeholder="facoltative" /></Campo>
              <button type="submit" disabled={!valido} className="col-span-2 mt-1 h-11 rounded-lg bg-boa font-semibold text-white transition-colors hover:bg-boa/90 disabled:opacity-50">Invia richiesta</button>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}

function PostaCliente({ aperta, onChiudi }: { aperta: boolean; onChiudi: () => void }) {
  const { postaCliente, segnaEmailLetta } = useDemoData()
  const [aperto, setAperto] = useState<string>()
  return (
    <Drawer aperto={aperta} onChiudi={onChiudi} titolo="La mia posta" sottotitolo={`${postaCliente.length} messaggi · casella cliente`}>
      {postaCliente.length === 0 ? (
        <div className="grid place-items-center py-16 text-center text-profondo/50">
          <Inbox className="mb-2 h-8 w-8" />
          <p className="text-sm">Nessun messaggio.</p>
          <p className="text-xs">Invia una richiesta di prenotazione: qui arriveranno ricevute e conferme.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {postaCliente.map((m) => {
            const open = aperto === m.id
            return (
              <li key={m.id} className="overflow-hidden rounded-lg border border-calce-200 bg-white">
                <button
                  onClick={() => { setAperto(open ? undefined : m.id); if (!m.letto) segnaEmailLetta(m.id) }}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
                >
                  <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', m.letto ? 'bg-transparent' : 'bg-boa')} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn('truncate text-sm', m.letto ? 'font-medium text-profondo' : 'font-bold text-profondo')}>{m.oggetto}</span>
                      <span className="num shrink-0 text-[11px] text-profondo/45">{fmtData(m.data)}</span>
                    </span>
                    <span className="truncate text-xs text-profondo/50">da {m.da}</span>
                  </span>
                </button>
                {open && <div className="whitespace-pre-line border-t border-calce-200 bg-calce/40 px-3 py-2.5 text-sm text-profondo/80">{m.corpo}</div>}
              </li>
            )
          })}
        </ul>
      )}
    </Drawer>
  )
}

// ————————————————— Form di prenotazione —————————————————

function FormOmbrellone({ onInviato }: { onInviato: (nome: string) => void }) {
  const { inviaRichiestaOmbrellone } = useDemoData()
  const oggi = config.stagione.oggi
  const [f, setF] = useState({ nome: '', email: '', telefono: '', dal: oggi, al: oggi, tipologia: 'ombrellone_2_lettini' as TipologiaPostazione, persone: '2' })
  const [inviato, setInviato] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const valido = f.nome.trim() && f.email.trim()

  if (inviato) return <Successo testo="La tua richiesta di ombrellone è partita. Trovi la ricevuta ne “La mia posta” — appena la confermiamo dal gestionale ricevi l’email di conferma." onAltro={() => setInviato(false)} />

  return (
    <form onSubmit={(e) => { e.preventDefault(); inviaRichiestaOmbrellone({ nome: f.nome.trim(), email: f.email.trim(), telefono: f.telefono.trim(), dal: f.dal, al: f.al, tipologiaPostazione: f.tipologia, persone: Math.max(1, Number(f.persone) || 1) }); setInviato(true); onInviato(f.nome.trim().split(' ')[0]) }}
      className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-calce-200 bg-white p-5">
      <Campo label="Nome e cognome" span2><input required className={pc} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Mario Rossi" /></Campo>
      <Campo label="Email"><input type="email" required className={pc} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.it" /></Campo>
      <Campo label="Telefono"><input className={pc} value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="340 1234567" /></Campo>
      <Campo label="Dal"><input type="date" className={pc} value={f.dal} onChange={(e) => set('dal', e.target.value)} /></Campo>
      <Campo label="Al"><input type="date" className={pc} value={f.al} onChange={(e) => set('al', e.target.value)} /></Campo>
      <Campo label="Tipologia">
        <select className={pc} value={f.tipologia} onChange={(e) => set('tipologia', e.target.value)}>
          <option value="ombrellone_2_lettini">Ombrellone + 2 lettini</option>
          <option value="ombrellone_2_sdraio">Ombrellone + 2 sdraio</option>
          <option value="ombrellone_lettino_sdraio">Ombrellone + lettino e sdraio</option>
          <option value="gazebo">Gazebo</option>
          <option value="tenda">Tenda</option>
        </select>
      </Campo>
      <Campo label="Persone"><input type="number" min={1} className={pc} value={f.persone} onChange={(e) => set('persone', e.target.value)} /></Campo>
      <button type="submit" disabled={!valido} className="col-span-2 mt-1 h-11 rounded-lg bg-boa font-semibold text-white transition-colors hover:bg-boa/90 disabled:opacity-50">Invia richiesta</button>
    </form>
  )
}

function FormRistorante({ onInviato }: { onInviato: (nome: string) => void }) {
  const { inviaRichiestaRistorante } = useDemoData()
  const oggi = config.stagione.oggi
  const [f, setF] = useState({ nome: '', email: '', telefono: '', data: oggi, turno: 'cena' as Turno, coperti: '2', note: '' })
  const [inviato, setInviato] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const valido = f.nome.trim() && f.email.trim()

  if (inviato) return <Successo testo="La tua richiesta di tavolo è partita. Trovi la ricevuta ne “La mia posta”; ti confermiamo il tavolo dal gestionale." onAltro={() => setInviato(false)} />

  return (
    <form onSubmit={(e) => { e.preventDefault(); inviaRichiestaRistorante({ nome: f.nome.trim(), email: f.email.trim(), telefono: f.telefono.trim(), data: f.data, turno: f.turno, coperti: Math.max(1, Number(f.coperti) || 1), note: f.note.trim() || undefined }); setInviato(true); onInviato(f.nome.trim().split(' ')[0]) }}
      className="grid grid-cols-2 gap-3 rounded-2xl border border-calce-200 bg-white p-5">
      <p className="col-span-2 font-bold text-profondo">Prenota un tavolo</p>
      <Campo label="Nome e cognome" span2><input required className={pc} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Mario Rossi" /></Campo>
      <Campo label="Email"><input type="email" required className={pc} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.it" /></Campo>
      <Campo label="Telefono"><input className={pc} value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="340 1234567" /></Campo>
      <Campo label="Data"><input type="date" className={pc} value={f.data} onChange={(e) => set('data', e.target.value)} /></Campo>
      <Campo label="Turno">
        <select className={pc} value={f.turno} onChange={(e) => set('turno', e.target.value)}><option value="pranzo">Pranzo</option><option value="cena">Cena</option></select>
      </Campo>
      <Campo label="Coperti" span2><input type="number" min={1} className={pc} value={f.coperti} onChange={(e) => set('coperti', e.target.value)} /></Campo>
      <button type="submit" disabled={!valido} className="col-span-2 mt-1 h-11 rounded-lg bg-boa font-semibold text-white transition-colors hover:bg-boa/90 disabled:opacity-50">Invia richiesta</button>
    </form>
  )
}

function Successo({ testo, onAltro }: { testo: string; onAltro: () => void }) {
  return (
    <div className="mt-5 rounded-2xl border border-acqua/40 bg-acqua/10 p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-acqua text-white"><Check className="h-5 w-5" /></span>
        <div><p className="font-semibold text-profondo">Richiesta inviata!</p><p className="text-sm text-profondo/60">{testo}</p></div>
      </div>
      <button onClick={onAltro} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cabina hover:underline"><Sparkles className="h-4 w-4" /> Invia un’altra richiesta</button>
    </div>
  )
}

function Sospese({ testo, className }: { testo: string; className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border border-tenda/50 bg-tenda/10 p-5', className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tenda/30 text-[#7A5A12]"><Clock className="h-5 w-5" /></span>
      <div>
        <p className="font-semibold text-profondo">Prenotazioni online sospese</p>
        <p className="mt-0.5 text-sm text-profondo/65">{testo}</p>
      </div>
    </div>
  )
}

function Titolo({ occhiello, titolo, nota }: { occhiello: string; titolo: string; nota?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cabina">{occhiello}</p>
      <h2 className="mt-1 text-2xl font-bold text-profondo sm:text-3xl">{titolo}</h2>
      {nota && <p className="mt-1 text-sm text-profondo/55">{nota}</p>}
    </div>
  )
}

const pc = 'h-10 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring'

function Campo({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn('block', span2 && 'col-span-2')}>
      <span className="mb-1 block text-xs font-medium text-profondo/60">{label}</span>
      {children}
    </label>
  )
}
