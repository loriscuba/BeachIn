import { useEffect, useMemo, useState } from 'react'
import {
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, Loader2,
  TrendingUp, TrendingDown, Umbrella, UtensilsCrossed, Coffee, Users,
  Wrench, PackageOpen, Wallet, CalendarCheck,
} from 'lucide-react'
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
  const { postazioni, prenotazioniOnline, costi } = useDemoData()
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
  const deltaOcc = kpi.occupazioneOggi - kpi.occupazioneAnnoScorso
  const areeIncasso = [
    { label: 'Spiaggia', valore: oggi.incassoSpiaggia, colore: coloriCentro.spiaggia },
    { label: 'Bar', valore: oggi.incassoBar, colore: coloriCentro.bar },
    { label: 'Ristorante', valore: oggi.incassoRistorante, colore: coloriCentro.ristorante },
    { label: 'Noleggi', valore: oggi.incassoNoleggi, colore: coloriCentro.noleggi },
  ]

  return (
    <div className="space-y-4">
      {/* Riga KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Incasso oggi con ripartizione */}
        <Card className="col-span-2 lg:col-span-1">
          <CardBody>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
              Incasso di oggi
            </p>
            <p className="num mt-0.5 text-3xl font-bold text-profondo">{euro(kpi.incassoOggi)}</p>
            <div className="mt-2 space-y-1">
              {areeIncasso.map((a) => (
                <div key={a.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-profondo/65">
                    <span className="h-2 w-2 rounded-full" style={{ background: a.colore }} />
                    {a.label}
                  </span>
                  <span className="num font-medium text-profondo">{euro(a.valore)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <StatTile
          icona={Umbrella}
          etichetta="Occupazione arenile"
          valore={percento(kpi.occupazioneOggi)}
          sotto={
            <span className={cn('inline-flex items-center gap-1 font-medium', deltaOcc >= 0 ? 'text-acqua' : 'text-boa')}>
              {deltaOcc >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {deltaOcc >= 0 ? '+' : ''}{percento(deltaOcc)} vs anno scorso
            </span>
          }
        />
        <StatTile
          icona={UtensilsCrossed}
          etichetta="Coperti oggi"
          valore={numero(kpi.copertiPranzo + kpi.copertiCena)}
          sotto={<span className="text-profondo/55">{kpi.copertiPranzo} pranzo · {kpi.copertiCena} cena</span>}
        />
        <div className="grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1 lg:gap-3">
          <StatTile compatto icona={Coffee} etichetta="Scontrino bar" valore={euroCent(kpi.scontrinoMedioBar)} />
          <StatTile compatto icona={Users} etichetta="Presenze" valore={numero(kpi.presenze)} />
        </div>
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
                    <p className="text-[10px] font-medium uppercase text-profondo/50">
                      {i === 0 ? 'Oggi' : giornoSettimana(g.data).slice(0, 3)}
                    </p>
                    <Icona className="mx-auto my-1 h-5 w-5 text-cabina" />
                    <p className="num text-sm font-bold text-profondo">{g.tempMax}°</p>
                    <p className="num text-[10px] text-profondo/50">{percento(g.occupazione)}</p>
                  </div>
                )
              })}
            </div>
            <div className="rounded-lg bg-calce px-3 py-2 text-xs text-profondo/70">
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
                <div className="mb-1 flex items-center justify-between text-xs">
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
                    <p className="truncate text-xs text-profondo/55">{c.fornitore} · scad. {fmtData(c.scadenza!)}</p>
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
          <CardHeader titolo="Alert operativi" sottotitolo="Cosa richiede attenzione oggi" />
          <CardBody className="grid grid-cols-2 gap-2 pt-1">
            <Alert
              icona={Wrench}
              tono="boa"
              valore={contatori.fuoriServizio}
              testo="postazioni fuori servizio"
            />
            <Alert
              icona={PackageOpen}
              tono="tenda"
              valore={scorteBasse.length}
              testo="scorte bar sotto soglia"
            />
            <Alert
              icona={Wallet}
              tono="tenda"
              valore={saldiAperti.length}
              testo={`saldi aperti · ${euro(saldiAperti.reduce((s, c) => s + c.saldoAperto, 0))}`}
            />
            <Alert
              icona={CalendarCheck}
              tono="cabina"
              valore={prenotazioniDaConfermare.length}
              testo="prenotazioni dal sito"
              azione="Vai al sito"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function StatTile({
  icona: Icona,
  etichetta,
  valore,
  sotto,
  compatto,
}: {
  icona: typeof Umbrella
  etichetta: string
  valore: string
  sotto?: React.ReactNode
  compatto?: boolean
}) {
  return (
    <Card>
      <CardBody className={compatto ? 'py-3' : undefined}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
          <Icona className="h-3.5 w-3.5 text-cabina" /> {etichetta}
        </p>
        <p className={cn('num mt-0.5 font-bold text-profondo', compatto ? 'text-xl' : 'text-2xl')}>{valore}</p>
        {sotto && <p className="mt-0.5 text-xs">{sotto}</p>}
      </CardBody>
    </Card>
  )
}

function Alert({
  icona: Icona,
  tono,
  valore,
  testo,
  azione,
}: {
  icona: typeof Wrench
  tono: 'boa' | 'tenda' | 'cabina'
  valore: number
  testo: string
  azione?: string
}) {
  const toni = {
    boa: 'bg-boa/10 text-boa',
    tenda: 'bg-tenda/20 text-[#7A5A12]',
    cabina: 'bg-cabina/10 text-cabina',
  }
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-calce-200 bg-white px-3 py-2.5">
      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', toni[tono])}>
        <Icona className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="num text-lg font-bold leading-none text-profondo">{valore}</p>
        <p className="mt-0.5 text-xs text-profondo/60">{testo}</p>
        {azione && (
          <span className="mt-1 inline-block text-[11px] font-medium text-cabina underline-offset-2 hover:underline">
            {azione}
          </span>
        )}
      </div>
    </div>
  )
}
