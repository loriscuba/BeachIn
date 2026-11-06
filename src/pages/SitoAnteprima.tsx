import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Play, Pause, Umbrella, UtensilsCrossed, Star, Clock, Check, CalendarDays, X, Sparkles, Ticket, ChevronLeft, ChevronRight,
} from 'lucide-react'
import type { Evento, FilaId, Meteo, Periodo, Turno, TipologiaPostazione, VoceTariffa } from '@/data/types'
import { getDisponibilitaSito, getListinoPubblicato } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { fotoSito, logoLido, videoHero } from '@/assets/sito'
import { useModuli } from '@/context/ModuliContext'
import { useMeteoOggi } from '@/hooks/useMeteoOggi'
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
const etichettaMeteo: Record<Meteo, string> = { sole: 'sole', poco_nuvoloso: 'poco nuvoloso', nuvoloso: 'nuvoloso', pioggia: 'pioggia', temporale: 'temporale' }
const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export default function SitoAnteprima() {
  const { eventi: tuttiEventi, canaliPrenotazione, galleria, menu, sezioniMenu, homeSito, prezziListino, lavagnetta } = useDemoData()
  const meteo = useMeteoOggi()
  const eventi = tuttiEventi.filter((e) => e.pubblicato !== false) // le bozze non si vedono
  // Gestione ombrelloni (modulo Arenile): se spento, dal sito spariscono prenotazione, listino e disponibilità.
  const ombrelloni = useModuli().moduloAttivo('arenile')
  // Prenotazione ombrellone dal sito: doppio controllo, modulo Arenile attivo E canale "Ombrelloni" acceso (Sito → Prenotazioni).
  const prenotaOmbrelloni = ombrelloni && canaliPrenotazione.ombrelloni
  const voci = nav.filter(([id]) => (id !== 'prenota' || prenotaOmbrelloni) && (id !== 'listino' || ombrelloni))
  const voceNastro = nastro.filter((t) => ombrelloni || !/ombrell/i.test(t))
  const idPrenota = prenotaOmbrelloni ? 'prenota' : 'prenota-tavolo'
  const [disp, setDisp] = useState<{ libere: number; totali: number; occupazione: number }>()
  const [listino, setListino] = useState<VoceTariffa[]>([])
  const [menuMobile, setMenuMobile] = useState(false)
  const [toast, setToast] = useState<string>()
  const [eventoSel, setEventoSel] = useState<Evento>()
  const [scrollato, setScrollato] = useState(false)
  const [oltreHero, setOltreHero] = useState(false)
  const [foto, setFoto] = useState<number>()
  const video = useRef<HTMLVideoElement>(null)
  const [inPausa, setInPausa] = useState(false)
  const [movimentoRidotto] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    Promise.all([getDisponibilitaSito(), getListinoPubblicato()]).then(
      ([d, l]) => { setDisp(d); setListino(l) }
    )
  }, [])

  // Barra che si riempie allo scroll + parallasse leggera sulla foto dell'hero.
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        setScrollato(y > 40)
        setOltreHero(y > window.innerHeight * 0.8)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const matrice = useMemo(() => {
    const m = new Map<string, number>()
    // prezzi pubblicati da Tariffe sopra quelli iniziali
    for (const v of listino) if (v.durata === 'giornaliera' && v.tipologia === 'ombrellone_2_lettini') m.set(`${v.fila}|${v.periodo}`, prezziListino[v.id] ?? v.prezzo)
    return m
  }, [listino, prezziListino])
  const [prezzoMin, prezzoMax] = useMemo(() => {
    const v = [...matrice.values()]
    return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1]
  }, [matrice])


  const oggi = config.oggi // eventi: data reale (anche a stagione chiusa), come nel gestionale
  const eventiFuturi = [...eventi].filter((e) => e.data >= oggi).sort((a, b) => a.data.localeCompare(b.data))
  const eventiPassati = [...eventi].filter((e) => e.data < oggi).sort((a, b) => b.data.localeCompare(a.data))
  // In vetrina: prima i prossimi eventi, poi quelli appena conclusi (con foto/recap).
  const eventiVetrina = [...eventiFuturi, ...eventiPassati].slice(0, 8)
  const fotoGalleria = galleria.filter((f) => f.immagine)

  useReveal([homeSito, disp, eventiVetrina.length, fotoGalleria.length, menu.length])

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

  // Link diretto a una sezione (es. pulsante "Prenota" di Google Maps): ?sez=tavolo | ombrellone | <id sezione>.
  const [parametri] = useSearchParams()
  const sezIniziale = useRef(parametri.get('sez'))
  useEffect(() => {
    const sez = sezIniziale.current
    if (!sez) return
    const id = sez === 'tavolo' ? 'prenota-tavolo' : sez === 'ombrellone' || sez === 'ombrelloni' ? idPrenota : sez
    const t = window.setTimeout(() => scrollTo(document.getElementById(id) ? id : idPrenota), 500)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const titoloHero = homeSito.titolo || config.nome
  const sottoHero = homeSito.sottotitolo
  // foto di apertura scelta dal gestore (Sito → Contenuti); senza, video o foto dal drone
  const fotoHero = homeSito.immagine || fotoSito.spiaggiaAlto
  const waSito = (config.whatsapp || '').replace(/[^\d]/g, '')
  // piatto del giorno nel riquadro dell'hero: prima voce della lavagnetta pubblicata, se c'è
  const piattoGiorno = lavagnetta[0]
  const piatti = menu.filter((p) => ['antipasti', 'primi', 'secondi'].includes(p.categoria)).slice(0, 7)

  return (
    <div className="min-h-screen bg-white text-[#00253F]">
      {/* Barra annunci scorrevole */}
      <div className="relative z-40 overflow-hidden bg-[#E8DCC8] py-2 text-[12px] text-[#00253F]">
        <div className="scorri flex w-max gap-6 whitespace-nowrap">
          {[...voceNastro, ...voceNastro, ...voceNastro].map((t, i) => (
            <span key={i} className="flex items-center gap-6">{t} <Asterisco /></span>
          ))}
        </div>
      </div>

      {/* Testata bianca, fissa allo scroll */}
      <header className={cn('sticky top-0 z-40 bg-white transition-shadow duration-500', scrollato && 'shadow-[0_10px_30px_rgba(0,37,63,0.08)]')}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <button onClick={() => scrollTo('top')} className="shrink-0" aria-label={config.nome}><img src={logoLido} alt={config.nome} className="h-11 w-auto sm:h-12" /></button>
          <div className="flex items-center gap-3 sm:gap-6">
            <button onClick={() => scrollTo(idPrenota)} className="pulsante-el hidden sm:inline-flex"><Rotola>Prenota ora</Rotola></button>
            <a href={`tel:${config.telefono.replace(/\s/g, '')}`} className="hidden text-sm text-[#00253F] hover:text-[#5C4D40] md:inline">{config.telefono}</a>
            <button onClick={() => setMenuMobile(true)} className="group flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" aria-label="Apri il menu">
              Menu
              <span className="flex w-6 flex-col gap-1.5"><span className="h-px w-full bg-current transition-all group-hover:w-4" /><span className="h-px w-4 bg-current transition-all group-hover:w-full" /></span>
            </button>
          </div>
        </div>
      </header>

      {/* Menu a tutto schermo */}
      <div className={cn('fixed inset-0 z-50 flex flex-col bg-[#5C4D40] text-white transition-[clip-path] duration-700 ease-[cubic-bezier(.7,0,.2,1)]', menuMobile ? '[clip-path:inset(0_0_0_0)]' : 'pointer-events-none [clip-path:inset(0_0_100%_0)]')} aria-hidden={!menuMobile}>
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-5 py-4 lg:px-8">
          <img src={logoLido} alt={config.nome} className="h-11 w-auto brightness-0 invert" />
          <button onClick={() => setMenuMobile(false)} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">Chiudi <X className="h-5 w-5" /></button>
        </div>
        <nav className="mx-auto grid w-full max-w-[1400px] flex-1 content-center px-5 lg:px-8">
          {voci.map(([id, label], i) => (
            <button key={id} onClick={() => scrollTo(id)} tabIndex={menuMobile ? 0 : -1}
              className={cn('group flex items-center justify-between border-b border-white/15 py-3 text-left font-titolo text-4xl uppercase transition-all duration-700 sm:text-6xl', menuMobile ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0')}
              style={{ transitionDelay: menuMobile ? `${200 + i * 60}ms` : '0ms' }}>
              <span className="transition-transform duration-500 group-hover:translate-x-3">{label}</span>
              <ArrowUpRight className="h-6 w-6 transition-transform duration-500 group-hover:rotate-45" />
            </button>
          ))}
          <Link to="/sito" className="mt-6 text-sm text-[#E8DCC8]">Vai al gestionale →</Link>
        </nav>
      </div>

      <div id="top" />

      {/* Hero: foto/video a tutta larghezza, titolo in alto, riquadro "Oggi in spiaggia" in basso a destra */}
      <section className="relative isolate min-h-[88svh] overflow-hidden bg-black text-white">
        <div className="absolute inset-0 -z-10">
          {videoHero && !movimentoRidotto && !homeSito.immagine
            ? <video ref={video} src={videoHero} poster={fotoHero} autoPlay muted loop playsInline preload="auto" aria-hidden className="h-full w-full object-cover" />
            : <img src={fotoHero} alt={`${config.nome}: la spiaggia`} className="kenburns h-full w-full object-cover object-[center_55%]" fetchPriority="high" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-[13%] hidden w-px bg-white/25 lg:block" />
        {videoHero && !movimentoRidotto && !homeSito.immagine && (
          <button onClick={() => { const v = video.current; if (!v) return; if (v.paused) { v.play(); setInPausa(false) } else { v.pause(); setInPausa(true) } }}
            aria-label={inPausa ? 'Riproduci il video' : 'Metti in pausa il video'}
            className="absolute right-[13%] top-1/3 hidden h-20 w-20 translate-x-1/2 place-items-center rounded-full bg-white text-black transition-transform duration-500 hover:scale-110 lg:grid">
            {inPausa ? <Play className="ml-1 h-6 w-6 fill-current" /> : <Pause className="h-6 w-6 fill-current" />}
          </button>
        )}
        <div className="mx-auto flex min-h-[88svh] max-w-[1400px] flex-col justify-between gap-10 px-5 pb-8 pt-10 lg:px-8 lg:pt-14">
          <div className="hero-in max-w-3xl">
            <h1 className="text-balance font-titolo text-[3.2rem] uppercase leading-[0.95] sm:text-7xl lg:text-[6.2rem]">{titoloHero}</h1>
            {sottoHero && <p className="mt-3 font-titolo text-2xl uppercase text-[#E8DCC8] sm:text-3xl">{sottoHero}</p>}
            {homeSito.testo && <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/80">{homeSito.testo}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {prenotaOmbrelloni && <button onClick={() => scrollTo('prenota')} className="pulsante-el"><Rotola>Prenota l’ombrellone</Rotola></button>}
              <button onClick={() => scrollTo('prenota-tavolo')} className={prenotaOmbrelloni ? 'pulsante-el pulsante-el--vuoto' : 'pulsante-el'}><Rotola>Prenota un tavolo</Rotola></button>
            </div>
          </div>

          <div className="dissolvi ml-auto w-full max-w-md text-[#00253F]">
            <span className="inline-block rounded-t-lg bg-[#E8DCC8] px-4 pb-2 pt-2.5 font-titolo text-sm uppercase tracking-wide">
              {ombrelloni && disp ? `Oggi in spiaggia · ${dataEstesa(config.stagione.oggi)}` : config.localita}
            </span>
            <div className="rounded-b-lg rounded-tr-lg bg-white p-5 shadow-2xl">
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center text-center">
                {ombrelloni && disp
                  ? <Cifra valore={disp.libere} etichetta="Liberi" />
                  : <Cifra valore={config.tripadvisor.voto} decimali={1} etichetta="Tripadvisor" />}
                <span className="text-xl text-[#5C4D40]">+</span>
                {ombrelloni && disp
                  ? <Cifra valore={disp.totali} etichetta="Postazioni" />
                  : <Cifra valore={config.tripadvisor.recensioni} etichetta="Recensioni" />}
                <span className="text-xl text-[#5C4D40]">+</span>
                {meteo ? <Cifra valore={Math.round(meteo.temp ?? meteo.max)} etichetta={`° ${etichettaMeteo[meteo.meteo]}`} /> : <Cifra valore={3} etichetta="km dal centro" />}
              </div>
              {piattoGiorno && (
                <button onClick={() => scrollTo('ristorante')} className="mt-4 flex w-full items-center justify-between gap-3 border-t border-[#00253F]/10 pt-3 text-left text-sm">
                  <span className="truncate"><span className="text-[#00253F]/55">Piatto del giorno: </span>{piattoGiorno.nome}</span>
                  {piattoGiorno.prezzo != null && <span className="num shrink-0 font-titolo text-lg">{euro(piattoGiorno.prezzo)}</span>}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Il lido: titolo grande, capsule di foto che si impilano allo scroll */}
      <section className="px-5 pt-24 lg:px-8 lg:pt-36">
        <h2 className="reveal text-center font-titolo text-[3.4rem] uppercase leading-[0.9] text-[#A08E7E] sm:text-8xl lg:text-[9rem]">Il lido</h2>
        <div className="mx-auto mt-10 max-w-[19rem] sm:max-w-sm">
          {[
            { f: fotoSito.ombrelloniCielo, t: ombrelloni ? 'Ombrelloni fronte mare' : 'La spiaggia' },
            { f: fotoSito.ristorante, t: 'Ristorante di pesce' },
            { f: fotoSito.tramonto, t: 'Tramonti sul mare' },
          ].map((c, i) => (
            <div key={c.t} className="sticky mb-10 last:mb-0" style={{ top: `${110 + i * 24}px` }}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.18)]">
                <img src={c.f} alt={c.t} loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <p className="absolute inset-x-0 bottom-10 text-center font-titolo text-xl uppercase text-white">{c.t}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-5xl py-24 text-center lg:py-32">
          <TestoRiempito className="font-titolo text-3xl uppercase leading-[1.1] sm:text-5xl" testo={`A tre chilometri dal centro di Savona, un lido familiare dove le giornate hanno il ritmo giusto: ${ombrelloni ? 'ombrellone e lettini, ' : ''}docce calde, area relax e un ristorante di pesce aperto tutto l’anno`} />
          <button onClick={() => scrollTo('servizi')} className="pulsante-el reveal mt-10"><Rotola>Scopri i servizi</Rotola></button>
        </div>
      </section>

      {/* Servizi: carosello orizzontale con numeri e barra di avanzamento */}
      <section id="servizi" className="scroll-mt-24 pb-24 lg:pb-32">
        <Carosello
          voci={[
            ...(ombrelloni ? [{ f: fotoSito.ombrelloniCielo, t: 'Ombrelloni e lettini', d: 'Ombrellone e due lettini, dalla prima fila sul mare alle file più tranquille.', dett: [['Postazioni', disp ? String(disp.totali) : '—'], ['File', 'Dalla A alla I'], ['Orari', `${config.orari.apertura} – ${config.orari.chiusura}`]] }] : []),
            { f: fotoSito.barDistillati, t: 'Il bar', d: 'Colazioni, caffè, aperitivi e pause fresche, con ordini anche dal lettino.', dett: [['Apertura', `${config.orari.barApertura} – ${config.orari.barChiusura}`], ['Ordini', 'Anche dal QR']] },
            { f: fotoSito.ristorante, t: 'Il ristorante', d: 'Pesce fresco scelto al banco, a pranzo in costume o a cena con vista mare.', dett: [['Pranzo', config.orari.ristorantePranzo], ['Cena', config.orari.ristoranteCena], ['Prezzo medio', `~${config.prezzoMedioRistorante} €`]] },
            { f: fotoSito.beachVolley, t: 'Beach volley', d: 'Campo da beach volley, tornei durante l’estate e ping pong.', dett: [['Tornei', 'In calendario eventi']] },
            { f: fotoSito.cabine, t: 'Cabine', d: 'Per gli effetti personali, i giochi e i gonfiabili dei bambini.', dett: [] },
            { f: fotoSito.docce, t: 'Docce e servizi', d: 'Docce calde e fredde e servizi igienici sempre puliti.', dett: [] },
            { f: fotoSito.areaRelax, t: 'Area relax', d: 'Divanetti all’ombra tra un bagno e l’altro.', dett: [] },
            { f: fotoSito.famiglia, t: 'Animazione', d: 'Giochi per i bambini e intrattenimento per gli adulti.', dett: [] },
          ]}
          onPrenota={() => scrollTo(idPrenota)}
        />
      </section>

      {/* Numeri del lido: barre color sabbia che si riempiono */}
      <section className="mx-auto max-w-[1400px] px-5 pb-24 lg:px-8 lg:pb-32">
        <TestoRiempito className="max-w-4xl font-titolo text-3xl uppercase leading-[1.1] sm:text-5xl" testo="Ogni estate tante famiglie tornano da noi: i numeri del Lido parlano da soli" />
        <div className="mt-14 grid gap-x-0 gap-y-8 md:grid-cols-2">
          <Barra lato="sx" valore={config.tripadvisor.voto} max={5} decimali={1} etichetta="Voto su Tripadvisor" />
          <Barra lato="dx" valore={config.tripadvisor.recensioni} max={Math.max(config.tripadvisor.recensioni * 1.25, 100)} etichetta="Recensioni dei clienti" />
          <Barra lato="sx" valore={3} max={10} etichetta="Km dal centro di Savona" />
          {ombrelloni && disp
            ? <Barra lato="dx" valore={Math.round((1 - disp.occupazione) * 100)} max={100} suffisso="%" etichetta="Spiaggia libera oggi" />
            : <Barra lato="dx" valore={config.prezzoMedioRistorante} max={60} suffisso=" €" etichetta="Prezzo medio al ristorante" />}
        </div>
      </section>

      {/* Ristorante dentro un pannello color crema con angoli arrotondati */}
      <section id="ristorante" className="scroll-mt-24 rounded-[2rem] bg-[#F9F6F0] py-20 lg:rounded-[3rem] lg:py-28">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 lg:grid-cols-2 lg:gap-14 lg:px-8">
          <FotoSvela src={fotoSito.ristorante} alt="La sala del ristorante sulla spiaggia" classe="aspect-[4/3] lg:aspect-auto lg:min-h-[520px]" />
          <div className="flex flex-col">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.12em]">Il ristorante</p>
            <h2 className="reveal mt-4 font-titolo text-4xl uppercase leading-[1.02] sm:text-5xl">Pesce del giorno scelto al banco, a pranzo in costume o a cena con vista mare</h2>
            <div className="mt-auto grid items-end gap-6 pt-10 sm:grid-cols-[1fr_auto]">
              <p className="reveal max-w-sm text-sm leading-6 text-[#00253F]/70">Piatti di mare e di terra, opzioni vegetariane, vini e birre artigianali. Pranzo {config.orari.ristorantePranzo}, cena {config.orari.ristoranteCena}. Aperto tutto l’anno.</p>
              <FotoSvela src={fotoSito.tramonto} alt="Tramonto dal ristorante" classe="aspect-[4/3] w-full sm:w-56" />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-5 pt-24 lg:px-8">
          <p className="reveal text-center text-xs font-semibold uppercase tracking-[0.12em]">Dalla cucina</p>
          <TestoRiempito className="mx-auto mt-4 max-w-4xl text-center font-titolo text-3xl uppercase leading-[1.1] sm:text-5xl" testo="Ogni piatto racconta il mare di Liguria, dal pescato del mattino alla focaccia calda" />
          <ul className="mx-auto mt-12 grid max-w-5xl gap-x-12 md:grid-cols-2">
            {[...(piattoGiorno ? [{ id: 'oggi', nome: piattoGiorno.nome, prezzo: piattoGiorno.prezzo, cat: 'Lavagnetta di oggi' }] : []), ...piatti.map((p) => ({ id: p.id, nome: p.nome, prezzo: p.prezzo as number | null, cat: sezioniMenu.find((s) => s.id === p.categoria)?.nome ?? etichetteCategoriaPiatto[p.categoria] }))].map((p, i) => (
              <li key={p.id} className="reveal group flex items-baseline gap-3 border-b border-[#00253F]/12 py-4" style={{ transitionDelay: `${(i % 2) * 80}ms` }}>
                <div className="min-w-0 flex-1">
                  <p className="font-titolo text-2xl uppercase transition-colors group-hover:text-[#5C4D40]">{p.nome}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#00253F]/45">{p.cat}</p>
                </div>
                {p.prezzo != null && <span className="num font-titolo text-2xl">{euro(p.prezzo)}</span>}
              </li>
            ))}
          </ul>
          <div id="prenota-tavolo" className="reveal mx-auto mt-14 max-w-3xl scroll-mt-28">
            {canaliPrenotazione.ristorante
              ? <FormRistorante onInviato={(nome, dove) => { mostraToast(`Richiesta tavolo inviata, ${nome}! Ti abbiamo scritto ${dove}.`) }} />
              : <Sospese testo="Le prenotazioni del ristorante online sono momentaneamente sospese. Chiamaci per riservare un tavolo." />}
          </div>
        </div>
      </section>

      {prenotaOmbrelloni && (
      /* Prenota ombrellone: testo a sinistra, foto ad arco al centro, modulo a destra */
      <section id="prenota" className="scroll-mt-24 py-24 lg:py-32">
        <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-5 lg:grid-cols-[1fr_0.8fr_1.3fr] lg:px-8">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">Prenota</p>
            <h2 className="mt-4 font-titolo text-4xl uppercase leading-[1.02] sm:text-5xl">Il tuo posto al sole ti aspetta</h2>
            <p className="mt-5 text-sm leading-6 text-[#00253F]/70">Invia la richiesta: ricevi subito la ricevuta (email, WhatsApp o entrambi) e ti confermiamo la postazione in pochi minuti. Oppure chiamaci al {config.telefono}.</p>
            {disp && <p className="mt-6 font-titolo text-5xl"><Contatore valore={disp.libere} /> <span className="text-base uppercase text-[#00253F]/60">liberi su {disp.totali}</span></p>}
          </div>
          <FotoSvela src={fotoSito.bagnino} alt="La postazione del bagnino" classe="hidden aspect-[3/4] rounded-t-full lg:block" />
          <div className="reveal">
            <FormOmbrellone onInviato={(nome, dove) => { mostraToast(`Richiesta ombrellone inviata, ${nome}! Ti abbiamo scritto ${dove}.`) }} />
          </div>
        </div>
      </section>
      )}

      {ombrelloni && (
      /* Listino */
      <section id="listino" className="scroll-mt-24 pb-24 lg:pb-32">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <div className="reveal text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">Listino {config.stagione.anno}</p>
            <h2 className="mt-4 font-titolo text-4xl uppercase sm:text-5xl">Ombrellone e due lettini</h2>
            <p className="mt-3 text-sm text-[#00253F]/60">Tariffa giornaliera per fila e periodo, aggiornata dal gestionale.</p>
          </div>
          <div className="reveal mt-10 overflow-x-auto rounded-lg border border-[#00253F]/10">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="bg-[#F9F6F0]">
                <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#00253F]/55">Fila</th>
                {periodi.map((pp) => <th key={pp} className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#00253F]/55">{etichettePeriodo[pp]}</th>)}
              </tr></thead>
              <tbody>
                {file.map((f, i) => (
                  <tr key={f} className="border-t border-[#00253F]/8">
                    <td className="px-4 py-1.5">
                      <span className="font-titolo text-lg uppercase">Fila {f}</span>
                      {i === 0 && <span className="ml-2 rounded bg-[#E8DCC8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">fronte mare</span>}
                    </td>
                    {periodi.map((pp) => {
                      const v = matrice.get(`${f}|${pp}`)
                      const t = v === undefined ? 0 : (v - prezzoMin) / Math.max(1, prezzoMax - prezzoMin)
                      return (
                        <td key={pp} className="p-1">
                          <div className="num rounded py-2.5 text-center font-semibold" style={{ background: v === undefined ? undefined : `rgba(232,220,200,${0.25 + t * 0.75})` }}>
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
      )}

      {/* Eventi */}
      <section id="eventi" className="scroll-mt-24 pb-24 lg:pb-32">
        <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
          <div className="reveal text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">Eventi</p>
            <h2 className="mx-auto mt-4 max-w-3xl font-titolo text-4xl uppercase leading-[1.02] sm:text-5xl">Serate, tornei e cene sotto le stelle</h2>
          </div>
          {eventiVetrina.length === 0 && <p className="mt-8 text-center text-sm text-[#00253F]/50">Nessun evento al momento.</p>}
          <div className="-mx-5 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {eventiVetrina.map((e, i) => {
              const passato = e.data < oggi
              const nFoto = e.galleria?.length ?? 0
              const [, mm, gg] = e.data.split('-')
              return (
                <button key={e.id} onClick={() => setEventoSel(e)}
                  className="reveal group relative aspect-[3/4] w-[78%] shrink-0 snap-start overflow-hidden rounded-lg bg-[#5C4D40] text-left text-white sm:w-[45%] lg:w-auto"
                  style={{ transitionDelay: `${(i % 4) * 90}ms` }}>
                  {e.foto && <img src={e.foto} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <span className="absolute left-4 top-4 rounded bg-white px-2.5 py-1.5 text-center text-[#00253F]">
                    <span className="block font-titolo text-2xl leading-none">{Number(gg)}</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em]">{mesi[Number(mm) - 1]}</span>
                  </span>
                  {passato
                    ? <span className="absolute right-4 top-4 rounded bg-black/50 px-2 py-1 text-[11px] uppercase tracking-wider">Concluso</span>
                    : !!e.prezzo && <span className="absolute right-4 top-4 rounded bg-[#E8DCC8] px-2 py-1 text-xs font-semibold text-[#00253F]">{euro(e.prezzo)}</span>}
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-titolo text-2xl uppercase leading-tight">{e.nome}</h3>
                    <span className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E8DCC8] opacity-80 transition-opacity group-hover:opacity-100">
                      {passato ? (nFoto > 0 ? `Rivedi le foto (${nFoto})` : 'Rivivi l’evento') : (canaliPrenotazione.eventi ? 'Scopri e prenota' : 'Scopri di più')}
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Recensioni */}
      <section className="mx-auto max-w-[1400px] px-5 pb-24 lg:px-8 lg:pb-32">
        <Recensioni temi={temiRecensioni} />
      </section>

      {/* Galleria */}
      {fotoGalleria.length > 0 && (
        <section id="galleria" className="scroll-mt-24 pb-24 lg:pb-32">
          <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
            <div className="reveal text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">Galleria</p>
              <h2 className="mx-auto mt-4 max-w-3xl font-titolo text-4xl uppercase leading-[1.02] sm:text-5xl">Cartoline dalla nostra spiaggia</h2>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
              {fotoGalleria.map((f, i) => (
                <button key={f.id} onClick={() => setFoto(i)} className="reveal group relative aspect-[3/4] overflow-hidden rounded-lg" style={{ transitionDelay: `${(i % 4) * 90}ms` }}>
                  <img src={f.immagine} alt={f.titolo} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110" />
                  <span className="absolute inset-x-3 bottom-3 translate-y-2 rounded bg-white/95 px-3 py-2 text-left font-titolo text-sm uppercase text-[#00253F] opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">{f.titolo}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Invito finale su foto */}
      <section className="px-5 pb-24 lg:px-8 lg:pb-32">
        <div className="relative mx-auto grid min-h-[420px] max-w-[1400px] place-items-center overflow-hidden rounded-lg text-center text-white">
          <FotoSvela src={fotoSito.spiaggiaDrone} alt="" classe="absolute inset-0 h-full w-full rounded-none" />
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative px-5">
            <h2 className="reveal mx-auto max-w-3xl font-titolo text-4xl uppercase leading-[1.02] sm:text-6xl">Lascia la città alle spalle e goditi il mare</h2>
            <button onClick={() => scrollTo(idPrenota)} className="pulsante-el reveal mt-8"><Rotola>Prenota ora</Rotola></button>
          </div>
        </div>
      </section>

      {/* Piede marrone con voci grandi e contatti */}
      <footer id="contatti" className="scroll-mt-24 rounded-t-[2rem] bg-[#5C4D40] text-white lg:rounded-t-[3rem]">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[1fr_1fr_1.2fr]">
          <div className="px-5 py-14 lg:px-8">
            <img src={logoLido} alt={config.nome} className="h-16 w-auto brightness-0 invert" />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/75">Un lido familiare a Savona: spiaggia, bar e ristorante di pesce aperto tutto l’anno.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {config.facebook && <a href={config.facebook} target="_blank" rel="noreferrer" className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.12em] hover:bg-white/10">Facebook</a>}
              <a href={config.tripadvisor.url} target="_blank" rel="noreferrer" className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.12em] hover:bg-white/10">Tripadvisor</a>
              {waSito.length >= 9 && <a href={`https://wa.me/${waSito.startsWith('39') ? waSito : `39${waSito}`}`} target="_blank" rel="noreferrer" className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.12em] hover:bg-white/10">WhatsApp</a>}
            </div>
          </div>
          <nav className="border-white/20 lg:border-x">
            {voci.filter(([id]) => id !== 'contatti').map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="group flex w-full items-center justify-between border-t border-white/20 px-5 py-4 text-left font-titolo text-3xl uppercase lg:px-8">
                <span className="transition-transform duration-500 group-hover:translate-x-2">{label}</span>
                <ArrowUpRight className="h-5 w-5 transition-transform duration-500 group-hover:rotate-45" />
              </button>
            ))}
          </nav>
          <div className="grid gap-8 border-t border-white/20 px-5 py-14 text-sm sm:grid-cols-2 lg:border-t-0 lg:px-8">
            <div>
              <p className="font-titolo text-2xl uppercase">Contatti</p>
              <p className="mt-3"><a href={`tel:${config.telefono.replace(/\s/g, '')}`} className="hover:text-[#E8DCC8]">{config.telefono}</a></p>
              {config.email && <p className="mt-2 break-all"><a href={`mailto:${config.email}`} className="hover:text-[#E8DCC8]">{config.email}</a></p>}
            </div>
            <div>
              <p className="font-titolo text-2xl uppercase">Dove siamo</p>
              <p className="mt-3 leading-6 text-white/80">{config.indirizzo} {config.localita}</p>
              <a href={config.mappa} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[#E8DCC8] hover:underline">Indicazioni <ArrowUpRight className="h-4 w-4" /></a>
            </div>
            <div className="sm:col-span-2">
              <p className="font-titolo text-2xl uppercase">Orari</p>
              <p className="mt-3 leading-6 text-white/80">Spiaggia {config.orari.stagioneSpiaggia} · Bar {config.orari.barApertura}–{config.orari.barChiusura} · Ristorante {config.orari.ristorantePranzo} e {config.orari.ristoranteCena}{config.orari.nota ? ` · ${config.orari.nota}` : ''}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/20 px-5 py-5 text-center text-[11px] text-white/55">
          {config.indirizzo} {config.localita}{config.partitaIva && ` · P.IVA ${config.partitaIva}`} · Sito generato dal gestionale BeachIn
          <span className="mt-1 block text-[10px] text-white/35">Foto Cabine: J. Billinger (CC BY-SA 2.0) · Docce: J. Robles (CC BY-SA 3.0) · Area relax: Cayo Espanto (CC BY-SA 4.0), via Wikimedia Commons</span>
        </div>
      </footer>

      {/* Pulsante flottante "Prenota" su mobile, dopo l'hero */}
      <button
        onClick={() => scrollTo(idPrenota)}
        className={cn('fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-md bg-[#E8DCC8] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#00253F] shadow-2xl transition-all duration-500 lg:hidden', oltreHero ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0')}
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

/** Stellina a quattro punte tra le voci della barra annunci. */
function Asterisco() {
  return <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-current" aria-hidden><path d="M5 0c.4 2.6 2 4.6 5 5-3 .4-4.6 2.4-5 5-.4-2.6-2-4.6-5-5 3-.4 4.6-2.4 5-5z" /></svg>
}

/** Testo del pulsante che "rotola" verso l'alto al passaggio del mouse (vedi .pulsante-el in index.css). */
function Rotola({ children }: { children: React.ReactNode }) {
  return <span className="rotola"><span>{children}</span><span aria-hidden>{children}</span></span>
}

/** Numero grande del riquadro dell'hero, che conta fino al valore. */
function Cifra({ valore, etichetta, decimali }: { valore: number; etichetta: string; decimali?: number }) {
  return (
    <div className="min-w-0">
      <p className="font-titolo text-4xl leading-none sm:text-5xl"><Contatore valore={valore} decimali={decimali} /></p>
      <p className="mt-1 truncate text-xs text-[#00253F]/60">{etichetta}</p>
    </div>
  )
}

/** Frase le cui parole passano da grigio chiaro a blu man mano che si scorre la pagina. */
function TestoRiempito({ testo, className }: { testo: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [p, setP] = useState(() => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0))
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const calcola = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        const h = window.innerHeight
        // 0 quando la frase entra dal basso, 1 quando arriva a un terzo dello schermo
        setP(Math.min(1, Math.max(0, (h * 0.9 - r.top) / (h * 0.9 - h * 0.3 + r.height * 0.5))))
      })
    }
    calcola()
    window.addEventListener('scroll', calcola, { passive: true })
    window.addEventListener('resize', calcola)
    return () => { window.removeEventListener('scroll', calcola); window.removeEventListener('resize', calcola); cancelAnimationFrame(raf) }
  }, [])
  const parole = testo.split(' ')
  return (
    <p ref={ref} className={className} aria-label={testo}>
      {parole.map((w, i) => (
        <span key={i} aria-hidden className="transition-colors duration-300" style={{ color: i / parole.length < p ? '#00253F' : 'rgba(0,37,63,0.14)' }}>{w}{i < parole.length - 1 ? ' ' : ''}</span>
      ))}
    </p>
  )
}

/** Riga di numeri con barra color sabbia che si allunga quando entra nello schermo. */
function Barra({ valore, max, etichetta, lato, decimali, suffisso = '' }: { valore: number; max: number; etichetta: string; lato: 'sx' | 'dx'; decimali?: number; suffisso?: string }) {
  const sx = lato === 'sx'
  return (
    <div className={cn('reveal barra-el', sx ? 'md:border-r md:border-dashed md:border-[#00253F]/25 md:pr-0' : 'md:pl-0')}>
      <p className={cn('mb-3 text-[11px] uppercase tracking-[0.12em] text-[#00253F]/70', sx ? 'md:pr-6 md:text-right' : 'md:pl-6')}>{etichetta}</p>
      <div className={cn('relative flex h-12 items-center bg-[#E8DCC8]/45', sx ? 'justify-start' : 'justify-end')}>
        <div className={cn('barra-el__riempi absolute inset-y-0', sx ? 'right-0 bg-[#C9B9A2]' : 'left-0 bg-gradient-to-r from-[#F3EDE3] to-[#C9B9A2]')} style={{ ['--l' as string]: `${Math.min(100, (valore / max) * 100) * 0.82}%` }} />
        <span className="relative px-5 font-titolo text-2xl"><Contatore valore={valore} decimali={decimali} />{suffisso}</span>
      </div>
    </div>
  )
}

/** Foto che si "apre" dal basso con un leggero zoom quando entra nello schermo. */
function FotoSvela({ src, alt, classe }: { src: string; alt: string; classe?: string }) {
  return (
    <div className={cn('reveal foto-svela overflow-hidden rounded-lg', classe)}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  )
}

type VoceCarosello = { f: string; t: string; d: string; dett: string[][] }

/** Carosello orizzontale dei servizi: una scheda alla volta al centro, frecce, numeri e barra di avanzamento. */
function Carosello({ voci, onPrenota }: { voci: VoceCarosello[]; onPrenota: () => void }) {
  const pista = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const vai = (n: number) => {
    const el = pista.current
    if (!el) return
    const k = (n + voci.length) % voci.length
    const figlio = el.children[k] as HTMLElement | undefined
    if (figlio) el.scrollTo({ left: figlio.offsetLeft - (el.clientWidth - figlio.clientWidth) / 2, behavior: 'smooth' })
  }
  useEffect(() => {
    const el = pista.current
    if (!el) return
    const su = () => {
      const centro = el.scrollLeft + el.clientWidth / 2
      let migliore = 0
      let dist = Infinity
      Array.from(el.children).forEach((c, k) => {
        const h = c as HTMLElement
        const d = Math.abs(h.offsetLeft + h.clientWidth / 2 - centro)
        if (d < dist) { dist = d; migliore = k }
      })
      setI(migliore)
    }
    el.addEventListener('scroll', su, { passive: true })
    return () => el.removeEventListener('scroll', su)
  }, [])
  const due = (n: number) => String(n).padStart(2, '0')
  return (
    <div>
      <div ref={pista} className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-2 [scrollbar-width:none] lg:gap-10 lg:px-[12%] [&::-webkit-scrollbar]:hidden">
        {voci.map((v, k) => (
          <article key={v.t} className={cn('grid w-[86%] shrink-0 snap-center items-center gap-6 transition-opacity duration-700 md:w-[78%] md:grid-cols-[1fr_1.1fr_0.9fr] lg:w-[72%]', k === i ? 'opacity-100' : 'opacity-35')}>
            <div className="order-2 md:order-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">I servizi del lido</p>
              <h3 className="mt-3 font-titolo text-4xl uppercase leading-none">{v.t}</h3>
              <p className="mt-3 text-sm leading-6 text-[#00253F]/70">{v.d}</p>
            </div>
            <div className="order-1 aspect-[4/3] overflow-hidden rounded-lg md:order-2">
              <img src={v.f} alt={v.t} loading="lazy" className={cn('h-full w-full object-cover transition-transform duration-[1.4s] ease-out', k === i ? 'scale-100' : 'scale-110')} />
            </div>
            <div className="order-3">
              {v.dett.length > 0 && (
                <dl className="space-y-3">
                  {v.dett.map(([a, b]) => (
                    <div key={a} className="flex gap-2 border-b border-[#00253F]/15 pb-2 text-sm"><dt className="font-titolo uppercase">{a}:</dt><dd className="text-[#00253F]/70">{b}</dd></div>
                  ))}
                </dl>
              )}
              <button onClick={onPrenota} className="pulsante-el mt-5"><Rotola>Prenota</Rotola></button>
            </div>
          </article>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-[1400px] items-center gap-5 px-5 lg:px-8">
        <span className="num font-titolo text-lg">{due(i + 1)}</span>
        <div className="relative h-px flex-1 bg-[#00253F]/15"><div className="absolute inset-y-0 left-0 bg-[#00253F] transition-[width] duration-700" style={{ width: `${((i + 1) / voci.length) * 100}%` }} /></div>
        <span className="num font-titolo text-lg text-[#00253F]/50">{due(voci.length)}</span>
        <button onClick={() => vai(i - 1)} aria-label="Servizio precedente" className="grid h-11 w-11 place-items-center rounded-md bg-[#5C4D40] text-white transition-transform hover:-translate-x-0.5"><ArrowLeft className="h-4 w-4" /></button>
        <button onClick={() => vai(i + 1)} aria-label="Servizio successivo" className="grid h-11 w-11 place-items-center rounded-md bg-[#5C4D40] text-white transition-transform hover:translate-x-0.5"><ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function Recensioni({ temi }: { temi: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % temi.length), 6000)
    return () => window.clearInterval(t)
  }, [temi.length])
  const ta = config.tripadvisor
  return (
    <div className="reveal grid gap-10 lg:grid-cols-[220px_1fr_300px] lg:items-start">
      <div>
        <p className="font-titolo text-6xl leading-none">{ta.voto.toFixed(1).replace('.', ',')}</p>
        <p className="mt-2 flex gap-1">{Array.from({ length: 5 }).map((_, k) => <Star key={k} className={cn('h-4 w-4', k < Math.round(ta.voto) ? 'fill-[#C9A227] text-[#C9A227]' : 'text-[#00253F]/20')} />)}</p>
        <a href={ta.url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-[#00253F]/60 hover:underline">{ta.recensioni} recensioni su Tripadvisor · {ta.classifica}</a>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">Cosa dicono i clienti</p>
        <p key={i} className="dissolvi mt-4 min-h-[7rem] font-titolo text-3xl uppercase leading-[1.08] sm:text-4xl">{temi[i]}</p>
        <p className="mt-3 text-xs text-[#00253F]/50">In sintesi dalle recensioni Tripadvisor, non citazioni testuali.</p>
        <div className="mt-6 flex gap-2">
          <button onClick={() => setI((x) => (x - 1 + temi.length) % temi.length)} aria-label="Precedente" className="grid h-11 w-11 place-items-center rounded-md bg-[#5C4D40] text-white"><ArrowLeft className="h-4 w-4" /></button>
          <button onClick={() => setI((x) => (x + 1) % temi.length)} aria-label="Successivo" className="grid h-11 w-11 place-items-center rounded-md bg-[#5C4D40] text-white"><ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="hidden aspect-[4/5] overflow-hidden rounded-lg lg:block">
        <img key={i} src={[fotoSito.famiglia, fotoSito.marePini, fotoSito.pineta, fotoSito.torneo, fotoSito.areaRelax][i % 5]} alt="" loading="lazy" className="dissolvi h-full w-full object-cover" />
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
        <figcaption className="mt-3 text-center text-white/80"><span className="font-titolo font-normal text-lg">{f.titolo}</span> <span className="num ml-2 text-xs text-white/40">{indice + 1} / {n}</span></figcaption>
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
  const passato = !!e && e.data < config.oggi

  // reset del form quando cambia l'evento selezionato
  useEffect(() => { setF({ nome: '', email: '', telefono: '', persone: '2', note: '', privacy: false }); setInviato(false) }, [e?.id])

  const invio = useInvio()
  const invia = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!e) return
    void invio.invia(() => inviaRichiestaEvento({
      nome: f.nome.trim(), email: f.email.trim(), telefono: f.telefono.trim(),
      eventoId: e.id, eventoNome: e.nome, eventoData: e.data,
      persone: Math.max(1, Number(f.persone) || 1), note: f.note.trim() || undefined,
    }), () => {
      setInviato(true)
      onPrenotato(f.nome.trim().split(' ')[0], doveScritto(f.email, f.telefono))
    })
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
              <Campo label="Email" mezzo><input type="email" className={pc} value={f.email} onChange={(ev) => set('email', ev.target.value)} placeholder="tu@email.it" /></Campo>
              <Campo label="Cellulare" mezzo><input type="tel" className={pc} value={f.telefono} onChange={(ev) => set('telefono', ev.target.value)} placeholder="340 1234567" /></Campo>
              <NotaContatto email={f.email} telefono={f.telefono} />
              <Campo label="Persone"><input type="number" min={1} className={pc} value={f.persone} onChange={(ev) => set('persone', ev.target.value)} /></Campo>
              <Campo label="Note"><input className={pc} value={f.note} onChange={(ev) => set('note', ev.target.value)} placeholder="facoltative" /></Campo>
              <ConsensoPrivacy checked={f.privacy} onChange={(v) => set('privacy', v)} />
              <PulsanteInvio valido={!!valido} invio={invio} />
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}

// ————————————————— Form di prenotazione —————————————————

/** Invio di una richiesta: la conferma compare solo quando il DB l'ha ricevuta (da lì partono notifica e mail). */
function useInvio() {
  const [stato, setStato] = useState<'pronto' | 'in_corso' | 'errore'>('pronto')
  const invia = async (manda: () => Promise<boolean>, fatto: () => void) => {
    if (stato === 'in_corso') return
    setStato('in_corso')
    const ok = await manda().catch(() => false)
    setStato(ok ? 'pronto' : 'errore')
    if (ok) fatto()
  }
  return { stato, invia }
}

function PulsanteInvio({ valido, invio }: { valido: boolean; invio: ReturnType<typeof useInvio> }) {
  const inCorso = invio.stato === 'in_corso'
  return (
    <>
      {invio.stato === 'errore' && <p className="col-span-2 rounded-xl bg-boa/10 px-3 py-2 text-sm text-boa">Invio non riuscito: controlla la connessione e riprova.</p>}
      <button type="submit" disabled={!valido || inCorso} className="col-span-2 mt-2 h-12 rounded-full bg-boa font-semibold text-white shadow-lg shadow-boa/30 transition-all hover:scale-[1.01] hover:bg-[#ee6440] disabled:opacity-50 disabled:shadow-none">{inCorso ? 'Invio in corso…' : invio.stato === 'errore' ? 'Riprova' : 'Invia richiesta'}</button>
    </>
  )
}

function FormOmbrellone({ onInviato }: { onInviato: (nome: string, dove: string) => void }) {
  const { inviaRichiestaOmbrellone } = useDemoData()
  const oggi = config.stagione.oggi
  const [f, setF] = useState({ nome: '', email: '', telefono: '', dal: oggi, al: oggi, tipologia: 'ombrellone_2_lettini' as TipologiaPostazione, persone: '2', privacy: false })
  const [inviato, setInviato] = useState(false)
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const valido = f.nome.trim() && contattoValido(f.email, f.telefono) && f.privacy
  const invio = useInvio()

  if (inviato) return <Successo testo={`La tua richiesta di ombrellone è partita. Ti abbiamo mandato la ricevuta ${doveScritto(f.email, f.telefono)}: appena la confermiamo dal gestionale ti scriviamo di nuovo.`} onAltro={() => setInviato(false)} />

  return (
    <form onSubmit={(e) => { e.preventDefault(); void invio.invia(() => inviaRichiestaOmbrellone({ nome: f.nome.trim(), email: f.email.trim(), telefono: f.telefono.trim(), dal: f.dal, al: f.al, tipologiaPostazione: f.tipologia, persone: Math.max(1, Number(f.persone) || 1) }), () => { setInviato(true); onInviato(f.nome.trim().split(' ')[0], doveScritto(f.email, f.telefono)) }) }}
      className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 text-profondo shadow-2xl shadow-profondo-900/30 sm:p-8">
      <p className="col-span-2 font-titolo font-normal text-2xl font-semibold">Richiedi il tuo ombrellone</p>
      <Campo label="Nome e cognome" span2><input required className={pc} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Mario Rossi" /></Campo>
      <Campo label="Email" mezzo><input type="email" className={pc} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.it" /></Campo>
      <Campo label="Cellulare" mezzo><input type="tel" className={pc} value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="340 1234567" /></Campo>
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
      <PulsanteInvio valido={!!valido} invio={invio} />
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
  const invio = useInvio()
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
    <form onSubmit={(e) => { e.preventDefault(); void invio.invia(() => inviaRichiestaRistorante({ nome: f.nome.trim(), email: f.email.trim(), telefono: f.telefono.trim(), data: f.data, turno: f.turno, ora: f.ora, coperti: Math.max(1, nCoperti), note: f.note.trim() || undefined }), () => { setInviato(true); onInviato(f.nome.trim().split(' ')[0], doveScritto(f.email, f.telefono)) }) }}
      className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 shadow-xl shadow-profondo/10 ring-1 ring-calce-200 sm:p-8">
      <p className="col-span-2 font-titolo font-normal text-2xl font-semibold text-profondo">Prenota un tavolo</p>
      <Campo label="Nome e cognome" span2><input required className={pc} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Mario Rossi" /></Campo>
      <Campo label="Email" mezzo><input type="email" className={pc} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.it" /></Campo>
      <Campo label="Cellulare" mezzo><input type="tel" className={pc} value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="340 1234567" /></Campo>
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
      <PulsanteInvio valido={!!valido} invio={invio} />
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
          Ho letto l’<span role="button" tabIndex={0} onClick={() => setAperta(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAperta(true) } }} className="cursor-pointer font-semibold text-cabina underline underline-offset-2">informativa sul trattamento dei dati personali</span> e acconsento al trattamento per gestire la mia richiesta. <span className="text-boa">*</span>
        </span>
      </label>
      {aperta && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-profondo-900/60 p-4 backdrop-blur-sm" onClick={() => setAperta(false)}>
          <div role="dialog" aria-modal="true" aria-label="Informativa privacy" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-sm leading-6 text-profondo shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <p className="font-titolo font-normal text-2xl font-semibold">Informativa privacy</p>
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

// `mezzo`: mezza riga da tablet in su, riga intera su telefono (email e cellulare affiancati non ci stanno).
function Campo({ label, span2, mezzo, children }: { label: string; span2?: boolean; mezzo?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn('block min-w-0', span2 && 'col-span-2', mezzo && 'col-span-2 sm:col-span-1')}>
      <span className="mb-1 block text-xs font-medium text-profondo/60">{label}</span>
      {children}
    </label>
  )
}
