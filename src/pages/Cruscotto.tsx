import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, Loader2,
  TrendingUp, TrendingDown, Umbrella, UtensilsCrossed, Coffee,
  Wrench, PackageOpen, Wallet, CalendarCheck, ChevronRight, ArrowUpRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ArticoloBar, Cliente, GiornoStagione, KpiCruscotto, Meteo, StatoPostazione } from '@/data/types'
import { getArticoliBar, getClienti, getGiorni, getKpiCruscotto } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { contatoriArenile } from '@/lib/calcoli'
import { coloriCentro, etichetteCentro, ordineCentriRicavo } from '@/lib/graficoColori'
import { euro, euroCent, numero, percento, data as fmtData, giornoSettimana, dataEstesa } from '@/lib/formatters'
import { config } from '@/data/config'
import { cn } from '@/lib/cn'

const meteoIcona: Record<Meteo, typeof Sun> = {
  sole: Sun, poco_nuvoloso: CloudSun, nuvoloso: Cloud, pioggia: CloudRain, temporale: CloudLightning,
}
const meteoLabel: Record<Meteo, string> = {
  sole: 'Sole', poco_nuvoloso: 'Poco nuvoloso', nuvoloso: 'Nuvoloso', pioggia: 'Pioggia', temporale: 'Temporale',
}
const etichettaStato: Record<StatoPostazione, string> = {
  libera: 'Libera', occupata: 'Occupata', prenotata: 'Prenotata', stagionale: 'Stagionale', fuori_servizio: 'Fuori servizio',
}

export default function Cruscotto() {
  const { postazioni, prenotazioniOnline, costi, incassoDemo } = useDemoData()
  const [kpi, setKpi] = useState<KpiCruscotto>()
  const [giorni, setGiorni] = useState<GiornoStagione[]>([])
  const [articoli, setArticoli] = useState<ArticoloBar[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])

  useEffect(() => {
    Promise.all([getKpiCruscotto(), getGiorni(), getArticoliBar(), getClienti()]).then(
      ([k, g, a, c]) => {
        setKpi(k)
        setGiorni(g)
        setArticoli(a)
        setClienti(c)
      }
    )
  }, [])

  const contatori = useMemo(() => contatoriArenile(postazioni), [postazioni])

  const mixRicavi = useMemo(() => {
    const consuntivo = giorni.filter((g) => g.consuntivo)
    const somma = (f: (g: GiornoStagione) => number) => consuntivo.reduce((s, g) => s + f(g), 0)
    const valori = {
      spiaggia: somma((g) => g.incassoSpiaggia),
      ristorante: somma((g) => g.incassoRistorante),
      noleggi: somma((g) => g.incassoNoleggi),
      bar: somma((g) => g.incassoBar),
    }
    const totale = Object.values(valori).reduce((s, v) => s + v, 0) || 1
    return ordineCentriRicavo.map((c) => ({ centro: c, valore: valori[c], quota: valori[c] / totale }))
  }, [giorni])

  const meteoGiorni = useMemo(() => {
    if (!kpi) return []
    const idx = giorni.findIndex((g) => g.data === kpi.oggi.data)
    return idx >= 0 ? giorni.slice(idx, idx + 4) : []
  }, [giorni, kpi])

  const scadenze = useMemo(
    () =>
      costi
        .filter((c) => c.statoPagamento !== 'pagato')
        .sort((a, b) => (a.scadenza ?? '').localeCompare(b.scadenza ?? ''))
        .slice(0, 6),
    [costi]
  )

  const saldiAperti = useMemo(() => clienti.filter((c) => c.saldoAperto > 0), [clienti])
  const scorteBasse = useMemo(() => articoli.filter((a) => a.giacenza < a.sogliaRiordino), [articoli])
  const prenotazioniDaConfermare = prenotazioniOnline.filter((p) => p.stato === 'da_confermare')

  if (!kpi) {
    return (
      <div className="grid h-64 place-items-center text-profondo/50">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const oggi = kpi.oggi
  // Occupazione dal vivo (riflette assegnazioni e demo guidata)
  const occupazioneOggi = contatori.occupazione
  const deltaOcc = occupazioneOggi - kpi.occupazioneAnnoScorso
  const incassoTotale = kpi.incassoOggi + incassoDemo
  const areeIncasso = [
    { label: 'Spiaggia', valore: oggi.incassoSpiaggia, colore: coloriCentro.spiaggia },
    { label: 'Bar', valore: oggi.incassoBar, colore: coloriCentro.bar },
    { label: 'Ristorante', valore: oggi.incassoRistorante, colore: coloriCentro.ristorante },
    { label: 'Noleggi', valore: oggi.incassoNoleggi, colore: coloriCentro.noleggi },
    ...(incassoDemo > 0 ? [{ label: 'In demo', valore: incassoDemo, colore: '#F2C14E' }] : []),
  ]

  const coperti = kpi.copertiPranzo + kpi.copertiCena
  // Serie degli ultimi 30 giorni; l'ultimo punto (oggi) usa il valore dal vivo.
  const conOggi = (f: (g: GiornoStagione) => number, live: number) =>
    kpi.ultimi30.map((g) => (g.data === oggi.data ? live : f(g)))
  const serieIncasso = conOggi((g) => g.incassoSpiaggia + g.incassoBar + g.incassoRistorante + g.incassoNoleggi, incassoTotale)
  const serieOccupazione = conOggi((g) => g.occupazione, occupazioneOggi)
  const serieCoperti = conOggi((g) => g.copertiPranzo + g.copertiCena, coperti)
  const serieScontrino = conOggi((g) => g.scontrinoMedioBar, kpi.scontrinoMedioBar)
  const IconaOggi = meteoIcona[oggi.meteo]

  return (
    <div className="cz -mx-4 -my-5 min-h-full space-y-4 bg-[var(--cz-bg)] px-4 py-5 transition-colors duration-500 lg:-mx-6 lg:-my-6 lg:space-y-5 lg:px-6 lg:py-6">
      {/* ── Hero: saluto, incasso del giorno, meteo ─────────────────────────── */}
      <section className="cz-in relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0B2C39] via-[#0F3B4C] to-[#1B5A6E] p-5 text-white shadow-[0_30px_60px_-30px_rgba(11,44,57,0.8)] sm:p-7">
        <div className="cz-orb -left-16 -top-24 h-72 w-72 bg-[#2E7D9A]/60" />
        <div className="cz-orb -bottom-28 right-10 h-72 w-72 bg-[#F2C14E]/25" style={{ animationDelay: '-6s' }} />
        <Onde />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#F2C14E]">
              {dataEstesa(config.oggi)}
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              {saluto()}, <span className="italic text-[#9FD3C5]">{config.nome}</span>
            </h2>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/55">Incasso di oggi</p>
            <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
              <p className="num font-display text-6xl font-semibold leading-none tracking-tight sm:text-7xl">
                <Conteggio valore={incassoTotale} formato={euro} />
              </p>
              <Variazione delta={variazione(incassoTotale, media7(serieIncasso))} rispetto="vs media 7 giorni" chiaro />
            </div>
            <div className="mt-5 flex h-2.5 max-w-xl overflow-hidden rounded-full bg-white/10" aria-label="Ripartizione incasso per centro">
              {areeIncasso.map((a, i) => (
                <div
                  key={a.label}
                  title={`${a.label}: ${euro(a.valore)}`}
                  className="cz-in h-full"
                  style={{ width: `${(a.valore / (incassoTotale || 1)) * 100}%`, background: a.colore, ['--d' as string]: `${300 + i * 90}ms` }}
                />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
              {areeIncasso.map((a) => (
                <span key={a.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: a.colore }} />
                  {a.label} <span className="num font-semibold text-white">{euro(a.valore)}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Meteo in vetro */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <IconaOggi className="h-14 w-14 shrink-0 text-[#F2C14E] drop-shadow-[0_0_18px_rgba(242,193,78,0.55)]" strokeWidth={1.5} />
              <div>
                <p className="num font-display text-4xl font-semibold leading-none">{oggi.tempMax}°</p>
                <p className="mt-1 text-sm text-white/70">{meteoLabel[oggi.meteo]} a Savona</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs uppercase tracking-wider text-white/50">Presenze</p>
                <p className="num font-display text-2xl font-semibold"><Conteggio valore={kpi.presenze} formato={numero} /></p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {meteoGiorni.map((g, i) => {
                const Icona = meteoIcona[g.meteo]
                return (
                  <div key={g.data} className={cn('rounded-2xl px-2 py-2 text-center', i === 0 ? 'bg-white/15' : 'bg-white/[0.04]')}>
                    <p className="text-[11px] font-semibold uppercase text-white/55">{i === 0 ? 'Oggi' : giornoSettimana(g.data).slice(0, 3)}</p>
                    <Icona className="mx-auto my-1 h-5 w-5 text-[#9FD3C5]" />
                    <p className="num text-sm font-bold">{g.tempMax}°</p>
                    <p className="num text-[11px] text-white/55">{percento(g.occupazione)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI ─────────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Tessera d={120} icona={Umbrella} etichetta="Occupazione arenile" colore="#7FB7A8" serie={serieOccupazione}
          valore={<Conteggio valore={occupazioneOggi * 100} formato={(v) => `${Math.round(v)}%`} />}
          delta={deltaOcc} deltaPunti rispetto="vs anno scorso" anello={occupazioneOggi}
          nota={`${contatori.totali - contatori.libere - contatori.fuoriServizio} postazioni vendute su ${contatori.totali}`} />
        <Tessera d={200} icona={UtensilsCrossed} etichetta="Coperti oggi" colore="#E4572E" serie={serieCoperti}
          valore={<Conteggio valore={coperti} formato={numero} />}
          delta={variazione(coperti, media7(serieCoperti))} rispetto="vs media 7 giorni"
          nota={`${kpi.copertiPranzo} a pranzo · ${kpi.copertiCena} a cena`} />
        <Tessera d={280} icona={Coffee} etichetta="Scontrino medio bar" colore="#F2C14E" serie={serieScontrino}
          valore={<Conteggio valore={kpi.scontrinoMedioBar} formato={euroCent} />}
          delta={variazione(kpi.scontrinoMedioBar, media7(serieScontrino))} rispetto="vs media 7 giorni"
          nota="Media per scontrino, oggi" />
      </div>

      {/* ── Spiaggia dal vivo + cose da fare ────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <MappaSpiaggia d={340} />
        <div className="cz-card cz-in flex flex-col p-5" style={{ ['--d' as string]: '420ms' }}>
          <TitoloCard titolo="Da fare oggi" sotto="Tocca per aprire" />
          <div className="mt-3 flex flex-1 flex-col gap-2">
            <RigaAzione icona={CalendarCheck} colore="#2E7D9A" valore={prenotazioniDaConfermare.length} testo="prenotazioni dal sito da confermare" a="/sito?tab=prenotazioni" evidenzia />
            <RigaAzione icona={Wrench} colore="#E4572E" valore={contatori.fuoriServizio} testo="postazioni fuori servizio" a="/arenile" />
            <RigaAzione icona={PackageOpen} colore="#F2C14E" valore={scorteBasse.length} testo="scorte bar sotto soglia" a="/bar?tab=listino" />
            <RigaAzione icona={Wallet} colore="#7FB7A8" valore={saldiAperti.length} testo={`saldi aperti · ${euro(saldiAperti.reduce((s, c) => s + c.saldoAperto, 0))}`} a="/clienti" />
          </div>
        </div>
      </div>

      {/* ── Incassi 30 giorni + mix ricavi ─────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="cz-card cz-in p-5 lg:col-span-2" style={{ ['--d' as string]: '480ms' }}>
          <TitoloCard titolo="Andamento incassi" sotto="Ultimi 30 giorni · passa sopra il grafico" />
          <GraficoArea giorni={kpi.ultimi30} valori={serieIncasso} />
        </div>
        <div className="cz-card cz-in p-5" style={{ ['--d' as string]: '540ms' }}>
          <TitoloCard titolo="Mix ricavi" sotto="Stagione a oggi" />
          <Ciambella dati={mixRicavi} />
        </div>
      </div>

      {/* ── Scadenze ───────────────────────────────────────────────────────── */}
      <div className="cz-card cz-in p-5" style={{ ['--d' as string]: '600ms' }}>
        <TitoloCard titolo="Prossime scadenze di pagamento" sotto={`${scadenze.length} da saldare`} azione={<Link to="/costi" className="flex items-center gap-1 text-sm font-semibold text-[#2E7D9A] hover:underline">Tutti i costi <ArrowUpRight className="h-4 w-4" /></Link>} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scadenze.map((c) => {
            const scaduto = c.statoPagamento === 'scaduto'
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-[var(--cz-bordo)] bg-[var(--cz-debole)] p-3">
                <div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl text-center leading-none', scaduto ? 'bg-[#E4572E]/15 text-[#E4572E]' : 'bg-[#F2C14E]/20 text-[#B5861B]')}>
                  <div>
                    <p className="num text-lg font-bold">{c.scadenza?.slice(8, 10)}</p>
                    <p className="text-[10px] font-semibold uppercase">{fmtData(c.scadenza!).split(' ')[1]?.slice(0, 3)}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.sottocategoria}</p>
                  <p className="cz-tenue truncate text-xs">{c.fornitore}{scaduto && ' · scaduto'}</p>
                </div>
                <p className="num shrink-0 text-sm font-bold">{euro(c.imponibile * (1 + c.iva))}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Saluto in base all'ora reale. */
function saluto() {
  const h = new Date().getHours()
  return h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'
}

/** Media dei 7 giorni prima di oggi (l'ultimo punto della serie è oggi). */
function media7(serie: number[]) {
  const prima = serie.slice(Math.max(0, serie.length - 8), -1)
  return prima.length ? prima.reduce((s, v) => s + v, 0) / prima.length : 0
}

/** Variazione relativa (0,12 = +12%). */
function variazione(valore: number, riferimento: number) {
  return riferimento ? valore / riferimento - 1 : 0
}

/** Numero che "sale" fino al valore (subito, se l'utente ha chiesto meno movimento). */
function Conteggio({ valore, formato }: { valore: number; formato: (v: number) => string }) {
  const [v, setV] = useState(valore)
  const da = useRef(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(valore); return }
    const inizio = performance.now()
    const partenza = da.current
    let raf = 0
    const passo = (t: number) => {
      const k = Math.min(1, (t - inizio) / 1300)
      const e = 1 - Math.pow(1 - k, 3)
      setV(partenza + (valore - partenza) * e)
      if (k < 1) raf = requestAnimationFrame(passo)
      else da.current = valore
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [valore])
  return <>{formato(v)}</>
}

function Variazione({ delta, deltaPunti, rispetto, chiaro }: { delta: number; deltaPunti?: boolean; rispetto: string; chiaro?: boolean }) {
  const su = delta >= 0
  const testo = deltaPunti
    ? `${su ? '+' : '−'}${Math.abs(Math.round(delta * 100))} punti`
    : `${su ? '+' : '−'}${percento(Math.abs(delta))}`
  return (
    <span className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold',
          chiaro
            ? su ? 'bg-[#7FB7A8]/25 text-[#BDEBDD]' : 'bg-[#E4572E]/25 text-[#FFB9A5]'
            : su ? 'bg-[var(--cz-su-bg)] text-[var(--cz-su)]' : 'bg-[#E4572E]/12 text-[#E4572E]'
        )}
      >
        {su ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        {testo}
      </span>
      <span className={chiaro ? 'text-white/55' : 'cz-tenue'}>{rispetto}</span>
    </span>
  )
}

function TitoloCard({ titolo, sotto, azione }: { titolo: string; sotto?: string; azione?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-xl font-semibold leading-tight">{titolo}</h3>
        {sotto && <p className="cz-tenue mt-0.5 text-xs">{sotto}</p>}
      </div>
      {azione}
    </div>
  )
}

function Tessera({
  d, icona: Icona, etichetta, valore, serie, colore, delta, deltaPunti, rispetto, nota, anello,
}: {
  d: number
  icona: typeof Umbrella
  etichetta: string
  valore: React.ReactNode
  serie: number[]
  colore: string
  delta: number
  /** true = delta in punti percentuali (es. occupazione), altrimenti variazione relativa. */
  deltaPunti?: boolean
  rispetto: string
  nota: string
  /** Se presente (0..1) mostra un anello di avanzamento al posto dell'icona. */
  anello?: number
}) {
  return (
    <div className="cz-card cz-in relative overflow-hidden p-5" style={{ ['--d' as string]: `${d}ms` }}>
      <div className="cz-orb -right-10 -top-10 h-32 w-32 opacity-30" style={{ background: colore }} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="cz-tenue flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${colore}26`, color: colore }}>
            <Icona className="h-4 w-4" />
          </span>
          {etichetta}
        </p>
        {anello != null && <Anello valore={anello} colore={colore} />}
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-3">
        <p className="num font-display text-5xl font-semibold leading-none tracking-tight">{valore}</p>
        <Sparkline valori={serie} colore={colore} etichetta={`${etichetta}, ultimi 30 giorni`} />
      </div>
      <div className="relative mt-3"><Variazione delta={delta} deltaPunti={deltaPunti} rispetto={rispetto} /></div>
      <p className="cz-tenue relative mt-2 text-sm">{nota}</p>
    </div>
  )
}

function Anello({ valore, colore }: { valore: number; colore: string }) {
  const r = 18
  const c = 2 * Math.PI * r
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" className="-mr-1 -mt-1 -rotate-90" aria-hidden>
      <circle cx="23" cy="23" r={r} fill="none" strokeWidth="5" style={{ stroke: 'var(--cz-debole)' }} />
      <circle cx="23" cy="23" r={r} fill="none" stroke={colore} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - valore)} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} />
    </svg>
  )
}

/** Mini grafico a linea (SVG, niente assi): l'andamento, non i valori. */
function Sparkline({ valori, colore, etichetta }: { valori: number[]; colore: string; etichetta: string }) {
  const L = 112
  const A = 44
  if (valori.length < 2) return null
  const min = Math.min(...valori)
  const max = Math.max(...valori)
  const passo = L / (valori.length - 1)
  const y = (v: number) => (max === min ? A / 2 : A - 4 - ((v - min) / (max - min)) * (A - 8))
  const punti = valori.map((v, i) => `${(i * passo).toFixed(1)},${y(v).toFixed(1)}`)
  const id = `spark-${colore.slice(1)}`
  return (
    <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} role="img" aria-label={etichetta} className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colore} stopOpacity="0.35" />
          <stop offset="100%" stopColor={colore} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${A} ${punti.join(' ')} ${L},${A}`} fill={`url(#${id})`} />
      <polyline points={punti.join(' ')} fill="none" stroke={colore} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={L} cy={y(valori[valori.length - 1])} r="4" fill={colore} className="cz-pulsa" style={{ borderRadius: '50%' }} />
    </svg>
  )
}

/** Onde animate in fondo all'hero. */
function Onde() {
  const d = 'M0 30 Q 75 10 150 30 T 300 30 T 450 30 T 600 30 V60 H0 Z'
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 overflow-hidden opacity-[0.12]" aria-hidden>
      <svg className="cz-onda h-full w-[200%]" viewBox="0 0 1200 60" preserveAspectRatio="none">
        <path d={d} fill="#fff" />
        <path d={d} fill="#fff" transform="translate(600 0)" />
      </svg>
    </div>
  )
}

/** La spiaggia vista dall'alto: ogni postazione è un punto colorato per stato. */
function MappaSpiaggia({ d }: { d: number }) {
  const { postazioni } = useDemoData()
  const contatori = useMemo(() => contatoriArenile(postazioni), [postazioni])
  const file = config.arenile.file as readonly string[]
  const legenda: { stato: StatoPostazione; n: number }[] = [
    { stato: 'occupata', n: contatori.occupate },
    { stato: 'prenotata', n: contatori.prenotate },
    { stato: 'stagionale', n: contatori.stagionali },
    { stato: 'libera', n: contatori.libere },
    { stato: 'fuori_servizio', n: contatori.fuoriServizio },
  ]
  return (
    <div className="cz-card cz-in overflow-hidden p-5 lg:col-span-2" style={{ ['--d' as string]: `${d}ms` }}>
      <TitoloCard
        titolo="La spiaggia, adesso"
        sotto="Fila A fronte mare → fila I · si aggiorna dal vivo"
        azione={<Link to="/arenile" className="flex items-center gap-1 text-sm font-semibold text-[#2E7D9A] hover:underline">Apri arenile <ArrowUpRight className="h-4 w-4" /></Link>}
      />
      {/* Mare */}
      <div className="relative mt-4 h-9 overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#2E7D9A] to-[#7FB7A8]">
        <svg className="cz-onda absolute bottom-0 h-4 w-[200%]" viewBox="0 0 1200 20" preserveAspectRatio="none" aria-hidden>
          <path d="M0 10 Q 50 0 100 10 T 200 10 T 300 10 T 400 10 T 500 10 T 600 10 T 700 10 T 800 10 T 900 10 T 1000 10 T 1100 10 T 1200 10 V20 H0 Z" fill="#E9D9B5" />
        </svg>
        <span className="absolute left-3 top-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">Mare</span>
      </div>
      {/* Sabbia */}
      <div className="space-y-1.5 rounded-b-2xl bg-[#E9D9B5]/[0.18] px-3 py-3">
        {file.map((fila) => {
          const riga = postazioni.filter((p) => p.fila === fila).sort((a, b) => a.numero - b.numero)
          return (
            <div key={fila} className="flex items-center gap-2">
              <span className="cz-tenue w-4 shrink-0 text-center text-[11px] font-bold">{fila}</span>
              <div className="flex flex-1 justify-between gap-1">
                {riga.map((p) => (
                  <span
                    key={p.id}
                    title={`${p.id} · ${etichettaStato[p.stato]}`}
                    className="cz-punto aspect-square w-full max-w-[18px] rounded-full"
                    style={{ background: `var(--stato-${p.stato})`, boxShadow: p.stato === 'occupata' ? '0 0 10px rgba(228,87,46,0.45)' : undefined }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {legenda.map((l) => (
          <span key={l.stato} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: `var(--stato-${l.stato})` }} />
            <span className="cz-tenue">{etichettaStato[l.stato]}</span>
            <span className="num font-bold">{l.n}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function RigaAzione({
  icona: Icona, colore, valore, testo, a, evidenzia,
}: { icona: typeof Wrench; colore: string; valore: number; testo: string; a: string; evidenzia?: boolean }) {
  return (
    <Link
      to={a}
      className="group flex flex-1 items-center gap-3 rounded-2xl border border-[var(--cz-bordo)] bg-[var(--cz-debole)] px-3 py-3 transition hover:border-[#2E7D9A]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2E7D9A]"
    >
      <span className={cn('relative grid h-11 w-11 shrink-0 place-items-center rounded-xl', evidenzia && valore > 0 && 'cz-pulsa')} style={{ background: `${colore}26`, color: colore }}>
        <Icona className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="num font-display text-2xl font-semibold leading-none">{valore}</p>
        <p className="cz-tenue mt-1 truncate text-sm">{testo}</p>
      </div>
      <ChevronRight className="cz-tenue h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
    </Link>
  )
}

/** Incasso totale degli ultimi 30 giorni: area morbida con lettura al passaggio. */
function GraficoArea({ giorni, valori }: { giorni: GiornoStagione[]; valori: number[] }) {
  const [sel, setSel] = useState<number | null>(null)
  const L = 600
  const A = 220
  const max = Math.max(...valori, 1) * 1.1
  const passo = L / Math.max(1, valori.length - 1)
  const x = (i: number) => i * passo
  const y = (v: number) => A - (v / max) * A
  // Curva morbida (Catmull-Rom → Bézier)
  const pt = valori.map((v, i) => [x(i), y(v)] as const)
  let linea = `M${pt[0][0]},${pt[0][1]}`
  for (let i = 0; i < pt.length - 1; i++) {
    const p0 = pt[i - 1] ?? pt[i], p1 = pt[i], p2 = pt[i + 1], p3 = pt[i + 2] ?? p2
    linea += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
  }
  const i = sel ?? valori.length - 1
  const media = valori.reduce((s, v) => s + v, 0) / (valori.length || 1)
  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="num font-display text-3xl font-semibold">{euro(valori[i])}</p>
        <p className="cz-tenue text-sm">{sel == null ? 'oggi' : `${giornoSettimana(giorni[i].data)} ${fmtData(giorni[i].data)}`} · media {euro(media)}</p>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${L} ${A}`}
          preserveAspectRatio="none"
          className="h-56 w-full touch-none overflow-visible"
          role="img"
          aria-label="Incasso totale, ultimi 30 giorni"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setSel(Math.max(0, Math.min(valori.length - 1, Math.round(((e.clientX - r.left) / r.width) * (valori.length - 1)))))
          }}
          onPointerLeave={() => setSel(null)}
        >
          <defs>
            <linearGradient id="cz-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2E7D9A" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#2E7D9A" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cz-linea" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#7FB7A8" />
              <stop offset="100%" stopColor="#2E7D9A" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={L} y1={A * f} y2={A * f} strokeDasharray="3 6" style={{ stroke: 'var(--cz-griglia)' }} vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={L} y1={y(media)} y2={y(media)} stroke="#F2C14E" strokeOpacity="0.6" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
          <path d={`${linea} L${L},${A} L0,${A} Z`} fill="url(#cz-area)" />
          <path d={linea} fill="none" stroke="url(#cz-linea)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line x1={x(i)} x2={x(i)} y1="0" y2={A} style={{ stroke: 'var(--cz-griglia)' }} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* punto attivo (HTML, così resta tondo anche col grafico stirato) */}
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2E7D9A] shadow-[0_0_0_6px_rgba(46,125,154,0.25)] transition-all duration-150"
          style={{ left: `${(x(i) / L) * 100}%`, top: `${(y(valori[i]) / A) * 100}%` }}
        />
      </div>
      <div className="cz-tenue mt-2 flex justify-between text-[11px]">
        <span>{fmtData(giorni[0].data)}</span>
        <span>{fmtData(giorni[Math.floor(giorni.length / 2)].data)}</span>
        <span>Oggi</span>
      </div>
    </div>
  )
}

/** Ciambella del mix ricavi con totale al centro. */
function Ciambella({ dati }: { dati: { centro: keyof typeof coloriCentro; valore: number; quota: number }[] }) {
  const [sel, setSel] = useState<number | null>(null)
  const r = 70
  const c = 2 * Math.PI * r
  const totale = dati.reduce((s, x) => s + x.valore, 0)
  let acc = 0
  const attivo = sel != null ? dati[sel] : null
  return (
    <div className="mt-2 flex flex-col items-center">
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90" role="img" aria-label="Mix ricavi per centro">
          <circle cx="100" cy="100" r={r} fill="none" strokeWidth="22" style={{ stroke: 'var(--cz-debole)' }} />
          {dati.map((x, k) => {
            const lungo = Math.max(0, x.quota * c - 3)
            const el = (
              <circle
                key={x.centro}
                cx="100" cy="100" r={r} fill="none"
                stroke={coloriCentro[x.centro]}
                strokeWidth={sel === k ? 28 : 22}
                strokeDasharray={`${lungo} ${c - lungo}`}
                strokeDashoffset={-acc}
                className="cursor-pointer transition-all duration-300"
                onPointerEnter={() => setSel(k)}
                onPointerLeave={() => setSel(null)}
              />
            )
            acc += x.quota * c
            return el
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="cz-tenue text-[11px] font-semibold uppercase tracking-wider">{attivo ? etichetteCentro[attivo.centro] : 'Totale'}</p>
            <p className="num font-display text-2xl font-semibold">{euro(attivo ? attivo.valore : totale)}</p>
            {attivo && <p className="cz-tenue num text-xs">{percento(attivo.quota)}</p>}
          </div>
        </div>
      </div>
      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        {dati.map((x, k) => (
          <div
            key={x.centro}
            onPointerEnter={() => setSel(k)}
            onPointerLeave={() => setSel(null)}
            className={cn('flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition', sel === k ? 'bg-[var(--cz-debole)]' : '')}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: coloriCentro[x.centro] }} />
            <span className="truncate">{etichetteCentro[x.centro]}</span>
            <span className="num cz-tenue ml-auto">{percento(x.quota)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
