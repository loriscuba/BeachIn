import { useEffect, useMemo, useState } from 'react'
import {
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, Loader2,
  TrendingUp, TrendingDown, Umbrella, UtensilsCrossed, Coffee,
  Wrench, PackageOpen, Wallet, CalendarCheck, ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ArticoloBar, Cliente, GiornoStagione, KpiCruscotto, Meteo } from '@/data/types'
import { getArticoliBar, getClienti, getGiorni, getKpiCruscotto } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { contatoriArenile } from '@/lib/calcoli'
import { coloriCentro, etichetteCentro, ordineCentriRicavo } from '@/lib/graficoColori'
import { euro, euroCent, numero, percento, data as fmtData, giornoSettimana } from '@/lib/formatters'
import { config } from '@/data/config'
import { cn } from '@/lib/cn'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { GraficoIncassi } from '@/components/charts/GraficoIncassi'
import { OccupazionePerFila, type FilaOccupazione } from '@/components/charts/OccupazionePerFila'

const meteoIcona: Record<Meteo, typeof Sun> = {
  sole: Sun, poco_nuvoloso: CloudSun, nuvoloso: Cloud, pioggia: CloudRain, temporale: CloudLightning,
}
const meteoLabel: Record<Meteo, string> = {
  sole: 'Sole', poco_nuvoloso: 'Poco nuvoloso', nuvoloso: 'Nuvoloso', pioggia: 'Pioggia', temporale: 'Temporale',
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

  const occupazionePerFila = useMemo<FilaOccupazione[]>(() => {
    const file = config.arenile.file as readonly string[]
    return file.map((fila) => {
      const p = postazioni.filter((x) => x.fila === fila)
      const vendute = p.filter((x) => x.stato === 'occupata' || x.stato === 'prenotata' || x.stato === 'stagionale').length
      return { fila, totali: p.length, vendute, occupazione: p.length ? vendute / p.length : 0 }
    })
  }, [postazioni])

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
    ...(incassoDemo > 0 ? [{ label: 'In demo (simulato)', valore: incassoDemo, colore: '#0F3B4C' }] : []),
  ]

  const coperti = kpi.copertiPranzo + kpi.copertiCena
  // Serie degli ultimi 30 giorni; l'ultimo punto (oggi) usa il valore dal vivo.
  const conOggi = (f: (g: GiornoStagione) => number, live: number) =>
    kpi.ultimi30.map((g) => (g.data === oggi.data ? live : f(g)))
  const serieIncasso = conOggi((g) => g.incassoSpiaggia + g.incassoBar + g.incassoRistorante + g.incassoNoleggi, incassoTotale)
  const serieOccupazione = conOggi((g) => g.occupazione, occupazioneOggi)
  const serieCoperti = conOggi((g) => g.copertiPranzo + g.copertiCena, coperti)
  const serieScontrino = conOggi((g) => g.scontrinoMedioBar, kpi.scontrinoMedioBar)

  return (
    <div className="space-y-4">
      {/* Riga KPI: 4 numeri chiave con andamento 30 giorni e confronto */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icona={Wallet}
          etichetta="Incasso di oggi"
          valore={euro(incassoTotale)}
          serie={serieIncasso}
          colore="#2E7D9A"
          delta={variazione(incassoTotale, media7(serieIncasso))}
          rispetto="vs media 7 giorni"
        >
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-calce-200" aria-label="Ripartizione incasso per centro">
            {areeIncasso.map((a) => (
              <div key={a.label} title={`${a.label}: ${euro(a.valore)}`} style={{ width: `${(a.valore / (incassoTotale || 1)) * 100}%`, background: a.colore }} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-profondo/60">
            {areeIncasso.slice(0, 3).map((a) => `${a.label} ${euro(a.valore)}`).join(' · ')}
          </p>
        </KpiTile>
        <KpiTile
          icona={Umbrella}
          etichetta="Occupazione arenile"
          valore={percento(occupazioneOggi)}
          serie={serieOccupazione}
          colore="#7FB7A8"
          delta={deltaOcc}
          deltaPunti
          rispetto="vs anno scorso"
        >
          <p className="mt-3 text-sm text-profondo/60">{numero(kpi.presenze)} presenze in spiaggia</p>
        </KpiTile>
        <KpiTile
          icona={UtensilsCrossed}
          etichetta="Coperti oggi"
          valore={numero(coperti)}
          serie={serieCoperti}
          colore="#E4572E"
          delta={variazione(coperti, media7(serieCoperti))}
          rispetto="vs media 7 giorni"
        >
          <p className="mt-3 text-sm text-profondo/60">{kpi.copertiPranzo} a pranzo · {kpi.copertiCena} a cena</p>
        </KpiTile>
        <KpiTile
          icona={Coffee}
          etichetta="Scontrino medio bar"
          valore={euroCent(kpi.scontrinoMedioBar)}
          serie={serieScontrino}
          colore="#C99A2E"
          delta={variazione(kpi.scontrinoMedioBar, media7(serieScontrino))}
          rispetto="vs media 7 giorni"
        >
          <p className="mt-3 text-sm text-profondo/60">Media per scontrino, oggi</p>
        </KpiTile>
      </div>

      {/* Grafico incassi + meteo/occupazione */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader titolo="Andamento incassi" sottotitolo="Ultimi 30 giorni · per centro" />
          <CardBody className="pt-2">
            <GraficoIncassi giorni={kpi.ultimi30} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader titolo="Meteo e occupazione" sottotitolo="Il meteo governa la giornata" />
          <CardBody className="space-y-3 pt-2">
            <div className="grid grid-cols-4 gap-2">
              {meteoGiorni.map((g, i) => {
                const Icona = meteoIcona[g.meteo]
                return (
                  <div
                    key={g.data}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-center',
                      i === 0 ? 'border-cabina/40 bg-cabina/5' : 'border-calce-200'
                    )}
                  >
                    <p className="text-xs font-medium uppercase text-profondo/50">
                      {i === 0 ? 'Oggi' : giornoSettimana(g.data).slice(0, 3)}
                    </p>
                    <Icona className="mx-auto my-1 h-5 w-5 text-cabina" />
                    <p className="num text-sm font-bold text-profondo">{g.tempMax}°</p>
                    <p className="num text-sm text-profondo/60">{percento(g.occupazione)}</p>
                  </div>
                )
              })}
            </div>
            <div className="rounded-lg bg-calce px-3 py-2 text-sm text-profondo/70">
              Oggi: <span className="font-medium text-profondo">{meteoLabel[oggi.meteo]}</span>, occupazione{' '}
              <span className="num font-medium text-profondo">{percento(oggi.occupazione)}</span>.
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Occupazione per fila + mix ricavi */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader titolo="Occupazione per fila" sottotitolo="Prima fila fronte mare (A) → fondo (I)" />
          <CardBody className="pt-2">
            <OccupazionePerFila dati={occupazionePerFila} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader titolo="Mix ricavi per centro" sottotitolo="Stagione a oggi" />
          <CardBody className="space-y-3 pt-3">
            {mixRicavi.map((m) => (
              <div key={m.centro}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-profondo">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: coloriCentro[m.centro] }} />
                    {etichetteCentro[m.centro]}
                  </span>
                  <span className="num text-profondo/70">
                    {euro(m.valore)} · {percento(m.quota)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-calce-200">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(2, m.quota * 100)}%`, background: coloriCentro[m.centro] }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Scadenze + alert */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader titolo="Prossime scadenze di pagamento" />
          <CardBody className="pt-1">
            <ul className="divide-y divide-calce-200">
              {scadenze.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-profondo">{c.sottocategoria}</p>
                    <p className="truncate text-sm text-profondo/60">{c.fornitore} · scad. {fmtData(c.scadenza!)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="num text-sm font-semibold text-profondo">
                      {euro(c.imponibile * (1 + c.iva))}
                    </span>
                    <Badge tono={c.statoPagamento === 'scaduto' ? 'boa' : 'tenda'}>
                      {c.statoPagamento === 'scaduto' ? 'Scaduto' : 'Da pagare'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titolo="Alert operativi" sottotitolo="Cosa richiede attenzione oggi · tocca per aprire" />
          <CardBody className="grid grid-cols-2 gap-2 pt-1">
            <Alert
              icona={Wrench}
              tono="boa"
              valore={contatori.fuoriServizio}
              testo="postazioni fuori servizio"
              a="/arenile"
            />
            <Alert
              icona={PackageOpen}
              tono="tenda"
              valore={scorteBasse.length}
              testo="scorte bar sotto soglia"
              a="/bar?tab=listino"
            />
            <Alert
              icona={Wallet}
              tono="tenda"
              valore={saldiAperti.length}
              testo={`saldi aperti · ${euro(saldiAperti.reduce((s, c) => s + c.saldoAperto, 0))}`}
              a="/clienti"
            />
            <Alert
              icona={CalendarCheck}
              tono="cabina"
              valore={prenotazioniDaConfermare.length}
              testo="prenotazioni dal sito da confermare"
              a="/sito?tab=prenotazioni"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
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

function KpiTile({
  icona: Icona,
  etichetta,
  valore,
  serie,
  colore,
  delta,
  deltaPunti,
  rispetto,
  children,
}: {
  icona: typeof Umbrella
  etichetta: string
  valore: string
  serie: number[]
  colore: string
  delta: number
  /** true = delta in punti percentuali (es. occupazione), altrimenti variazione relativa. */
  deltaPunti?: boolean
  rispetto: string
  children?: React.ReactNode
}) {
  const su = delta >= 0
  const testoDelta = deltaPunti
    ? `${su ? '+' : '−'}${Math.abs(Math.round(delta * 100))} punti`
    : `${su ? '+' : '−'}${percento(Math.abs(delta))}`
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-profondo/55">
          <Icona className="h-4 w-4 text-cabina" /> {etichetta}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="num text-4xl font-bold leading-none text-profondo">{valore}</p>
          <Sparkline valori={serie} colore={colore} etichetta={`${etichetta}, ultimi 30 giorni`} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
              su ? 'bg-acqua/15 text-[#2F6E5F]' : 'bg-boa/10 text-boa'
            )}
          >
            {su ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {testoDelta}
          </span>
          <span className="text-profondo/55">{rispetto}</span>
        </p>
        {children}
      </CardBody>
    </Card>
  )
}

/** Mini grafico a linea (SVG, niente assi): l'andamento, non i valori. */
function Sparkline({ valori, colore, etichetta }: { valori: number[]; colore: string; etichetta: string }) {
  const L = 112
  const A = 40
  if (valori.length < 2) return null
  const min = Math.min(...valori)
  const max = Math.max(...valori)
  const passo = L / (valori.length - 1)
  const y = (v: number) => (max === min ? A / 2 : A - 3 - ((v - min) / (max - min)) * (A - 6))
  const punti = valori.map((v, i) => `${(i * passo).toFixed(1)},${y(v).toFixed(1)}`)
  const id = `spark-${colore.slice(1)}`
  return (
    <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} role="img" aria-label={etichetta} className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colore} stopOpacity="0.25" />
          <stop offset="100%" stopColor={colore} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${A} ${punti.join(' ')} ${L},${A}`} fill={`url(#${id})`} />
      <polyline points={punti.join(' ')} fill="none" stroke={colore} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={L} cy={y(valori[valori.length - 1])} r="3.5" fill={colore} />
    </svg>
  )
}

function Alert({
  icona: Icona,
  tono,
  valore,
  testo,
  a,
}: {
  icona: typeof Wrench
  tono: 'boa' | 'tenda' | 'cabina'
  valore: number
  testo: string
  /** Pagina da aprire al clic. */
  a: string
}) {
  const toni = {
    boa: 'bg-boa/10 text-boa',
    tenda: 'bg-tenda/20 text-[#7A5A12]',
    cabina: 'bg-cabina/10 text-cabina',
  }
  return (
    <Link
      to={a}
      className="group flex items-center gap-3 rounded-lg border border-calce-200 bg-white px-3 py-3 transition hover:border-cabina/40 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cabina"
    >
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', toni[tono])}>
        <Icona className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="num text-2xl font-bold leading-none text-profondo">{valore}</p>
        <p className="mt-1 text-sm text-profondo/65">{testo}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-profondo/30 transition group-hover:translate-x-0.5 group-hover:text-cabina" />
    </Link>
  )
}
