import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowDown, ArrowRight, Umbrella, Home, Coffee, UtensilsCrossed, Star, Phone, Mail, MapPin,
  Clock, Check, CalendarDays, Menu as MenuIcon, X, Sparkles, Ticket, ChevronLeft, ChevronRight, Quote, Sun, ShowerHead, Sofa, Waves,
} from 'lucide-react'
import type { Evento, FilaId, Periodo, StatoSito, Turno, TipologiaPostazione, VoceTariffa } from '@/data/types'
import { getDisponibilitaSito, getListinoPubblicato, getStatoSito } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { fotoSito, logoLido, videoHero } from '@/assets/sito'
import { useModuli } from '@/context/ModuliContext'
import { Modal } from '@/components/ui/Modal'
import { euro, dataEstesa } from '@/lib/formatters'
import { etichettePeriodo, etichetteCategoriaPiatto } from '@/lib/etichette'
import { cn } from '@/lib/cn'
import { statoGiorno, prenotabilita, descriviSistemazione } from '@/lib/disponibilita'
import { AnteprimaWhatsApp } from '@/components/AnteprimaWhatsApp'
import { CalendarioDisponibilita } from '@/components/sito/CalendarioDisponibilita'

const file: FilaId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
const periodi: Periodo[] = ['bassa', 'media', 'alta', 'altissima']
// 'listino' sparisce se il modulo Arenile è spento; 'prenota' anche se è spenta la prenotazione online ombrelloni.
const nav = [
  ['servizi', 'Servizi'], ['ristorante', 'Ristorante'], ['prenota', 'Prenota'],
  ['listino', 'Listino'], ['eventi', 'Eventi'], ['galleria', 'Galleria'], ['contatti', 'Contatti'],
]
const nastro = ['Ombrelloni fronte mare', 'Pesce fresco dal banco', 'Ristorante aperto tutto l’anno', 'Beach volley', 'Ping pong', 'Cabine e docce calde', 'Area relax', 'Animazione per bambini']
// Temi ricorrenti delle recensioni Tripadvisor (riassunti, non citazioni).
const temiRecensioni = [
  'Pesce freschissimo, da scegliere direttamente al banco',
  'Fritto misto abbondante e asciutto: meglio dividerlo in due',
  'Rapporto qualità-prezzo eccellente',
  'Accoglienza familiare, cortese e sempre disponibile',
  'Tavoli tra le cabine, con il mare a due passi',
]
const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export default function SitoAnteprima() {
  const { eventi, canaliPrenotazione, galleria, menu, sezioniMenu } = useDemoData()
  // Gestione ombrelloni (modulo Arenile): se spento, dal sito spariscono prenotazione, listino e disponibilità.
  const ombrelloni = useModuli().moduloAttivo('arenile')
  // Prenotazione ombrellone dal sito: doppio controllo, modulo Arenile attivo E canale "Ombrelloni" acceso (Sito → Prenotazioni).
  const prenotaOmbrelloni = ombrelloni && canaliPrenotazione.ombrelloni
  const voci = nav.filter(([id]) => (id !== 'prenota' || prenotaOmbrelloni) && (id !== 'listino' || ombrelloni))
  const voceNastro = nastro.filter((t) => ombrelloni || !/ombrell/i.test(t))
  const idPrenota = prenotaOmbrelloni ? 'prenota' : 'prenota-tavolo'
  const [sito, setSito] = useState<StatoSito>()
  const [disp, setDisp] = useState<{ libere: number; totali: number; occupazione: number }>()
  const [listino, setListino] = useState<VoceTariffa[]>([])
  const [menuMobile, setMenuMobile] = useState(false)
  const [toast, setToast] = useState<string>()
  const [eventoSel, setEventoSel] = useState<Evento>()
  const [scrollato, setScrollato] = useState(false)
  const [oltreHero, setOltreHero] = useState(false)
  const [foto, setFoto] = useState<number>()
  const heroImg = useRef<HTMLDivElement>(null)
  const [movimentoRidotto] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

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
    const vai = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    vai()
    // foto lazy e animazioni "reveal" spostano il layout durante lo scroll: a fine corsa si ricorregge sul bersaglio
    for (const ms of [700, 1400]) window.setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      const atteso = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      if (Math.abs(el.getBoundingClientRect().top - atteso) > 4) vai()
    }, ms)
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
          <button onClick={() => scrollTo('top')} className="shrink-0" aria-label={config.nome}><img src={logoLido} alt={config.nome} className={cn('w-auto brightness-0 invert drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-all duration-500', scrollato ? 'h-12' : 'h-20 sm:h-24')} /></button>
          <nav className="hidden items-center gap-6 lg:flex">
            {voci.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="group relative text-sm font-medium text-white/80 transition-colors hover:text-white">
                {label}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-tenda transition-transform duration-300 group-hover:scale-x-100" />
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/sito" className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20 sm:inline-flex">
              <ArrowLeft className="h-4 w-4" /> Gestionale
            </Link>
            <button onClick={() => scrollTo(idPrenota)} className="hidden rounded-full bg-boa px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-boa/30 transition-transform hover:scale-105 xl:inline-flex">Prenota</button>
            <button onClick={() => setMenuMobile((v) => !v)} className="rounded-full p-2 text-white lg:hidden" aria-label="Menu">
              {menuMobile ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuMobile && (
          <div className="border-t border-white/10 px-5 pb-5 pt-2 lg:hidden">
            {voci.map(([id, label]) => (
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
          {videoHero && !movimentoRidotto
            ? <video src={videoHero} poster={fotoSito.spiaggiaAlto} autoPlay muted loop playsInline preload="auto" aria-hidden className="h-full w-full scale-105 object-cover" />
            : <img src={fotoSito.spiaggiaAlto} alt="La spiaggia del Lido dei Pini vista dall’alto" className="kenburns h-full w-full object-cover object-[center_55%]" fetchPriority="high" />}
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
              {prenotaOmbrelloni ? (
                <>
                  <button onClick={() => scrollTo('prenota')} className="group inline-flex items-center gap-2 rounded-full bg-boa px-7 py-4 font-semibold text-white shadow-xl shadow-boa/30 transition-all hover:scale-[1.03] hover:bg-[#ee6440]">
                    <Umbrella className="h-5 w-5" /> Prenota l’ombrellone <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button onClick={() => scrollTo('prenota-tavolo')} className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-4 font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20">
                    <UtensilsCrossed className="h-5 w-5" /> Prenota un tavolo
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => scrollTo('prenota-tavolo')} className="group inline-flex items-center gap-2 rounded-full bg-boa px-7 py-4 font-semibold text-white shadow-xl shadow-boa/30 transition-all hover:scale-[1.03] hover:bg-[#ee6440]">
                    <UtensilsCrossed className="h-5 w-5" /> Prenota un tavolo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button onClick={() => scrollTo('eventi')} className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-4 font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20">
                    <CalendarDays className="h-5 w-5" /> Scopri gli eventi
                  </button>
                </>
              )}
            </div>
            {ombrelloni && disp && (
              <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-md md:hidden">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acqua opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-acqua" /></span>
                <span><span className="num font-bold">{disp.libere}</span> ombrelloni liberi oggi</span>
              </div>
            )}
          </div>
        </div>

        {/* Disponibilità in tempo reale */}
        {ombrelloni && disp && (
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
          {[...voceNastro, ...voceNastro].map((t, i) => (
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
            <img src={fotoSito.ombrelloniCielo} alt="Il lido sotto il cielo di Savona" loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.5s] hover:scale-105" />
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
          <p className="mt-6 text-lg leading-8 text-profondo/70">A tre chilometri dal centro di Savona, tra hotel, residence e negozi: un lido familiare dove le giornate hanno il ritmo giusto. {ombrelloni && 'Ombrellone e lettini, '}Docce calde e fredde, un’area relax con divanetti e un ristorante di pesce aperto tutto l’anno.</p>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <Numero valore={config.tripadvisor.voto} decimali={1} etichetta="su 5 · Tripadvisor" />
            <Numero valore={config.tripadvisor.recensioni} etichetta="recensioni" />
            <Numero valore={3} etichetta="km dal centro di Savona" />
            {ombrelloni
              ? <Numero valore={disp?.libere ?? 0} etichetta="ombrelloni liberi oggi" />
              : <Numero valore={config.prezzoMedioRistorante} etichetta="€ prezzo medio al ristorante" />}
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
            {ombrelloni
              ? <TesseraFoto classe="col-span-2 row-span-2" foto={fotoSito.ombrelloniCielo} titolo="Ombrelloni e gazebo" testo="Ombrellone e lettini, dalla prima fila sul mare." icona={Umbrella} />
              : <TesseraFoto classe="col-span-2 row-span-2" foto={fotoSito.spiaggiaDrone} titolo="La spiaggia" testo="Sabbia, mare e relax a 3 km dal centro di Savona." icona={Waves} />}
            <TesseraFoto classe="row-span-2" foto={fotoSito.barDistillati} titolo="Bar" testo="Colazioni, caffè e pause fresche tutto il giorno." icona={Coffee} />
            <TesseraFoto foto={fotoSito.ristorante} titolo="Ristorante" testo="Pesce fresco a pranzo e cena, tutto l’anno." icona={UtensilsCrossed} />
            <TesseraFoto foto={fotoSito.beachVolley} titolo="Beach volley" testo="Campo da beach volley, tornei e ping pong." icona={Sparkles} />
            <TesseraFoto foto={fotoSito.cabine} icona={Home} titolo="Cabine" testo="Per effetti personali, giochi e gonfiabili." />
            <TesseraFoto foto={fotoSito.docce} icona={ShowerHead} titolo="Docce e servizi" testo="Docce calde e fredde, servizi igienici." />
            <TesseraFoto foto={fotoSito.areaRelax} icona={Sofa} titolo="Area relax" testo="Divanetti all’ombra tra un bagno e l’altro." />
            <TesseraFoto foto={fotoSito.famiglia} titolo="Animazione" testo="Per i bambini e intrattenimento per adulti." icona={Sun} />
          </div>
        </div>
      </section>

      {/* Ristorante */}
      <section id="ristorante" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div className="reveal lg:sticky lg:top-24 lg:self-start">
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl shadow-profondo/20 sm:aspect-[4/3] lg:aspect-[4/5]">
                <img src={fotoSito.ristorante} alt="La sala del ristorante sulla spiaggia, con vista mare" loading="lazy" className="h-full w-full object-cover" />
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
              <p className="mt-5 text-lg leading-8 text-profondo/70">Il pesce freschissimo lo scegli direttamente dal banco. Piatti di mare e di terra, opzioni vegetariane, vini e birre artigianali: a pranzo in costume tra le cabine o a cena con vista mare, dentro o all’aperto. Aperto tutto l’anno.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-tenda/25 px-3 py-1.5 font-semibold text-[#7A5A12]">Prezzo medio ~{config.prezzoMedioRistorante} €</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-acqua/20 px-3 py-1.5 font-semibold text-profondo"><Star className="h-3.5 w-3.5 fill-tenda text-tenda" /> {config.tripadvisor.voto.toFixed(1).replace('.', ',')} su Tripadvisor</span>
                <span className="rounded-full bg-calce px-3 py-1.5 font-semibold text-profondo/70">Opzioni vegetariane</span>
              </div>
            </div>
            <ul className="reveal mt-8 space-y-4">
              {piatti.map((p) => (
                <li key={p.id} className="group">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xl text-profondo transition-colors group-hover:text-cabina">{p.nome}</span>
                    <span className="mb-1 flex-1 border-b border-dotted border-profondo/25" />
                    <span className="num font-semibold text-profondo">{euro(p.prezzo)}</span>
                  </div>
                  <p className="text-xs uppercase tracking-widest text-profondo/40">{sezioniMenu.find((s) => s.id === p.categoria)?.nome ?? etichetteCategoriaPiatto[p.categoria]}</p>
                </li>
              ))}
            </ul>
            <div id="prenota-tavolo" className="reveal mt-10 scroll-mt-24">
              {canaliPrenotazione.ristorante
                ? <FormRistorante onInviato={(nome, dove) => { mostraToast(`Richiesta tavolo inviata, ${nome}! Ti abbiamo scritto ${dove}.`) }} />
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
          <Recensioni temi={temiRecensioni} />
        </div>
      </section>

      {prenotaOmbrelloni && (
      /* Prenota ombrellone */
      <section id="prenota" className="relative scroll-mt-16 overflow-hidden bg-profondo py-20 text-white lg:py-28">
        <img src={fotoSito.spiaggiaDrone} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-br from-profondo via-profondo/95 to-cabina/70" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-5 lg:gap-16 lg:px-8">
          <div className="reveal lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-tenda">Prenota</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">Il tuo posto al sole <em className="text-tenda">ti aspetta</em>.</h2>
            <p className="mt-5 max-w-md leading-7 text-white/70">Invia la richiesta: ricevi subito la ricevuta (per email, su WhatsApp o entrambi, secondo i recapiti che lasci) e ti confermiamo la postazione in pochi minuti.</p>
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
              {['Richiesta in un minuto', 'Conferma via email', `Oppure chiamaci al ${config.telefono}`].map((t) => (
                <li key={t} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-acqua/20 text-acqua"><Check className="h-3.5 w-3.5" /></span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="reveal lg:col-span-3">
            <FormOmbrellone onInviato={(nome, dove) => { mostraToast(`Richiesta ombrellone inviata, ${nome}! Ti abbiamo scritto ${dove}.`) }} />
          </div>
        </div>
      </section>
      )}

      {ombrelloni && (<>
      {/* Listino */}
      <section id="listino" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <div className="reveal text-center">
            <Occhiello centrato>Listino {config.stagione.anno}</Occhiello>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">Ombrellone + 2 lettini</h2>
            <p className="mt-3 text-profondo/60">Tariffa giornaliera per fila e periodo · prezzi sincronizzati col gestionale.</p>
            <p className="mt-1 text-xs text-profondo/40">Tariffe dimostrative: si aggiornano dal gestionale (Tariffe).</p>
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

      </>)}

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
                { i: MapPin, t: 'Dove siamo', v: `${config.indirizzo} ${config.localita} · a 3 km dal centro`, href: config.mappa },
                { i: Phone, t: 'Telefono', v: config.telefono, href: `tel:${config.telefono.replace(/\s/g, '')}` },
                ...(config.email ? [{ i: Mail, t: 'Email', v: config.email, href: `mailto:${config.email}` }] : []),
                { i: Clock, t: 'Orari', v: `Spiaggia ${config.orari.stagioneSpiaggia} · Ristorante tutto l’anno, ${config.orari.ristorantePranzo} e ${config.orari.ristoranteCena}` },
              ].map(({ i: Icona, t, v, href }) => (
                <li key={t} className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-tenda"><Icona className="h-5 w-5" /></span>
                  <div><p className="text-xs uppercase tracking-widest text-white/50">{t}</p>{href ? <a href={href} target="_blank" rel="noreferrer" className="mt-0.5 block font-medium hover:text-tenda">{v}</a> : <p className="mt-0.5 font-medium">{v}</p>}</div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={config.mappa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-tenda px-5 py-2.5 text-sm font-semibold text-profondo hover:bg-tenda/90"><MapPin className="h-4 w-4" /> Indicazioni</a>
              <a href={config.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Facebook</a>
              <a href={config.tripadvisor.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Tripadvisor</a>
            </div>
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
            <img src={logoLido} alt={config.nome} className="mx-auto h-20 w-auto brightness-0 invert sm:mx-0" />
            <p className="mt-1 text-sm text-white/50">{config.indirizzo} {config.localita}{config.partitaIva && ` · P.IVA ${config.partitaIva}`}</p>
            <p className="mt-1 text-[10px] text-white/30">Foto Cabine: J. Billinger (CC BY-SA 2.0) · Docce: J. Robles (CC BY-SA 3.0) · Area relax: Cayo Espanto (CC BY-SA 4.0), via Wikimedia Commons</p>
          </div>
          <p className="text-xs text-white/40">Sito dimostrativo generato dal gestionale <span className="font-semibold text-white/70">Beach<span className="text-tenda">In</span></span></p>
        </div>
      </footer>

      {/* Pulsante flottante "Prenota" su mobile, dopo l'hero */}
      <button
        onClick={() => scrollTo(idPrenota)}
        className={cn('fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-boa px-5 py-3.5 font-semibold text-white shadow-2xl shadow-boa/40 transition-all duration-500 lg:hidden', oltreHero ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0')}
      >
        {prenotaOmbrelloni ? <><Umbrella className="h-5 w-5" /> Prenota</> : <><UtensilsCrossed className="h-5 w-5" /> Prenota un tavolo</>}
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


      {/* Dettaglio evento + prenotazione */}
      <EventoModal
        evento={eventoSel}
        prenotabile={canaliPrenotazione.eventi}
        onChiudi={() => setEventoSel(undefined)}
        onPrenotato={(nome, dove) => { setEventoSel(undefined); mostraToast(`Richiesta di partecipazione inviata, ${nome}! Ti abbiamo scritto ${dove}.`) }}
      />
      <AnteprimaWhatsApp />
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

function Recensioni({ temi }: { temi: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % temi.length), 5000)
    return () => window.clearInterval(t)
  }, [temi.length])
  const ta = config.tripadvisor
  return (
    <div className="reveal mt-12">
      <Quote className="mx-auto h-10 w-10 text-tenda/80" />
      <p key={i} className="dissolvi mx-auto mt-4 min-h-[6rem] max-w-3xl font-display text-2xl italic leading-snug text-white/95 sm:text-4xl">{temi[i]}</p>
      <p className="mt-2 text-xs uppercase tracking-widest text-white/50">Cosa dicono i clienti · in sintesi dalle recensioni</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button onClick={() => setI((x) => (x - 1 + temi.length) % temi.length)} aria-label="Precedente" className="rounded-full border border-white/30 p-2 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
        <a href={ta.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur transition-colors hover:bg-white/20">
          <span className="flex gap-1">{Array.from({ length: 5 }).map((_, k) => <span key={k} className={cn('h-3.5 w-3.5 rounded-full border-2 border-[#34E0A1]', k < Math.round(ta.voto) && 'bg-[#34E0A1]')} />)}</span>
          <span className="num text-sm font-semibold">{ta.voto.toFixed(1).replace('.', ',')}</span>
          <span className="text-xs text-white/70">· {ta.recensioni} recensioni Tripadvisor · {ta.classifica}</span>
        </a>
        <button onClick={() => setI((x) => (x + 1) % temi.length)} aria-label="Successivo" className="rounded-full border border-white/30 p-2 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
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

export function EventoModal({ evento: e, prenotabile, onChiudi, onPrenotato }: { evento?: Evento; prenotabile: boolean; onChiudi: () => void; onPrenotato: (nome: string, dove: string) => void }) {
  const { inviaRichiestaEvento } = useDemoData()
  const [f, setF] = useState({ nome: '', email: '', telefono: '', persone: '2', note: '', privacy: false })
  const [inviato, setInviato] = useState(false)
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const valido = f.nome.trim() && contattoValido(f.email, f.telefono) && f.privacy
  const passato = !!e && e.data < config.stagione.oggi

  // reset del form quando cambia l'evento selezionato
  useEffect(() => { setF({ nome: '', email: '', telefono: '', persone: '2', note: '', privacy: false }); setInviato(false) }, [e?.id])

  const invia = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!e) return
    inviaRichiestaEvento({
      nome: f.nome.trim(), email: f.email.trim(), telefono: f.telefono.trim(),
      eventoId: e.id, eventoNome: e.nome, eventoData: e.data,
      persone: Math.max(1, Number(f.persone) || 1), note: f.note.trim() || undefined,
    })
    setInviato(true)
    onPrenotato(f.nome.trim().split(' ')[0], doveScritto(f.email, f.telefono))
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
                <div><p className="font-semibold text-profondo">Richiesta inviata!</p><p className="text-sm text-profondo/60">Ti abbiamo mandato la ricevuta {doveScritto(f.email, f.telefono)}. Ti confermiamo la partecipazione dal gestionale.</p></div>
              </div>
            </div>
          ) : (
            <form onSubmit={invia} className="grid grid-cols-2 gap-3 rounded-2xl border border-calce-200 bg-calce/40 p-4">
              <p className="col-span-2 flex items-center gap-1.5 font-bold text-profondo"><Ticket className="h-4 w-4 text-cabina" /> Prenota la tua partecipazione</p>
              <Campo label="Nome e cognome" span2><input required className={pc} value={f.nome} onChange={(ev) => set('nome', ev.target.value)} placeholder="Mario Rossi" /></Campo>
              <Campo label="Email"><input type="email" className={pc} value={f.email} onChange={(ev) => set('email', ev.target.value)} placeholder="tu@email.it" /></Campo>
              <Campo label="Cellulare"><input type="tel" className={pc} value={f.telefono} onChange={(ev) => set('telefono', ev.target.value)} placeholder="340 1234567" /></Campo>
              <NotaContatto email={f.email} telefono={f.telefono} />
              <Campo label="Persone"><input type="number" min={1} className={pc} value={f.persone} onChange={(ev) => set('persone', ev.target.value)} /></Campo>
              <Campo label="Note"><input className={pc} value={f.note} onChange={(ev) => set('note', ev.target.value)} placeholder="facoltative" /></Campo>
              <ConsensoPrivacy checked={f.privacy} onChange={(v) => set('privacy', v)} />
              <button type="submit" disabled={!valido} className="col-span-2 mt-2 h-12 rounded-full bg-boa font-semibold text-white shadow-lg shadow-boa/30 transition-all hover:scale-[1.01] hover:bg-[#ee6440] disabled:opacity-50 disabled:shadow-none">Invia richiesta</button>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}

// ————————————————— Form di prenotazione —————————————————

function FormOmbrellone({ onInviato }: { onInviato: (nome: string, dove: string) => void }) {
  const { inviaRichiestaOmbrellone } = useDemoData()
  const oggi = config.stagione.oggi
  const [f, setF] = useState({ nome: '', email: '', telefono: '', dal: oggi, al: oggi, tipologia: 'ombrellone_2_lettini' as TipologiaPostazione, persone: '2', privacy: false })
  const [inviato, setInviato] = useState(false)
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const valido = f.nome.trim() && contattoValido(f.email, f.telefono) && f.privacy

  if (inviato) return <Successo testo={`La tua richiesta di ombrellone è partita. Ti abbiamo mandato la ricevuta ${doveScritto(f.email, f.telefono)}: appena la confermiamo dal gestionale ti scriviamo di nuovo.`} onAltro={() => setInviato(false)} />

  return (
    <form onSubmit={(e) => { e.preventDefault(); inviaRichiestaOmbrellone({ nome: f.nome.trim(), email: f.email.trim(), telefono: f.telefono.trim(), dal: f.dal, al: f.al, tipologiaPostazione: f.tipologia, persone: Math.max(1, Number(f.persone) || 1) }); setInviato(true); onInviato(f.nome.trim().split(' ')[0], doveScritto(f.email, f.telefono)) }}
      className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 text-profondo shadow-2xl shadow-profondo-900/30 sm:p-8">
      <p className="col-span-2 font-display text-2xl font-semibold">Richiedi il tuo ombrellone</p>
      <Campo label="Nome e cognome" span2><input required className={pc} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Mario Rossi" /></Campo>
      <Campo label="Email"><input type="email" className={pc} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.it" /></Campo>
      <Campo label="Cellulare"><input type="tel" className={pc} value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="340 1234567" /></Campo>
      <NotaContatto email={f.email} telefono={f.telefono} />
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
      <ConsensoPrivacy checked={f.privacy} onChange={(v) => set('privacy', v)} />
      <button type="submit" disabled={!valido} className="col-span-2 mt-2 h-12 rounded-full bg-boa font-semibold text-white shadow-lg shadow-boa/30 transition-all hover:scale-[1.01] hover:bg-[#ee6440] disabled:opacity-50 disabled:shadow-none">Invia richiesta</button>
    </form>
  )
}

export function FormRistorante({ onInviato }: { onInviato: (nome: string, dove: string) => void }) {
  const { inviaRichiestaRistorante, tavoliDelGiorno, prenotazioniRistorante, richiesteRistorante, giorniChiusi } = useDemoData()
  const oggi = config.oggi // ristorante aperto tutto l'anno: data reale, non limitata alla stagione
  // richieste dal sito ancora da confermare: occupano già posti e orari
  const inAttesa = useMemo(() => richiesteRistorante.filter((r) => r.stato === 'da_confermare'), [richiesteRistorante])
  const disp = (d: string, t: Turno) => prenotabilita(tavoliDelGiorno(d), prenotazioniRistorante, inAttesa, d, t)
  // disponibilità dal vivo: giorni chiusi, turni al completo (nessun gruppo ci sta più, nemmeno unendo tavoli)
  const statoDi = (d: string) => {
    const st = statoGiorno(tavoliDelGiorno(d), prenotazioniRistorante, giorniChiusi, d)
    if (st.stato === 'chiuso') return st
    const pieno = { pranzo: st.pieno.pranzo || disp(d, 'pranzo').coperti.length === 0, cena: st.pieno.cena || disp(d, 'cena').coperti.length === 0 }
    return { ...st, pieno, stato: pieno.pranzo && pieno.cena ? 'pieno' as const : pieno.pranzo || pieno.cena ? 'parziale' as const : 'libero' as const }
  }
  const [f, setF] = useState({ nome: '', email: '', telefono: '', data: oggi, turno: 'cena' as Turno, ora: '', coperti: '2', note: '', privacy: false })
  const [inviato, setInviato] = useState(false)
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const sel = statoDi(f.data)
  const turnoPieno = sel.pieno[f.turno]
  const pren = disp(f.data, f.turno)
  const nCoperti = Number(f.coperti) || 0
  const sist = pren.coperti.find((c) => c.n === nCoperti)?.sistemazione
  const oraOk = pren.orari.some((o) => o.ora === f.ora && o.postiLiberi >= nCoperti)
  const valido = f.nome.trim() && contattoValido(f.email, f.telefono) && f.privacy && !turnoPieno && sist && oraOk
  const scegliData = (d: string) => {
    const st = statoDi(d)
    // se il turno scelto è al completo quel giorno, passa all'altro
    setF((p) => ({ ...p, data: d, ora: '', turno: st.pieno[p.turno] ? (p.turno === 'cena' ? 'pranzo' : 'cena') : p.turno }))
  }

  if (inviato) return <Successo testo={`La tua richiesta di tavolo è partita. Ti abbiamo mandato la ricevuta ${doveScritto(f.email, f.telefono)}; ti confermiamo il tavolo dal gestionale.`} onAltro={() => setInviato(false)} />

  return (
    <form onSubmit={(e) => { e.preventDefault(); inviaRichiestaRistorante({ nome: f.nome.trim(), email: f.email.trim(), telefono: f.telefono.trim(), data: f.data, turno: f.turno, ora: f.ora, coperti: Math.max(1, nCoperti), note: f.note.trim() || undefined }); setInviato(true); onInviato(f.nome.trim().split(' ')[0], doveScritto(f.email, f.telefono)) }}
      className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 shadow-xl shadow-profondo/10 ring-1 ring-calce-200 sm:p-8">
      <p className="col-span-2 font-display text-2xl font-semibold text-profondo">Prenota un tavolo</p>
      <Campo label="Nome e cognome" span2><input required className={pc} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Mario Rossi" /></Campo>
      <Campo label="Email"><input type="email" className={pc} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.it" /></Campo>
      <Campo label="Cellulare"><input type="tel" className={pc} value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="340 1234567" /></Campo>
      <NotaContatto email={f.email} telefono={f.telefono} />
      <div className="col-span-2">
        <span className="mb-1 block text-xs font-medium text-profondo/60">Data</span>
        <CalendarioDisponibilita valore={f.data} minimo={oggi} onScegli={scegliData} stato={(d) => statoDi(d).stato} />
      </div>
      <Campo label="Turno">
        <select className={pc} value={f.turno} onChange={(e) => setF((p) => ({ ...p, turno: e.target.value as Turno, ora: '' }))}>
          <option value="pranzo" disabled={sel.pieno.pranzo}>Pranzo{sel.pieno.pranzo ? ' — al completo' : ''}</option>
          <option value="cena" disabled={sel.pieno.cena}>Cena{sel.pieno.cena ? ' — al completo' : ''}</option>
        </select>
      </Campo>
      <Campo label="Persone">
        <select className={pc} value={sist ? f.coperti : ''} onChange={(e) => set('coperti', e.target.value)} disabled={turnoPieno}>
          {!sist && <option value="">Scegli…</option>}
          {pren.coperti.map((c) => <option key={c.n} value={c.n}>{c.n} {c.n === 1 ? 'persona' : 'persone'}</option>)}
        </select>
      </Campo>
      {!turnoPieno && (
        <div className="col-span-2">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Orario di arrivo</span>
          <div className="flex flex-wrap gap-2">
            {pren.orari.map((o) => {
              const off = o.postiLiberi < Math.max(1, nCoperti)
              return (
                <button key={o.ora} type="button" disabled={off} onClick={() => set('ora', o.ora)}
                  className={cn('num h-10 rounded-full px-4 text-sm font-semibold ring-1 transition-colors',
                    f.ora === o.ora ? 'bg-cabina text-white ring-cabina' : off ? 'cursor-not-allowed bg-calce text-profondo/30 line-through ring-calce-200' : 'bg-white text-profondo ring-calce-200 hover:ring-cabina')}
                  title={off ? 'Orario al completo' : `${o.postiLiberi} posti ancora in arrivo a quest'ora`}>
                  {o.ora}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-profondo/55">
            {sist ? <>Per {nCoperti} {nCoperti === 1 ? 'persona' : 'persone'}: {descriviSistemazione(sist)}.</> : 'Scegli quante persone siete.'}
            {pren.coperti.length > 0 && <> Online fino a {pren.coperti[pren.coperti.length - 1].n} persone; per gruppi più grandi chiamaci.</>}
            {!f.ora && sist && <span className="font-medium text-[#9A6B00]"> Scegli un orario.</span>}
          </p>
        </div>
      )}
      {(sel.stato === 'chiuso' || turnoPieno) && (
        <p className="col-span-2 rounded-xl bg-boa/10 px-3 py-2 text-sm font-medium text-boa">
          {sel.stato === 'chiuso' ? `Il ristorante è chiuso questo giorno${sel.nota ? ` (${sel.nota})` : ''}: scegli un’altra data.` : 'Questo turno è al completo: scegli un altro giorno o turno.'}
        </p>
      )}
      <ConsensoPrivacy checked={f.privacy} onChange={(v) => set('privacy', v)} />
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

export function Sospese({ testo, className }: { testo: string; className?: string }) {
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

/** Dove abbiamo scritto al cliente: email se valida, WhatsApp se c'è il cellulare, entrambi se entrambi. */
function doveScritto(email: string, telefono: string) {
  const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const wa = telefono.replace(/\D/g, '').length >= 9
  return mail && wa ? 'per email e su WhatsApp' : wa ? 'su WhatsApp' : 'per email'
}

/** Basta uno dei due recapiti: email valida oppure cellulare (almeno 9 cifre). */
function contattoValido(email: string, telefono: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || telefono.replace(/\D/g, '').length >= 9
}

function NotaContatto({ email, telefono }: { email: string; telefono: string }) {
  const ok = contattoValido(email, telefono)
  return (
    <p className={cn('col-span-2 -mt-2 text-xs', ok ? 'text-profondo/50' : 'font-medium text-[#9A6B00]')}>
      {ok ? 'Ti ricontattiamo al recapito indicato.' : 'Obbligatorio almeno uno tra email e cellulare.'}
    </p>
  )
}

/** Checkbox di consenso con informativa GDPR (art. 13 Reg. UE 2016/679) leggibile in una finestra. */
function ConsensoPrivacy({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const [aperta, setAperta] = useState(false)
  const recapito = config.email || config.telefono
  return (
    <>
      <label className="col-span-2 flex items-start gap-2.5 text-sm text-profondo/75">
        <input type="checkbox" required checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-boa" />
        <span>
          Ho letto l’<button type="button" onClick={() => setAperta(true)} className="font-semibold text-cabina underline underline-offset-2">informativa sul trattamento dei dati personali</button> e acconsento al trattamento per gestire la mia richiesta. <span className="text-boa">*</span>
        </span>
      </label>
      {aperta && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-profondo-900/60 p-4 backdrop-blur-sm" onClick={() => setAperta(false)}>
          <div role="dialog" aria-modal="true" aria-label="Informativa privacy" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-sm leading-6 text-profondo shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-2xl font-semibold">Informativa privacy</p>
              <button type="button" onClick={() => setAperta(false)} aria-label="Chiudi" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-calce"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-1 text-xs text-profondo/55">ai sensi dell’art. 13 del Regolamento UE 2016/679 (GDPR)</p>
            <div className="mt-4 space-y-3 text-profondo/80">
              <p><b>Titolare del trattamento.</b> {config.nome}, {config.indirizzo} {config.localita}. Contatto: {recapito}.</p>
              <p><b>Dati trattati.</b> Nome e cognome, email e/o numero di cellulare, dati della prenotazione (date, persone, eventuali note).</p>
              <p><b>Finalità e base giuridica.</b> Gestire la richiesta di prenotazione e ricontattarti per confermarla (art. 6.1.b GDPR, misure precontrattuali richieste dall’interessato). I dati non sono usati per marketing senza un tuo ulteriore consenso esplicito.</p>
              <p><b>Conferimento.</b> Nome e almeno un recapito (email o cellulare) sono necessari: senza non possiamo gestire la prenotazione.</p>
              <p><b>Conservazione.</b> Per il tempo necessario a gestire la prenotazione e fino alla fine della stagione balneare, salvo obblighi di legge (es. fiscali) che richiedano tempi più lunghi.</p>
              <p><b>Destinatari.</b> Personale autorizzato dello stabilimento e fornitori tecnici (hosting, invio email) nominati responsabili del trattamento. I dati non vengono diffusi.</p>
              <p><b>I tuoi diritti.</b> Accesso, rettifica, cancellazione, limitazione, opposizione e portabilità (artt. 15–22 GDPR), scrivendo o chiamando il Titolare. Puoi proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).</p>
            </div>
            <button type="button" onClick={() => { onChange(true); setAperta(false) }} className="mt-6 h-11 w-full rounded-full bg-boa font-semibold text-white hover:bg-[#ee6440]">Ho letto, acconsento</button>
          </div>
        </div>
      )}
    </>
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
