import { useEffect, useMemo, useState } from 'react'
import { Loader2, Calculator, Globe, CheckCircle2 } from 'lucide-react'
import type {
  Durata, FilaId, Periodo, TariffaAccessoria, TipologiaPostazione, VoceTariffa,
} from '@/data/types'
import { getPreventivo, getTariffe, getTariffeAccessorie } from '@/data/api'
import type { RisultatoPreventivo } from '@/lib/calcoli'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Tabella, type Colonna } from '@/components/ui/Tabella'
import { euro } from '@/lib/formatters'
import { etichetteDurata, etichettePeriodo } from '@/lib/etichette'
import { etichetteTipologia } from '@/lib/arenile'

const tipologie: TipologiaPostazione[] = [
  'ombrellone_2_lettini', 'ombrellone_2_sdraio', 'ombrellone_lettino_sdraio', 'gazebo', 'tenda',
]

export default function Tariffe() {
  const { listinoPubblicato, pubblicaListino } = useDemoData()
  const [tariffe, setTariffe] = useState<VoceTariffa[]>([])
  const [accessorie, setAccessorie] = useState<TariffaAccessoria[]>([])
  const [caricato, setCaricato] = useState(false)

  const [periodo, setPeriodo] = useState<Periodo>('alta')
  const [durata, setDurata] = useState<Durata>('giornaliera')
  const [override, setOverride] = useState<Record<string, number>>({})

  useEffect(() => {
    Promise.all([getTariffe(), getTariffeAccessorie()]).then(([t, a]) => {
      setTariffe(t)
      setAccessorie(a)
      setCaricato(true)
    })
  }, [])

  const file = config.arenile.file as readonly FilaId[]
  const indice = useMemo(() => {
    const m = new Map<string, VoceTariffa>()
    for (const v of tariffe) m.set(`${v.periodo}|${v.fila}|${v.tipologia}|${v.durata}`, v)
    return m
  }, [tariffe])

  if (!caricato) {
    return (
      <div className="grid h-64 place-items-center text-profondo/50">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stato pubblicazione */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-cabina" />
            <div>
              <p className="text-sm font-semibold text-profondo">Listino sul sito</p>
              <p className="text-xs text-profondo/55">
                {listinoPubblicato ? 'Pubblicato e visibile ai clienti' : 'Modifiche non ancora pubblicate'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tono={listinoPubblicato ? 'acqua' : 'tenda'} puntino>
              {listinoPubblicato ? 'Pubblicato' : 'Bozza'}
            </Badge>
            <Button variante="primario" dimensione="sm" onClick={pubblicaListino} disabled={listinoPubblicato}>
              <CheckCircle2 className="h-4 w-4" /> Pubblica listino
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Matrice */}
      <Card>
        <CardHeader
          titolo="Matrice tariffe"
          sottotitolo="Prezzo per fila e tipologia · clicca un valore per modificarlo"
          azione={
            <div className="flex gap-2">
              <Select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as Periodo)}
                opzioni={Object.entries(etichettePeriodo).map(([v, l]) => ({ valore: v, etichetta: `Stagione ${l}` }))}
              />
              <Select
                value={durata}
                onChange={(e) => setDurata(e.target.value as Durata)}
                opzioni={Object.entries(etichetteDurata).map(([v, l]) => ({ valore: v, etichetta: l }))}
              />
            </div>
          }
        />
        <CardBody className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-calce-200 text-left">
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">
                    Fila
                  </th>
                  {tipologie.map((t) => (
                    <th key={t} className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-profondo/45">
                      {etichetteTipologia[t].replace('Ombrellone + ', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {file.map((fila) => (
                  <tr key={fila} className="border-b border-calce-200/70 last:border-0">
                    <td className="px-3 py-1 font-bold text-profondo/70">{fila}</td>
                    {tipologie.map((t) => {
                      const voce = indice.get(`${periodo}|${fila}|${t}|${durata}`)
                      if (!voce) {
                        return (
                          <td key={t} className="px-2 py-1 text-right text-profondo/25">—</td>
                        )
                      }
                      const val = override[voce.id] ?? voce.prezzo
                      return (
                        <td key={t} className="px-2 py-1 text-right">
                          <input
                            type="number"
                            value={val}
                            onChange={(e) =>
                              setOverride((o) => ({ ...o, [voce.id]: Number(e.target.value) }))
                            }
                            className="num w-20 rounded-md border border-transparent bg-transparent px-2 py-1 text-right font-medium text-profondo hover:border-calce-200 focus-visible:focus-ring"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-profondo/45">
            La prima fila (A) è la più cara; il prezzo scende verso il fondo. Le modifiche restano in memoria per la demo.
          </p>
        </CardBody>
      </Card>

      {/* Simulatore + accessorie */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Simulatore />
        <Card>
          <CardHeader titolo="Tariffe accessorie e sconti" />
          <CardBody className="pt-1">
            <TabellaAccessorie accessorie={accessorie} />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Simulatore() {
  const [fila, setFila] = useState<FilaId>('C')
  const [tipologia, setTipologia] = useState<TipologiaPostazione>('ombrellone_2_lettini')
  const [dal, setDal] = useState<string>('2026-08-03')
  const [al, setAl] = useState<string>('2026-08-17')
  const [ris, setRis] = useState<RisultatoPreventivo>()
  const [calcolo, setCalcolo] = useState(false)

  const calcola = () => {
    setCalcolo(true)
    getPreventivo(fila, tipologia, dal, al).then((r) => {
      setRis(r)
      setCalcolo(false)
    })
  }

  const file = config.arenile.file as readonly FilaId[]

  return (
    <Card>
      <CardHeader titolo="Simulatore preventivo" sottotitolo="Calcola il totale per un periodo" />
      <CardBody className="space-y-3 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Fila">
            <Select
              value={fila}
              onChange={(e) => setFila(e.target.value as FilaId)}
              opzioni={file.map((f) => ({ valore: f, etichetta: `Fila ${f}` }))}
            />
          </Campo>
          <Campo label="Tipologia">
            <Select
              value={tipologia}
              onChange={(e) => setTipologia(e.target.value as TipologiaPostazione)}
              opzioni={[
                { valore: 'ombrellone_2_lettini', etichetta: 'Ombrellone + 2 lettini' },
                { valore: 'ombrellone_2_sdraio', etichetta: 'Ombrellone + 2 sdraio' },
                { valore: 'ombrellone_lettino_sdraio', etichetta: 'Ombrellone + lettino e sdraio' },
                { valore: 'gazebo', etichetta: 'Gazebo (solo fila A)' },
                { valore: 'tenda', etichetta: 'Tenda (solo fila I)' },
              ]}
            />
          </Campo>
          <Campo label="Dal">
            <input type="date" value={dal} onChange={(e) => setDal(e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Al">
            <input type="date" value={al} onChange={(e) => setAl(e.target.value)} className={inputCls} />
          </Campo>
        </div>
        <Button variante="primario" onClick={calcola} bloccato disabled={calcolo}>
          {calcolo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          Calcola preventivo
        </Button>

        {ris && (
          ris.mancante && ris.giorni === 0 ? (
            <p className="rounded-lg bg-tenda/15 px-3 py-2 text-sm text-[#7A5A12]">
              Nessuna tariffa per questa combinazione (controlla fila e tipologia).
            </p>
          ) : (
            <div className="rounded-lg border border-calce-200 bg-white">
              {ris.dettaglioPerPeriodo.map((d) => (
                <div key={d.periodo} className="flex items-center justify-between border-b border-calce-200 px-3 py-2 text-sm last:border-0">
                  <span className="text-profondo/70">
                    Stagione {etichettePeriodo[d.periodo].toLowerCase()} · {d.giorni} gg × {euro(d.prezzoGiorno)}
                  </span>
                  <span className="num font-medium text-profondo">{euro(d.subtotale)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-calce/60 px-3 py-2.5">
                <span className="text-sm font-semibold text-profondo">Totale {ris.giorni} giorni</span>
                <span className="num text-lg font-bold text-profondo">{euro(ris.totale)}</span>
              </div>
            </div>
          )
        )}
      </CardBody>
    </Card>
  )
}

function TabellaAccessorie({ accessorie }: { accessorie: TariffaAccessoria[] }) {
  const colonne: Colonna<TariffaAccessoria>[] = [
    { chiave: 'nome', intestazione: 'Voce', cella: (a) => <span className="font-medium text-profondo">{a.nome}</span> },
    { chiave: 'unita', intestazione: 'Unità', cella: (a) => <span className="text-profondo/55">{a.unita}</span>, nascondiMobile: true },
    {
      chiave: 'prezzo', intestazione: 'Prezzo', allineaDx: true,
      cella: (a) => (
        <span className="num font-semibold text-profondo">
          {a.percentuale ? `−${a.prezzo}%` : euro(a.prezzo)}
        </span>
      ),
    },
    {
      chiave: 'stato', intestazione: 'Stato', allineaDx: true,
      cella: (a) => (
        <Badge tono={a.stato === 'pubblicato' ? 'acqua' : 'tenda'}>
          {a.stato === 'pubblicato' ? 'Pubblicato' : 'Bozza'}
        </Badge>
      ),
    },
  ]
  return <Tabella colonne={colonne} righe={accessorie} chiaveRiga={(a) => a.id} denso />
}

const inputCls =
  'h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring'

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-profondo/60">{label}</span>
      {children}
    </label>
  )
}
