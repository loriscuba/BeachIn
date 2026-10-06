/**
 * Sito → "Sito e marketing": cruscotto del titolare su visite al sito,
 * interazioni, provenienza, Google, recensioni Tripadvisor e salute del sito.
 * Solo presentazione: tutti i numeri arrivano da `getMarketing(periodo)`.
 */
import { useEffect, useId, useState } from 'react'
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { CheckCircle2, AlertTriangle, Loader2, Info } from 'lucide-react'
import {
  getMarketing, PERIODI_MARKETING, ETICHETTE_AZIONI, ETICHETTE_PROVENIENZE,
  type Azione, type DatiMarketing, type PeriodoMarketing, type Provenienza,
} from '@/data/marketing'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { numero, numero1, percento } from '@/lib/formatters'
import { cn } from '@/lib/cn'

const C_VISITE = '#2E7D9A' // cabina
const C_INTER = '#E4572E' // boa
const C_TRIP = '#00AA6C' // verde Tripadvisor
const COLORI_PROV: Record<Provenienza, string> = {
  ricerca: '#2E7D9A', maps: '#0F3B4C', diretto: '#F2C14E', instagram: '#C2528B', tripadvisor: C_TRIP, altri: '#9AA7AB',
}

export default function Marketing() {
  const [periodo, setPeriodo] = useState<PeriodoMarketing>('stagione')
  const [d, setD] = useState<DatiMarketing>()

  useEffect(() => {
    let vivo = true
    getMarketing(periodo).then((x) => vivo && setD(x))
    return () => { vivo = false }
  }, [periodo])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-profondo">Sito e marketing</h2>
          <p className="text-sm text-profondo/60">Come vanno il sito e la visibilità su Google · {config.nome}, {config.localita}</p>
        </div>
        <Badge tono="tenda" puntino>Dati di esempio</Badge>
      </div>

      <div role="group" aria-label="Periodo" className="flex flex-wrap gap-1.5">
        {PERIODI_MARKETING.map((p) => (
          <button
            key={p.valore}
            type="button"
            aria-pressed={periodo === p.valore}
            onClick={() => setPeriodo(p.valore)}
            className={cn(
              'min-h-9 rounded-lg border px-3 text-sm font-medium focus-visible:focus-ring',
              periodo === p.valore ? 'border-profondo bg-profondo text-white' : 'border-calce-200 bg-white text-profondo/70 hover:text-profondo',
            )}
          >
            {p.etichetta}
          </button>
        ))}
        <span className="self-center text-xs text-profondo/50">confronto con la stagione {config.stagione.anno - 1}</span>
      </div>

      {!d ? (
        <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" aria-label="Caricamento" /></div>
      ) : (
        <>
          <Visite d={d} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Interazioni d={d} />
            <Provenienze d={d} />
          </div>
          <Google d={d} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Recensioni d={d} />
            <Salute d={d} />
          </div>
          <p className="text-xs text-profondo/55">
            Tutti i numeri e le recensioni di questa sezione sono inventati per la demo, ma coerenti tra loro. Nella versione
            reale arrivano da Cloudflare Web Analytics, Google Search Console, Profilo dell’attività su Google e Tripadvisor.
          </p>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- blocchi

function Visite({ d }: { d: DatiMarketing }) {
  const { attuale: a, precedente: p } = d
  return (
    <Card>
      <CardHeader titolo="Visite al sito" sottotitolo="Fonte: Cloudflare Web Analytics, senza cookie" />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
          <Metrica etichetta="Visite" valore={numero(a.visite)} delta={<Delta ora={a.visite} prima={p.visite} />} />
          <Metrica etichetta="Visitatori diversi" valore={numero(a.visitatori)} delta={<Delta ora={a.visitatori} prima={p.visitatori} />} />
          <Metrica etichetta="Interazioni" valore={numero(a.interazioni)} delta={<Delta ora={a.interazioni} prima={p.interazioni} />} />
          <Metrica etichetta="Visite con un clic" valore={percento(a.interazioni / a.visite, 1)} delta={<span className="text-profondo/50">nel {config.stagione.anno - 1}: {percento(p.interazioni / p.visite, 1)}</span>} />
        </div>
        <GraficoVisite d={d} />
      </CardBody>
    </Card>
  )
}

function GraficoVisite({ d }: { d: DatiMarketing }) {
  const sett = d.serieSettimanale
  const picco = d.serie.reduce((m, x) => (x.visite > m.visite ? x : m), d.serie[0])
  return (
    <figure>
      <div
        className="h-56 w-full sm:h-64"
        role="img"
        aria-label={`Grafico di visite e interazioni, ${d.etichetta.toLowerCase()}. ${sett ? 'Media giornaliera per settimana' : 'Valori giornalieri'}; massimo ${numero(picco.visite)} visite ${sett ? 'nella settimana dal' : 'il'} ${picco.etichetta}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d.serie} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#DCE4E6" />
            <XAxis dataKey="etichetta" tick={{ fontSize: 11, fill: '#0F3B4C99' }} tickLine={false} axisLine={{ stroke: '#DCE4E6' }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: '#0F3B4C99' }} tickLine={false} axisLine={false} width={36} tickFormatter={(v) => numero(v as number)} />
            <Tooltip
              cursor={{ stroke: '#0F3B4C55', strokeDasharray: '3 3' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const r = payload[0].payload as DatiMarketing['serie'][number]
                const suff = sett ? ' al giorno' : ''
                return (
                  <div className="rounded-lg border border-calce-200 bg-white px-3 py-2 text-xs shadow-pop">
                    <p className="mb-1 font-semibold text-profondo">{sett ? `Settimana dal ${label}` : label}</p>
                    <RigaTip colore={C_VISITE} nome="Visite" v={`${numero(r.visite)}${suff}`} />
                    <RigaTip colore={C_INTER} nome="Interazioni" v={`${numero(r.interazioni)}${suff}`} />
                  </div>
                )
              }}
            />
            <Area type="monotone" dataKey="visite" stroke={C_VISITE} strokeWidth={2} fill={C_VISITE} fillOpacity={0.15} isAnimationActive={false} />
            <Line type="monotone" dataKey="interazioni" stroke={C_INTER} strokeWidth={2} dot={false} strokeDasharray="5 3" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-profondo/60">
        <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded" style={{ background: C_VISITE }} aria-hidden /> Visite (linea continua)</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: C_INTER }} aria-hidden /> Interazioni (tratteggiata)</span>
        <span>{sett ? 'Media giornaliera, calcolata per settimana.' : 'Valori giornalieri: tocca il grafico per vedere un giorno.'}</span>
      </figcaption>
    </figure>
  )
}

function Interazioni({ d }: { d: DatiMarketing }) {
  const a = d.attuale
  const righe = (Object.keys(a.azioni) as Azione[]).map((k) => ({ k, v: a.azioni[k] })).sort((x, y) => y.v - x.v)
  const max = righe[0].v
  const prenotaGiorno = a.azioni.prenota / a.giorni.length
  return (
    <Card>
      <CardHeader titolo="Cosa fanno i visitatori" sottotitolo="Clic sui pulsanti del sito" />
      <CardBody>
        <ul className="space-y-3">
          {righe.map(({ k, v }) => (
            <li key={k}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-profondo">{ETICHETTE_AZIONI[k]}</span>
                <span className="num text-profondo/60">{numero(v)} clic · {percento(v / a.interazioni)}</span>
              </div>
              <Barra quota={v / max} colore={k === 'prenota' ? '#F2C14E' : C_VISITE} />
            </li>
          ))}
        </ul>
        <p className="mt-4 flex gap-1.5 text-xs text-profondo/60">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cabina" aria-hidden />
          <span>
            In media <span className="num font-medium text-profondo">{numero1(prenotaGiorno)}</span> richieste di prenotazione al giorno,
            su {d.postiGiornalieri} postazioni prenotabili a giornata (le altre sono degli abbonati stagionali).
          </span>
        </p>
      </CardBody>
    </Card>
  )
}

function Provenienze({ d }: { d: DatiMarketing }) {
  const a = d.attuale
  const chiavi = Object.keys(a.provenienze) as Provenienza[]
  return (
    <Card>
      <CardHeader titolo="Da dove arrivano" sottotitolo="Fonte: Cloudflare Web Analytics" />
      <CardBody className="space-y-4">
        <div className="flex h-4 overflow-hidden rounded-full bg-calce-200" role="img" aria-label="Ripartizione delle visite per provenienza: vedi elenco">
          {chiavi.map((k) => (
            <span key={k} style={{ width: `${(a.provenienze[k] / a.visite) * 100}%`, background: COLORI_PROV[k] }} />
          ))}
        </div>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {chiavi.map((k) => (
            <li key={k} className="flex items-center justify-between gap-2 border-b border-calce-200 py-1.5 text-sm">
              <span className="flex items-center gap-2 text-profondo"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORI_PROV[k] }} aria-hidden />{ETICHETTE_PROVENIENZE[k]}</span>
              <span className="num font-semibold text-profondo">{percento(a.provenienze[k] / a.visite)}</span>
            </li>
          ))}
        </ul>
        <Tabella
          intestazioni={['Pagine più viste', 'Visualizzazioni']}
          righe={[...a.pagine].sort((x, y) => y.visualizzazioni - x.visualizzazioni).map((p) => [p.pagina, numero(p.visualizzazioni)])}
        />
      </CardBody>
    </Card>
  )
}

function Google({ d }: { d: DatiMarketing }) {
  const { attuale: a, precedente: p } = d
  const g = a.google
  const pos = Math.round((p.google.posizione - g.posizione) * 10) / 10
  const pr = a.profilo
  return (
    <Card>
      <CardHeader titolo="Come ti trova chi cerca su Google" sottotitolo="Fonti: Google Search Console e Profilo dell’attività su Google" />
      <CardBody className="space-y-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
          <Metrica etichetta="Apparizioni su Google" valore={numero(g.apparizioni)} delta={<Delta ora={g.apparizioni} prima={p.google.apparizioni} />} />
          <Metrica etichetta="Clic sul sito" valore={numero(g.clic)} delta={<Delta ora={g.clic} prima={p.google.clic} />} />
          <Metrica etichetta="% di clic" valore={percento(g.clic / g.apparizioni, 1)} delta={<span className="text-profondo/50">nel {config.stagione.anno - 1}: {percento(p.google.clic / p.google.apparizioni, 1)}</span>} />
          <Metrica
            etichetta="Posizione media"
            valore={numero1(g.posizione)}
            delta={<span className={pos >= 0 ? 'text-emerald-700' : 'text-boa'}>{pos >= 0 ? '▲' : '▼'} {numero1(Math.abs(pos))} posizioni {pos >= 0 ? 'meglio' : 'peggio'} del {config.stagione.anno - 1}</span>}
          />
        </div>
        <Tabella
          intestazioni={['Le 10 ricerche principali', 'Apparizioni', 'Clic', '% clic', 'Posizione']}
          righe={[...a.ricerche].sort((x, y) => y.apparizioni - x.apparizioni).map((r) => [
            r.query, numero(r.apparizioni), numero(r.clic), percento(r.clic / r.apparizioni, 1), numero1(r.posizione),
          ])}
        />
        <div>
          <h4 className="text-sm font-semibold text-profondo">Il profilo dell’attività su Google</h4>
          <p className="mb-3 text-xs text-profondo/55">Scheda su Maps e Ricerca</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
            <Metrica etichetta="Visualizzazioni" valore={numero(pr.visualizzazioni)} delta={<span className="text-profondo/50">{numero(pr.daMaps)} da Maps, {numero(pr.daRicerca)} da Ricerca</span>} />
            <Metrica etichetta="Chiamate" valore={numero(pr.chiamate)} delta={<Delta ora={pr.chiamate} prima={p.profilo.chiamate} />} />
            <Metrica etichetta="Richieste di indicazioni" valore={numero(pr.indicazioni)} delta={<Delta ora={pr.indicazioni} prima={p.profilo.indicazioni} />} />
            <Metrica etichetta="Clic sul sito" valore={numero(pr.clicSito)} delta={<Delta ora={pr.clicSito} prima={p.profilo.clicSito} />} />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function Recensioni({ d }: { d: DatiMarketing }) {
  const t = d.tripadvisor
  const [nota, setNota] = useState(false)
  const idNota = useId()
  return (
    <Card>
      <CardHeader titolo="Recensioni su Tripadvisor" sottotitolo="Fonte: API di Tripadvisor, aggiornata una volta al giorno" />
      <CardBody className="space-y-4">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
          <div>
            <p className="num font-display text-4xl font-semibold text-profondo">{numero1(t.voto)}</p>
            <Bolle voto={t.voto} />
            <p className="num mt-1 text-xs text-profondo/55">{numero(t.recensioni)} recensioni</p>
          </div>
          <ul className="space-y-1">
            {t.distribuzione.map((x) => (
              <li key={x.bolle} className="grid grid-cols-[64px_1fr_40px] items-center gap-2 text-xs text-profondo/70">
                <span>{x.bolle} {x.bolle === 1 ? 'bolla' : 'bolle'}</span>
                <Barra quota={x.numero / t.recensioni} colore={C_TRIP} sottile />
                <span className="num text-right">{numero(x.numero)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          {t.esempi.map((r) => (
            <article key={r.titolo} className="border-t-2 pt-2" style={{ borderColor: C_TRIP }}>
              <Bolle voto={r.voto} />
              <h4 className="mt-1 text-sm font-semibold text-profondo">{r.titolo}</h4>
              <p className="text-sm text-profondo/70">{r.testo}</p>
              <p className="mt-1 text-xs text-profondo/50">{r.autore}, {r.mese}</p>
            </article>
          ))}
        </div>
        <div>
          <button
            type="button"
            onClick={() => setNota((v) => !v)}
            aria-expanded={nota}
            aria-controls={idNota}
            className="min-h-11 rounded-lg px-4 text-sm font-semibold text-[#032B1B] focus-visible:focus-ring"
            style={{ background: C_TRIP }}
          >
            Lascia una recensione su Tripadvisor
          </button>
          {nota && (
            <p id={idNota} className="mt-2 rounded-lg border border-dashed border-calce-300 bg-calce/50 px-3 py-2 text-xs text-profondo/70">
              Nella versione reale questo pulsante apre la pagina di recensione di {config.nome} su Tripadvisor. Il collegamento è gratuito.
            </p>
          )}
        </div>
        <p className="text-xs text-profondo/50">
          Recensioni di esempio (voto e numero sono quelli della scheda reale). Nella versione reale servono logo, bolle e link a
          Tripadvisor, come richiedono le sue regole.
        </p>
      </CardBody>
    </Card>
  )
}

function Salute({ d }: { d: DatiMarketing }) {
  const s = d.salute
  const C = 2 * Math.PI * 44
  return (
    <Card>
      <CardHeader titolo="Salute del sito per Google" sottotitolo="Controllo automatico delle pagine e Core Web Vitals" />
      <CardBody className="space-y-4">
        <div className="grid items-start gap-4 sm:grid-cols-[auto_1fr]">
          <div className="relative h-28 w-28" role="img" aria-label={`Punteggio ${s.punteggio} su 100`}>
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="44" fill="none" stroke="#DCE4E6" strokeWidth="10" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={C_VISITE} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(C * s.punteggio) / 100} ${C}`} />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center" aria-hidden>
              <div><span className="num font-display text-2xl font-semibold text-profondo">{s.punteggio}</span><span className="block text-[11px] text-profondo/50">su 100</span></div>
            </div>
          </div>
          <ul>
            {s.controlli.map((c) => (
              <li key={c.titolo} className="flex gap-2 border-b border-calce-200 py-2 text-sm">
                {c.stato === 'ok'
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                  : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />}
                <span>
                  <span className="font-medium text-profondo">{c.titolo}</span>{' '}
                  <Badge tono={c.stato === 'ok' ? 'verde' : 'giallo'}>{c.stato === 'ok' ? 'In ordine' : 'Da sistemare'}</Badge>
                  <span className="block text-xs text-profondo/60">{c.dettaglio}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {s.vitali.map((v) => (
            <div key={v.nome}>
              <p className="text-xs text-profondo/55">{v.nome}</p>
              <p className="num text-xl font-bold text-profondo">{v.valore}</p>
              <p className={cn('text-xs font-semibold', v.esito === 'buono' ? 'text-emerald-700' : 'text-amber-700')}>
                {v.esito === 'buono' ? '✓ Buono' : '! Da migliorare'} <span className="font-normal text-profondo/50">({v.soglia})</span>
              </p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

// ---------------------------------------------------------------- pezzi

function Metrica({ etichetta, valore, delta }: { etichetta: string; valore: string; delta: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-profondo/50">{etichetta}</p>
      <p className="num text-2xl font-bold text-profondo">{valore}</p>
      <p className="text-xs font-medium">{delta}</p>
    </div>
  )
}

/** Variazione sul 2025: freccia e segno, non solo colore. */
function Delta({ ora, prima }: { ora: number; prima: number }) {
  const v = prima ? (ora - prima) / prima : 0
  const su = v >= 0
  return (
    <span className={su ? 'text-emerald-700' : 'text-boa'}>
      {su ? '▲ +' : '▼ −'}{percento(Math.abs(v))} sul {config.stagione.anno - 1}
    </span>
  )
}

function Barra({ quota, colore, sottile }: { quota: number; colore: string; sottile?: boolean }) {
  return (
    <span className={cn('mt-1 block overflow-hidden rounded-full bg-calce-200', sottile ? 'h-2' : 'h-2.5')} aria-hidden>
      <span className="block h-full rounded-full" style={{ width: `${Math.max(2, quota * 100)}%`, background: colore }} />
    </span>
  )
}

function Bolle({ voto }: { voto: number }) {
  const id = useId()
  return (
    <span className="inline-flex gap-0.5 align-middle" role="img" aria-label={`Voto ${numero1(voto)} su 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const f = Math.max(0, Math.min(1, voto - i))
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 18 18" aria-hidden>
            <defs>
              <linearGradient id={`${id}-${i}`}>
                <stop offset={f} stopColor={C_TRIP} />
                <stop offset={f} stopColor="transparent" />
              </linearGradient>
            </defs>
            <circle cx="9" cy="9" r="7.5" fill={`url(#${id}-${i})`} stroke={C_TRIP} strokeWidth="1.5" />
          </svg>
        )
      })}
    </span>
  )
}

function Tabella({ intestazioni, righe }: { intestazioni: string[]; righe: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-calce-200 text-xs text-profondo/55">
            {intestazioni.map((h, i) => (
              <th key={h} scope="col" className={cn('py-1.5 font-semibold', i === 0 ? 'pr-3 text-left' : 'whitespace-nowrap px-2 text-right')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={r[0]} className="border-b border-calce-200 last:border-0">
              {r.map((c, i) => (
                <td key={i} className={cn('py-1.5 text-profondo', i === 0 ? 'min-w-40 pr-3' : 'num whitespace-nowrap px-2 text-right')}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RigaTip({ colore, nome, v }: { colore: string; nome: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-profondo/70"><span className="h-2 w-2 rounded-full" style={{ background: colore }} aria-hidden /> {nome}</span>
      <span className="num font-medium text-profondo">{v}</span>
    </div>
  )
}
