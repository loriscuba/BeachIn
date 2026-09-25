import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowDown, ArrowRight, Umbrella, Home, Coffee, UtensilsCrossed, Waves, Car, Star, Phone, Mail, MapPin,
  Clock, Check, Inbox, CalendarDays, Menu as MenuIcon, X, Sparkles, Ticket, ChevronLeft, ChevronRight, Quote, Sun,
} from 'lucide-react'
import type { Evento, FilaId, Periodo, StatoSito, Turno, TipologiaPostazione, VoceTariffa } from '@/data/types'
import { getDisponibilitaSito, getListinoPubblicato, getStatoSito } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { fotoSito } from '@/assets/sito'
import { Logo } from '@/components/layout/Logo'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { euro, dataEstesa, data as fmtData } from '@/lib/formatters'
import { etichettePeriodo, etichetteCategoriaPiatto } from '@/lib/etichette'
import { cn } from '@/lib/cn'

const file: FilaId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
const periodi: Periodo[] = ['bassa', 'media', 'alta', 'altissima']
const nav = [
  ['servizi', 'Servizi'], ['ristorante', 'Ristorante'], ['prenota', 'Prenota'],
  ['listino', 'Listino'], ['eventi', 'Eventi'], ['galleria', 'Galleria'], ['contatti', 'Contatti'],
]
const nastro = ['Ombrelloni fronte mare', 'Ristorante di pesce', 'Bar dall’alba a mezzanotte', 'Beach volley', 'Aperitivi al tramonto', 'Cabine e docce calde', 'SUP e pedalò', 'Eventi tutta l’estate']
const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export default function SitoAnteprima() {
  const { eventi, postaCliente, canaliPrenotazione, galleria, menu } = useDemoData()
  const [sito, setSito] = useState<StatoSito>()
  const [disp, setDisp] = useState<{ libere: number; totali: number; occupazione: number }>()
  const [listino, setListino] = useState<VoceTariffa[]>([])
  const [postaAperta, setPostaAperta] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)
  const [toast, setToast] = useState<string>()
  const [eventoSel, setEventoSel] = useState<Evento>()
  const [scrollato, setScrollato] = useState(false)
  const [oltreHero, setOltreHero] = useState(false)
  const [foto, setFoto] = useState<number>()
  const heroImg = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([getStatoSito(), getDisponibilitaSito(), getListinoPubblicato()]).then(
      ([s, d, l]) => { setSito(s); setDisp(d); setListino(l) }
    )
  }, [])

  // Barra che si riempie allo scroll + parallasse leggera sulla foto dell'hero.
  useEffect(() => {
    let raf = 0
    const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        setScrollato(y > 40)
        setOltreHero(y > window.innerHeight * 0.8)
        if (heroImg.current && !ridotto && y < window.innerHeight * 1.2) heroImg.current.style.transform = `translate3d(0, ${y * 0.35}px, 0)`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const matrice = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of listino) if (v.durata === 'giornaliera' && v.tipologia === 'ombrellone_2_lettini') m.set(`${v.fila}|${v.periodo}`, v.prezzo)
    return m
  }, [listino])
  const [prezzoMin, prezzoMax] = useMemo(() => {
    const v = [...matrice.values()]
    return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1]
  }, [matrice])

  const recensioni = useMemo(() => sito?.recensioni.filter((r) => r.pubblicata) ?? [], [sito])
  const mediaVoti = recensioni.length ? recensioni.reduce((s, r) => s + r.voto, 0) / recensioni.length : 0

  const nonLette = postaCliente.filter((m) => !m.letto).length
  const oggi = config.stagione.oggi
  const eventiFuturi = [...eventi].filter((e) => e.data >= oggi).sort((a, b) => a.data.localeCompare(b.data))
  const eventiPassati = [...eventi].filter((e) => e.data < oggi).sort((a, b) => b.data.localeCompare(a.data))
  // In vetrina: prima i prossimi eventi, poi quelli appena conclusi (con foto/recap).
  const eventiVetrina = [...eventiFuturi, ...eventiPassati].slice(0, 8)
  const fotoGalleria = galleria.filter((f) => f.immagine)

  useReveal([sito, disp, eventiVetrina.length, fotoGalleria.length, menu.length])

  const mostraToast = (t: string) => { setToast(t); window.setTimeout(() => setToast(undefined), 6000) }

  const scrollTo = (id: string) => {
    setMenuMobile(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [titoloHero, sottoHero] = (sito?.home.titolo ?? config.nome).split(/\s+—\s+/)
  const piatti = menu.filter((p) => ['antipasti', 'primi', 'secondi'].includes(p.categoria)).slice(0, 7)

  return (
    <div className="min-h-screen bg-[#FBF8F2] text-profondo">
      {/* Barra: trasparente sull'hero, piena quando si scorre */}
      <header className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-500',
        scrollato || menuMobile ? 'bg-profondo/90 shadow-[0_8px_30px_rgba(11,44,57,0.25)] backdrop-blur-md' : 'bg-gradient-to-b from-profondo-900/60 to-transparent',
      )}>
        <div className={cn('mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 transition-all duration-500 lg:px-8', scrollato ? 'py-2.5' : 'py-4')}>
          <button onClick={() => scrollTo('top')} className="shrink-0"><Logo /></button>
          <nav className="hidden items-center gap-6 lg:flex">
            {nav.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="group relative text-sm font-medium text-white/80 transition-colors hover:text-white">
                {label}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-tenda transition-transform duration-300 group-hover:scale-x-100" />
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPostaAperta(true)}
              className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            >
              <Inbox className="h-4 w-4" /> <span className="hidden sm:inline">La mia posta</span>
              {nonLette > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-boa px-1 text-[11px] font-bold text-white">{nonLette}</span>}
            </button>
            <Link to="/sito" className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20 sm:inline-flex">
              <ArrowLeft className="h-4 w-4" /> Gestionale
            </Link>
            <button onClick={() => scrollTo('prenota')} className="hidden rounded-full bg-boa px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-boa/30 transition-transform hover:scale-105 xl:inline-flex">Prenota</button>
            <button onClick={() => setMenuMobile((v) => !v)} className="rounded-full p-2 text-white lg:hidden" aria-label="Menu">
              {menuMobile ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuMobile && (
          <div className="border-t border-white/10 px-5 pb-5 pt-2 lg:hidden">
            {nav.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full border-b border-white/10 py-3 text-left font-display text-2xl text-white">{label}</button>
            ))}
            <Link to="/sito" className="mt-3 block py-2 text-sm text-tenda">Vai al gestionale →</Link>
          </div>
        )}
      </header>

      <div id="top" />

      {/* Hero a tutto schermo */}
      <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-profondo-900 text-white">
        <div ref={heroImg} className="absolute inset-0 will-change-transform">
          <img src={fotoSito.spiaggiaDrone} alt="Lo stabilimento visto dal drone" className="kenburns h-full w-full object-cover object-[center_70%]" fetchPriority="high" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-profondo-900 via-profondo-900/35 to-profondo-900/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-profondo-900/60 via-transparent to-transparent" />

        <div className="relative mx-auto w-full max-w-7xl px-5 pb-40 pt-32 lg:px-8 lg:pb-48">
          <div className="hero-in max-w-3xl">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-tenda">
              <span className="h-px w-10 bg-tenda" /> {config.localita}
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              {titoloHero}
            </h1>
            {sottoHero && <p className="mt-3 font-display text-3xl italic text-white/90 sm:text-4xl lg:text-5xl">{sottoHero}</p>}
            <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg">{sito?.home.testo}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button onClick={() => scrollTo('prenota')} className="group inline-flex items-center gap-2 rounded-full bg-boa px-7 py-4 font-semibold text-white shadow-xl shadow-boa/30 transition-all hover:scale-[1.03] hover:bg-[#ee6440]">
                <Umbrella className="h-5 w-5" /> Prenota l’ombrellone <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={() => scrollTo('ristorante')} className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-4 font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20">
                <UtensilsCrossed className="h-5 w-5" /> Prenota un tavolo
              </button>
            </div>
            {disp && (
              <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-md md:hidden">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acqua opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-acqua" /></span>
                <span><span className="num font-bold">{disp.libere}</span> ombrelloni liberi oggi</span>
              </div>
            )}
          </div>
        </div>

        {/* Disponibilità in tempo reale */}
        {disp && (
          <div className="absolute bottom-28 right-5 hidden rounded-3xl border border-white/20 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-xl dissolvi md:block lg:right-8 lg:bottom-36">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/70">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acqua opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-acqua" /></span>
              In tempo reale
            </div>
            <p className="mt-2 font-display text-5xl font-semibold"><Contatore valore={disp.libere} /></p>
            <p className="text-sm text-white/80">ombrelloni liberi oggi</p>
            <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-gradient-to-r from-acqua to-tenda" style={{ width: `${disp.occupazione * 100}%` }} /></div>
            <p className="mt-1.5 text-xs text-white/60">{Math.round(disp.occupazione * 100)}% occupato · {disp.totali} postazioni</p>
          </div>
        )}

        <button onClick={() => scrollTo('servizi')} aria-label="Scorri" className="galleggia absolute bottom-24 left-1/2 hidden -translate-x-1/2 place-items-center rounded-full border border-white/40 p-3 text-white/80 hover:text-white sm:grid lg:bottom-32">
          <ArrowDown className="h-4 w-4" />
        </button>

        {/* Onde animate verso la sezione successiva */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden lg:h-32">
          <svg className="onda-lenta absolute bottom-0 h-full w-[200%] text-acqua/40" viewBox="0 0 2880 120" preserveAspectRatio="none"><path fill="currentColor" d="M0 60c240 40 480 40 720 0s480-40 720 0 480 40 720 0 480-40 720 0v60H0z" /></svg>
          <svg className="onda absolute bottom-0 h-3/4 w-[200%] text-[#FBF8F2]" viewBox="0 0 2880 120" preserveAspectRatio="none"><path fill="currentColor" d="M0 70c240-45 480-45 720 0s480 45 720 0 480-45 720 0 480 45 720 0v50H0z" /></svg>
        </div>
      </section>

      {/* Nastro scorrevole */}
      <div className="relative -mt-px overflow-hidden bg-[#FBF8F2] py-5">
        <div className="scorri flex w-max gap-10 whitespace-nowrap">
          {[...nastro, ...nastro].map((t, i) => (
            <span key={i} className="flex items-center gap-10 font-display text-2xl italic text-profondo/70 sm:text-3xl">
              {t} <Sun className="h-5 w-5 text-tenda" />
            </span>
          ))}
        </div>
      </div>

      {/* Lo stabilimento */}
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:gap-20 lg:px-8 lg:py-28">
        <div className="reveal relative mx-auto w-full max-w-lg lg:order-2">
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl shadow-profondo/20">
            <img src={fotoSito.ombrelloniCielo} alt="File di ombrelloni sotto il cielo" loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.5s] hover:scale-105" />
          </div>
          <div className="absolute -bottom-10 -left-6 w-40 rotate-[-6deg] overflow-hidden rounded-2xl border-[6px] border-white shadow-2xl sm:-left-12 sm:w-52">
            <img src={fotoSito.bagnino} alt="La postazione del bagnino" loading="lazy" className="aspect-[3/4] w-full object-cover" />
          </div>
          <div className="absolute -right-3 top-8 rounded-2xl bg-tenda px-5 py-4 text-profondo shadow-xl sm:-right-8">
            <p className="text-xs font-semibold uppercase tracking-widest">Aperti ogni giorno</p>
            <p className="font-display text-2xl font-semibold">{config.orari.apertura} – {config.orari.chiusura}</p>
          </div>
        </div>
        <div className="reveal">
          <Occhiello>Lo stabilimento</Occhiello>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Il mare come dovrebbe <em className="text-cabina">essere</em>.</h2>
          <p className="mt-6 text-lg leading-8 text-profondo/70">{sito?.home.sottotitolo}. Sabbia pettinata ogni mattina, il bagnino sempre presente, il bar a due passi dall’ombrellone e la cucina che profuma di mare. Tu pensa solo a rilassarti.</p>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <Numero valore={config.arenile.postazioniTotali} etichetta="postazioni" />
            <Numero valore={config.arenile.file.length} etichetta="file sul mare" />
            <Numero valore={disp?.libere ?? 0} etichetta="liberi oggi" />
            <Numero valore={mediaVoti} decimali={1} etichetta={`★ su ${recensioni.length} recensioni`} />
          </div>
        </div>
      </section>

      {/* Servizi — bento con foto */}
      <section id="servizi" className="scroll-mt-20 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="reveal flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <Occhiello>I servizi</Occhiello>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">Una giornata perfetta, <em className="text-cabina">dall’alba al tramonto</em>.</h2>
            </div>
            <p className="max-w-sm text-profondo/60">Tutto quello che ti serve è a portata di infradito: noi pensiamo ai dettagli, tu al mare.</p>
          </div>
          <div className="mt-12 grid auto-rows-[170px] grid-cols-2 gap-3 sm:auto-rows-[210px] lg:grid-cols-4 lg:gap-4">
            <TesseraFoto classe="col-span-2 row-span-2" foto={fotoSito.ombrelloniCielo} titolo="Ombrelloni e gazebo" testo={`${config.arenile.postazioniTotali} postazioni su ${config.arenile.file.length} file, dalla prima fila al fondo.`} icona={Umbrella} />
            <TesseraFoto classe="row-span-2" foto={fotoSito.barDistillati} titolo="Bar" testo="Colazioni, aperitivi e servizio all’ombrellone." icona={Coffee} />
            <TesseraFoto foto={fotoSito.ristorante} titolo="Ristorante" testo="Cucina di mare, pranzo e cena." icona={UtensilsCrossed} />
            <TesseraFoto foto={fotoSito.beachVolley} titolo="Beach volley" testo="Campo, tornei e partite al tramonto." icona={Sparkles} />
            <TesseraIcona colore="bg-profondo text-white" icona={Home} titolo="Cabine" testo="40 cabine, spogliatoi e docce calde." />
            <TesseraIcona colore="bg-acqua text-profondo" icona={Waves} titolo="Noleggi" testo="SUP, pedalò, canoa e kayak." />
            <TesseraIcona colore="bg-tenda text-profondo" icona={Car} titolo="Parcheggio" testo="Posti riservati per i clienti." />
            <TesseraFoto foto={fotoSito.famiglia} titolo="Per le famiglie" testo="Spazi ombreggiati e giochi." icona={Sun} />
          </div>
        </div>
      </section>

      {/* Ristorante */}
      <section id="ristorante" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div className="reveal lg:sticky lg:top-24 lg:self-start">
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl shadow-profondo/20 sm:aspect-[4/3] lg:aspect-[4/5]">
                <img src={fotoSito.ristorante} alt="Piatti di mare del ristorante" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-6 left-6 right-6 grid grid-cols-2 divide-x divide-white/15 rounded-2xl bg-profondo p-5 text-white shadow-2xl sm:left-auto sm:right-8 sm:w-80">
                <div className="pr-4"><p className="text-xs uppercase tracking-widest text-tenda">Pranzo</p><p className="mt-1 font-display text-lg">{config.orari.ristorantePranzo}</p></div>
                <div className="pl-4"><p className="text-xs uppercase tracking-widest text-tenda">Cena</p><p className="mt-1 font-display text-lg">{config.orari.ristoranteCena}</p></div>
              </div>
            </div>
          </div>
          <div className="pt-6 lg:pt-0">
            <div className="reveal">
              <Occhiello>Il ristorante</Occhiello>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">Il sapore delle <em className="text-cabina">vacanze</em>.</h2>
              <p className="mt-5 text-lg leading-8 text-profondo/70">Pesce fresco, ricette di casa e vini scelti con cura. Dal pranzo in costume alla cena che profuma di mare.</p>
            </div>
            <ul className="reveal mt-8 space-y-4">
              {piatti.map((p) => (
                <li key={p.id} className="group">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xl text-profondo transition-colors group-hover:text-cabina">{p.nome}</span>
                    <span className="mb-1 flex-1 border-b border-dotted border-profondo/25" />
                    <span className="num font-semibold text-profondo">{euro(p.prezzo)}</span>
                  </div>
                  <p className="text-xs uppercase tracking-widest text-profondo/40">{etichetteCategoriaPiatto[p.categoria]}</p>
                </li>
              ))}
            </ul>
            <div className="reveal mt-10">
              {canaliPrenotazione.ristorante
                ? <FormRistorante onInviato={(nome) => { mostraToast(`Richiesta tavolo inviata, ${nome}! Controlla “La mia posta”.`); setPostaAperta(true) }} />
                : <Sospese testo="Le prenotazioni del ristorante online sono momentaneamente sospese. Chiamaci per riservare un tavolo." />}
            </div>
          </div>
        </div>
      </section>

      {/* Fascia tramonto con le recensioni */}
      <section className="relative overflow-hidden bg-profondo-900 py-28 text-white lg:py-40">
        <img src={fotoSito.tramonto} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-profondo-900/90 via-profondo-900/55 to-profondo-900/40" />
        <div className="relative mx-auto max-w-4xl px-5 text-center">
          <p className="reveal text-xs font-semibold uppercase tracking-[0.3em] text-tenda">Quando il sole scende</p>
          <h2 className="reveal mt-4 font-display text-4xl font-semibold leading-tight sm:text-6xl">La spiaggia cambia ritmo.</h2>
          {recensioni.length > 0 && <Recensioni recensioni={recensioni} media={mediaVoti} />}
        </div>
      </section>

      {/* Prenota ombrellone */}
      <section id="prenota" className="relative scroll-mt-16 overflow-hidden bg-profondo py-20 text-white lg:py-28">
        <img src={fotoSito.spiaggiaDrone} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-br from-profondo via-profondo/95 to-cabina/70" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-5 lg:gap-16 lg:px-8">
          <div className="reveal lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-tenda">Prenota</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">Il tuo posto al sole <em className="text-tenda">ti aspetta</em>.</h2>
            <p className="mt-5 max-w-md leading-7 text-white/70">Invia la richiesta: la ricevi subito nella tua posta e ti confermiamo la postazione in pochi minuti.</p>
            {disp && (
              <div className="mt-10 flex items-center gap-6">
                <Anello percento={disp.occupazione} />
                <div>
                  <p className="font-display text-5xl font-semibold"><Contatore valore={disp.libere} /></p>
                  <p className="text-white/70">ombrelloni liberi su {disp.totali}</p>
                  <p className="mt-1 text-xs capitalize text-white/50">{dataEstesa(config.stagione.oggi)}</p>
                </div>
              </div>
            )}
            <ul className="mt-10 space-y-3 text-sm text-white/80">
              {['Conferma via email dal gestionale', 'Nessun pagamento anticipato', 'Modifiche e disdette semplici'].map((t) => (
                <li key={t} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-acqua/20 text-acqua"><Check className="h-3.5 w-3.5" /></span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="reveal lg:col-span-3">
            {canaliPrenotazione.ombrelloni
              ? <FormOmbrellone onInviato={(nome) => { mostraToast(`Richiesta ombrellone inviata, ${nome}! Controlla “La mia posta”.`); setPostaAperta(true) }} />
              : <Sospese testo="Le prenotazioni online degli ombrelloni sono momentaneamente sospese. Passa in cassa o chiamaci per la disponibilità." />}
          </div>
        </div>
      </section>

      {/* Listino */}
      <section id="listino" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <div className="reveal text-center">
            <Occhiello centrato>Listino {config.stagione.anno}</Occhiello>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">Ombrellone + 2 lettini</h2>
            <p className="mt-3 text-profondo/60">Tariffa giornaliera per fila e periodo · prezzi sincronizzati col gestionale.</p>
          </div>
          <div className="reveal mt-10 overflow-x-auto rounded-3xl bg-white p-2 shadow-xl shadow-profondo/5 ring-1 ring-calce-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr>
                <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-widest text-profondo/45">Fila</th>
                {periodi.map((pp) => <th key={pp} className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-widest text-profondo/45">{etichettePeriodo[pp]}</th>)}
              </tr></thead>
              <tbody>
                {file.map((f, i) => (
                  <tr key={f}>
                    <td className="px-4 py-1.5">
                      <span className="font-display text-lg font-semibold text-profondo">Fila {f}</span>
                      {i === 0 && <span className="ml-2 rounded-full bg-tenda/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7A5A12]">fronte mare</span>}
                    </td>
                    {periodi.map((pp) => {
                      const v = matrice.get(`${f}|${pp}`)
                      const t = v === undefined ? 0 : (v - prezzoMin) / Math.max(1, prezzoMax - prezzoMin)
                      return (
                        <td key={pp} className="p-1">
                          <div className="num rounded-xl py-2.5 text-center font-semibold text-profondo transition-transform hover:scale-105" style={{ background: v === undefined ? undefined : `rgba(46,125,154,${0.06 + t * 0.3})` }}>
                            {v === undefined ? '—' : euro(v)}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Eventi */}
      <section id="eventi" className="scroll-mt-20 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="reveal flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <Occhiello>Eventi</Occhiello>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">Cosa succede <em className="text-cabina">in spiaggia</em></h2>
            </div>
            <p className="max-w-sm text-profondo/60">Tornei, musica, cene sotto le stelle. Aggiornati dal gestionale in tempo reale.</p>
          </div>
          {eventiVetrina.length === 0 && <p className="mt-8 text-sm text-profondo/50">Nessun evento al momento.</p>}
          <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {eventiVetrina.map((e, i) => {
              const passato = e.data < oggi
              const nFoto = e.galleria?.length ?? 0
              const [, mm, gg] = e.data.split('-')
              return (
                <button
                  key={e.id}
                  onClick={() => setEventoSel(e)}
                  className="reveal group relative aspect-[4/5] w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl bg-gradient-to-br from-cabina to-profondo text-left text-white shadow-lg sm:w-[45%] lg:w-auto"
                  style={{ transitionDelay: `${(i % 4) * 80}ms` }}
                >
                  {e.foto && <img src={e.foto} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-profondo-900/95 via-profondo-900/30 to-transparent" />
                  <div className="absolute left-4 top-4 rounded-2xl bg-white/95 px-3 py-2 text-center text-profondo shadow">
                    <p className="font-display text-2xl font-semibold leading-none">{Number(gg)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-profondo/60">{mesi[Number(mm) - 1]}</p>
                  </div>
                  {passato
                    ? <span className="absolute right-4 top-4 rounded-full bg-profondo/80 px-2.5 py-1 text-xs font-bold backdrop-blur">Concluso</span>
                    : !!e.prezzo && <span className="absolute right-4 top-4 rounded-full bg-boa px-2.5 py-1 text-xs font-bold">{euro(e.prezzo)}</span>}
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-display text-2xl font-semibold leading-tight">{e.nome}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-white/75">{e.descrizione}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-tenda">
                      {passato ? (nFoto > 0 ? `Rivedi le foto (${nFoto})` : 'Rivivi l’evento') : (canaliPrenotazione.eventi ? 'Scopri e prenota' : 'Scopri di più')}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Galleria a mosaico */}
      {fotoGalleria.length > 0 && (
        <section id="galleria" className="scroll-mt-20 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="reveal text-center">
              <Occhiello centrato>Galleria</Occhiello>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">Cartoline dalla <em className="text-cabina">nostra spiaggia</em></h2>
            </div>
            <div className="mt-12 columns-2 gap-3 md:columns-3 lg:gap-4">
              {fotoGalleria.map((f, i) => (
                <button key={f.id} onClick={() => setFoto(i)} className="reveal group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl lg:mb-4">
                  <img src={f.immagine} alt={f.titolo} loading="lazy" className="w-full transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-profondo-900/70 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="font-display text-lg text-white">{f.titolo}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contatti */}
      <section id="contatti" className="scroll-mt-20 px-5 pb-20 lg:px-8 lg:pb-28">
        <div className="reveal mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-profondo text-white shadow-2xl shadow-profondo/20 lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-tenda">Contatti</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight">Ci vediamo <em className="text-tenda">al mare</em>.</h2>
            <ul className="mt-8 space-y-5">
              {[
                { i: MapPin, t: 'Dove siamo', v: `${config.indirizzo}, ${config.localita}` },
                { i: Phone, t: 'Telefono', v: config.telefono },
                { i: Mail, t: 'Email', v: config.email },
                { i: Clock, t: 'Orari', v: `Spiaggia ${config.orari.apertura}–${config.orari.chiusura} · Bar fino alle ${config.orari.barChiusura}` },
              ].map(({ i: Icona, t, v }) => (
                <li key={t} className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-tenda"><Icona className="h-5 w-5" /></span>
                  <div><p className="text-xs uppercase tracking-widest text-white/50">{t}</p><p className="mt-0.5 font-medium">{v}</p></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-h-[320px]">
            <img src={fotoSito.bagnino} alt="La spiaggia" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-profondo via-profondo/20 to-transparent lg:via-transparent" />
          </div>
        </div>
      </section>

      <footer className="bg-profondo-900 py-12 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 text-center sm:flex-row sm:text-left lg:px-8">
          <div>
            <p className="font-display text-2xl font-semibold">{config.nome}</p>
            <p className="mt-1 text-sm text-white/50">{config.localita} · P.IVA {config.partitaIva}</p>
          </div>
          <p className="text-xs text-white/40">Sito dimostrativo generato dal gestionale <span className="font-semibold text-white/70">Beach<span className="text-tenda">In</span></span></p>
        </div>
      </footer>

      {/* Pulsante flottante "Prenota" su mobile, dopo l'hero */}
      <button
        onClick={() => scrollTo('prenota')}
        className={cn('fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-boa px-5 py-3.5 font-semibold text-white shadow-2xl shadow-boa/40 transition-all duration-500 lg:hidden', oltreHero ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0')}
      >
        <Umbrella className="h-5 w-5" /> Prenota
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 anim-pop">
          <div className="flex items-center gap-2 rounded-full bg-profondo px-4 py-2.5 text-sm text-white shadow-pop">
            <Check className="h-4 w-4 text-acqua" /> {toast}
          </div>
        </div>
      )}

      {foto !== undefined && fotoGalleria[foto] && (
        <Lightbox
          foto={fotoGalleria.map((f) => ({ src: f.immagine!, titolo: f.titolo }))}
          indice={foto}
          onCambia={setFoto}
          onChiudi={() => setFoto(undefined)}
        />
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

// ————————————————— Effetti e blocchi grafici —————————————————

/** Fa comparire gli elementi `.reveal` quando entrano nello schermo. */
function useReveal(deps: unknown[]) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.visibile)')
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('visibile')); return }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('visibile'); io.unobserve(en.target) }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Numero che "conta" fino al valore quando diventa visibile. */
function Contatore({ valore, decimali = 0 }: { valore: number; decimali?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(valore); return }
    let raf = 0
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const passo = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400)
        setV(valore * (1 - Math.pow(1 - p, 3)))
        if (p < 1) raf = requestAnimationFrame(passo)
      }
      raf = requestAnimationFrame(passo)
    })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [valore])
  return <span ref={ref} className="num">{v.toFixed(decimali).replace('.', ',')}</span>
}

function Numero({ valore, etichetta, decimali }: { valore: number; etichetta: string; decimali?: number }) {
  return (
    <div className="border-l-2 border-tenda pl-4">
      <p className="font-display text-4xl font-semibold text-profondo"><Contatore valore={valore} decimali={decimali} /></p>
      <p className="mt-1 text-sm text-profondo/55">{etichetta}</p>
    </div>
  )
}

function Occhiello({ children, centrato }: { children: React.ReactNode; centrato?: boolean }) {
  return (
    <p className={cn('flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-boa', centrato && 'justify-center')}>
      <span className="h-px w-8 bg-boa" /> {children} {centrato && <span className="h-px w-8 bg-boa" />}
    </p>
  )
}

function TesseraFoto({ foto, titolo, testo, icona: Icona, classe }: { foto: string; titolo: string; testo: string; icona: typeof Umbrella; classe?: string }) {
  return (
    <div className={cn('reveal group relative overflow-hidden rounded-3xl bg-profondo', classe)}>
      <img src={foto} alt={titolo} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-profondo-900/90 via-profondo-900/20 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
        <span className="mb-2 grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur"><Icona className="h-4 w-4" /></span>
        <h3 className="font-display text-xl font-semibold leading-tight sm:text-2xl">{titolo}</h3>
        <p className="mt-1 hidden text-sm text-white/75 sm:block">{testo}</p>
      </div>
    </div>
  )
}

function TesseraIcona({ icona: Icona, titolo, testo, colore }: { icona: typeof Umbrella; titolo: string; testo: string; colore: string }) {
  return (
    <div className={cn('reveal group flex flex-col justify-between rounded-3xl p-5 transition-transform duration-500 hover:-translate-y-1 sm:p-6', colore)}>
      <Icona className="h-8 w-8 transition-transform duration-500 group-hover:rotate-12" strokeWidth={1.5} />
      <div>
        <h3 className="font-display text-xl font-semibold sm:text-2xl">{titolo}</h3>
        <p className="mt-1 text-sm opacity-75">{testo}</p>
      </div>
    </div>
  )
}

function Recensioni({ recensioni, media }: { recensioni: { id: string; testo: string; autore: string; voto: number }[]; media: number }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % recensioni.length), 6000)
    return () => window.clearInterval(t)
  }, [recensioni.length])
  const r = recensioni[i % recensioni.length]
  return (
    <div className="reveal mt-12">
      <Quote className="mx-auto h-10 w-10 text-tenda/80" />
      <blockquote key={r.id} className="dissolvi mx-auto mt-4 min-h-[7rem] max-w-3xl font-display text-2xl italic leading-snug text-white/95 sm:text-3xl">“{r.testo}”</blockquote>
      <p key={`${r.id}-a`} className="dissolvi mt-4 text-sm font-semibold uppercase tracking-widest text-white/60">— {r.autore}</p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <button onClick={() => setI((x) => (x - 1 + recensioni.length) % recensioni.length)} aria-label="Precedente" className="rounded-full border border-white/30 p-2 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur">
          <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, k) => <Star key={k} className={cn('h-4 w-4', k < Math.round(media) ? 'fill-tenda text-tenda' : 'text-white/30')} />)}</div>
          <span className="num text-sm font-semibold">{media.toFixed(1).replace('.', ',')}</span>
          <span className="text-xs text-white/60">· {recensioni.length} recensioni</span>
        </div>
        <button onClick={() => setI((x) => (x + 1) % recensioni.length)} aria-label="Successiva" className="rounded-full border border-white/30 p-2 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

/** Anello di occupazione della spiaggia. */
function Anello({ percento }: { percento: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#anello)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percento)} className="transition-[stroke-dashoffset] duration-1000" />
        <defs><linearGradient id="anello" x1="0" x2="1"><stop offset="0" stopColor="#7FB7A8" /><stop offset="1" stopColor="#F2C14E" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><p className="num text-xl font-bold">{Math.round(percento * 100)}%</p><p className="text-[10px] uppercase tracking-widest text-white/60">occupato</p></div>
      </div>
    </div>
  )
}

function Lightbox({ foto, indice, onCambia, onChiudi }: { foto: { src: string; titolo: string }[]; indice: number; onCambia: (i: number) => void; onChiudi: () => void }) {
  const n = foto.length
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
      if (e.key === 'ArrowRight') onCambia((indice + 1) % n)
      if (e.key === 'ArrowLeft') onCambia((indice - 1 + n) % n)
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [indice, n, onCambia, onChiudi])
  const f = foto[indice]
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-profondo-900/95 p-4 backdrop-blur anim-pop" onClick={onChiudi}>
      <button onClick={onChiudi} aria-label="Chiudi" className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
      <button onClick={(e) => { e.stopPropagation(); onCambia((indice - 1 + n) % n) }} aria-label="Precedente" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"><ChevronLeft className="h-5 w-5" /></button>
      <button onClick={(e) => { e.stopPropagation(); onCambia((indice + 1) % n) }} aria-label="Successiva" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"><ChevronRight className="h-5 w-5" /></button>
      <figure key={indice} className="dissolvi max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <img src={f.src} alt={f.titolo} className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl" />
        <figcaption className="mt-3 text-center text-white/80"><span className="font-display text-lg">{f.titolo}</span> <span className="num ml-2 text-xs text-white/40">{indice + 1} / {n}</span></figcaption>
      </figure>
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
              <button type="submit" disabled={!valido} className="col-span-2 mt-2 h-12 rounded-full bg-boa font-semibold text-white shadow-lg shadow-boa/30 transition-all hover:scale-[1.01] hover:bg-[#ee6440] disabled:opacity-50 disabled:shadow-none">Invia richiesta</button>
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
      className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 text-profondo shadow-2xl shadow-profondo-900/30 sm:p-8">
      <p className="col-span-2 font-display text-2xl font-semibold">Richiedi il tuo ombrellone</p>
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
      <button type="submit" disabled={!valido} className="col-span-2 mt-2 h-12 rounded-full bg-boa font-semibold text-white shadow-lg shadow-boa/30 transition-all hover:scale-[1.01] hover:bg-[#ee6440] disabled:opacity-50 disabled:shadow-none">Invia richiesta</button>
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
      className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 shadow-xl shadow-profondo/10 ring-1 ring-calce-200 sm:p-8">
      <p className="col-span-2 font-display text-2xl font-semibold text-profondo">Prenota un tavolo</p>
      <Campo label="Nome e cognome" span2><input required className={pc} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Mario Rossi" /></Campo>
      <Campo label="Email"><input type="email" required className={pc} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.it" /></Campo>
      <Campo label="Telefono"><input className={pc} value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="340 1234567" /></Campo>
      <Campo label="Data"><input type="date" className={pc} value={f.data} onChange={(e) => set('data', e.target.value)} /></Campo>
      <Campo label="Turno">
        <select className={pc} value={f.turno} onChange={(e) => set('turno', e.target.value)}><option value="pranzo">Pranzo</option><option value="cena">Cena</option></select>
      </Campo>
      <Campo label="Coperti" span2><input type="number" min={1} className={pc} value={f.coperti} onChange={(e) => set('coperti', e.target.value)} /></Campo>
      <button type="submit" disabled={!valido} className="col-span-2 mt-2 h-12 rounded-full bg-boa font-semibold text-white shadow-lg shadow-boa/30 transition-all hover:scale-[1.01] hover:bg-[#ee6440] disabled:opacity-50 disabled:shadow-none">Invia richiesta</button>
    </form>
  )
}

function Successo({ testo, onAltro }: { testo: string; onAltro: () => void }) {
  return (
    <div className="rounded-3xl bg-white p-6 text-profondo shadow-xl ring-1 ring-acqua/40 anim-pop">
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
    <div className={cn('flex items-start gap-3 rounded-3xl border border-tenda/50 bg-[#FFF8E6] p-5 text-profondo', className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tenda/30 text-[#7A5A12]"><Clock className="h-5 w-5" /></span>
      <div>
        <p className="font-semibold text-profondo">Prenotazioni online sospese</p>
        <p className="mt-0.5 text-sm text-profondo/65">{testo}</p>
      </div>
    </div>
  )
}

const pc = 'h-11 w-full rounded-xl border border-calce-200 bg-calce/40 px-3 text-sm text-profondo transition-colors focus:bg-white focus-visible:focus-ring'

function Campo({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn('block', span2 && 'col-span-2')}>
      <span className="mb-1 block text-xs font-medium text-profondo/60">{label}</span>
      {children}
    </label>
  )
}
