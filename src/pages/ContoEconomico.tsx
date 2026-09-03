import { useEffect, useMemo, useState } from 'react'
import { Loader2, TrendingUp, Target } from 'lucide-react'
import type { Evento, GiornoStagione } from '@/data/types'
import { getEventi, getGiorni } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { contoEconomico } from '@/lib/calcoli'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { euro, euroCent, percento } from '@/lib/formatters'
import { coloriCentro, etichetteCentro } from '@/lib/graficoColori'
import { GraficoMensile, type MeseCE } from '@/components/charts/GraficoMensile'
import { cn } from '@/lib/cn'

const mesiLabel: Record<string, string> = { '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago', '09': 'Set' }

export default function ContoEconomico() {
  const { costi } = useDemoData()
  const [giorni, setGiorni] = useState<GiornoStagione[]>([])
  const [eventi, setEventi] = useState<Evento[]>([])
  const [caricato, setCaricato] = useState(false)
  const [vista, setVista] = useState<'stagionale' | 'mensile'>('stagionale')

  useEffect(() => {
    Promise.all([getGiorni(), getEventi()]).then(([g, e]) => { setGiorni(g); setEventi(e); setCaricato(true) })
  }, [])

  const ce = useMemo(
    () => contoEconomico(giorni, costi, { ricavi: eventi.reduce((s, e) => s + e.ricavi, 0), costi: eventi.reduce((s, e) => s + e.costiSostenuti, 0) }),
    [giorni, costi, eventi]
  )

  const mensile = useMemo<MeseCE[]>(() => {
    return Object.keys(mesiLabel).map((m) => {
      const gM = giorni.filter((g) => g.data.slice(5, 7) === m)
      const cM = costi.filter((c) => c.data.slice(5, 7) === m)
      const eM = eventi.filter((e) => e.data.slice(5, 7) === m)
      const r = contoEconomico(gM, cM, { ricavi: eM.reduce((s, e) => s + e.ricavi, 0), costi: eM.reduce((s, e) => s + e.costiSostenuti, 0) })
      return { mese: m, label: mesiLabel[m], ricavi: r.ricaviTotali, costi: r.costiTotali, margine: r.margine }
    })
  }, [giorni, costi, eventi])

  if (!caricato) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  const centriRicavo = ce.righe.filter((r) => r.centro !== 'struttura')
  const struttura = ce.righe.find((r) => r.centro === 'struttura')
  const maxAbs = Math.max(1, ...centriRicavo.map((r) => Math.abs(r.margine)))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs valore={vista} onChange={setVista}
          opzioni={[{ valore: 'stagionale', etichetta: 'Stagionale' }, { valore: 'mensile', etichetta: 'Mensile' }]} />
        <span className="text-xs text-profondo/45">Proiezione stagione 2026</span>
      </div>

      {/* KPI risultato */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etichetta="Ricavi totali" valore={euro(ce.ricaviTotali)} />
        <Kpi etichetta="Costi totali" valore={euro(ce.costiTotali)} />
        <Kpi etichetta="Margine" valore={euro(ce.margine)} sotto={percento(ce.margine / ce.ricaviTotali)} positivo={ce.margine >= 0} icona={TrendingUp} />
        <Kpi etichetta="Break-even ricavi" valore={euro(ce.breakEven)} icona={Target} />
      </div>

      {vista === 'stagionale' ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Tabella per centro */}
            <Card>
              <CardHeader titolo="Risultato per centro" />
              <CardBody className="pt-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-calce-200 text-left text-[11px] uppercase tracking-wide text-profondo/45">
                      <th className="py-2">Centro</th>
                      <th className="py-2 text-right">Ricavi</th>
                      <th className="py-2 text-right">Costi</th>
                      <th className="py-2 text-right">Margine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ce.righe.map((r) => (
                      <tr key={r.centro} className="border-b border-calce-200/70 last:border-0">
                        <td className="py-2">
                          <span className="inline-flex items-center gap-2 font-medium text-profondo">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: coloriCentro[r.centro] }} />
                            {etichetteCentro[r.centro]}
                          </span>
                        </td>
                        <td className="num py-2 text-right text-profondo/80">{r.ricavi ? euro(r.ricavi) : '—'}</td>
                        <td className="num py-2 text-right text-profondo/80">{euro(r.costi)}</td>
                        <td className={cn('num py-2 text-right font-semibold', r.margine >= 0 ? 'text-profondo' : 'text-boa')}>{euro(r.margine)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-calce-300 font-bold">
                      <td className="py-2 text-profondo">Totale</td>
                      <td className="num py-2 text-right text-profondo">{euro(ce.ricaviTotali)}</td>
                      <td className="num py-2 text-right text-profondo">{euro(ce.costiTotali)}</td>
                      <td className={cn('num py-2 text-right', ce.margine >= 0 ? 'text-profondo' : 'text-boa')}>{euro(ce.margine)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardBody>
            </Card>

            {/* Margine di contribuzione per area */}
            <Card>
              <CardHeader titolo="Margine di contribuzione per area" sottotitolo="Ricavi meno costi diretti del centro" />
              <CardBody className="space-y-2.5 pt-2">
                {centriRicavo.map((r) => (
                  <div key={r.centro}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-profondo">{etichetteCentro[r.centro]}</span>
                      <span className={cn('num font-medium', r.margine >= 0 ? 'text-profondo/80' : 'text-boa')}>{euro(r.margine)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-calce-200">
                      <div className="h-full rounded-full" style={{ width: `${(Math.abs(r.margine) / maxAbs) * 100}%`, background: r.margine >= 0 ? '#5FA891' : '#E4572E' }} />
                    </div>
                  </div>
                ))}
                {struttura && (
                  <p className="mt-1 border-t border-calce-200 pt-2 text-xs text-profondo/55">
                    Costi di struttura (overhead): <span className="num font-medium text-profondo">{euro(struttura.costi)}</span>
                  </p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Indicatori */}
          <Card>
            <CardHeader titolo="Indicatori" sottotitolo="Efficienza della stagione" />
            <CardBody className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3 lg:grid-cols-5">
              <Ind etichetta="Costo per ombrellone/giorno" valore={euroCent(ce.indicatori.costoPerOmbrelloneGiorno)} />
              <Ind etichetta="Ricavo per postazione" valore={euro(ce.indicatori.ricavoPerPostazione)} />
              <Ind etichetta="Ricavo per presenza" valore={euroCent(ce.indicatori.ricavoPerPresenza)} />
              <Ind etichetta="Incidenza personale" valore={percento(ce.indicatori.incidenzaPersonale)} />
              <Ind etichetta="Incidenza costo merce" valore={percento(ce.indicatori.incidenzaMerce)} />
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader titolo="Ricavi e costi per mese" sottotitolo="Stagione 2026" />
            <CardBody className="pt-2">
              <GraficoMensile dati={mensile} />
              <div className="mt-2 flex gap-4 text-xs text-profondo/70">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#0F7BA6]" /> Ricavi</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#C0392B]" /> Costi</span>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader titolo="Dettaglio mensile" />
            <CardBody className="pt-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-calce-200 text-left text-[11px] uppercase tracking-wide text-profondo/45">
                    <th className="py-2">Mese</th>
                    <th className="py-2 text-right">Ricavi</th>
                    <th className="py-2 text-right">Costi</th>
                    <th className="py-2 text-right">Margine</th>
                  </tr>
                </thead>
                <tbody>
                  {mensile.map((m) => (
                    <tr key={m.mese} className="border-b border-calce-200/70 last:border-0">
                      <td className="py-2 font-medium text-profondo">{m.label}</td>
                      <td className="num py-2 text-right text-profondo/80">{euro(m.ricavi)}</td>
                      <td className="num py-2 text-right text-profondo/80">{euro(m.costi)}</td>
                      <td className={cn('num py-2 text-right font-semibold', m.margine >= 0 ? 'text-profondo' : 'text-boa')}>{euro(m.margine)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}

function Kpi({ etichetta, valore, sotto, positivo, icona: Icona }: { etichetta: string; valore: string; sotto?: string; positivo?: boolean; icona?: typeof TrendingUp }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
          {Icona && <Icona className="h-3.5 w-3.5 text-cabina" />} {etichetta}
        </p>
        <p className={cn('num mt-0.5 text-2xl font-bold', positivo === false ? 'text-boa' : 'text-profondo')}>{valore}</p>
        {sotto && <p className={cn('num text-xs', positivo ? 'text-acqua' : 'text-profondo/50')}>{sotto}</p>}
      </CardBody>
    </Card>
  )
}

function Ind({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="rounded-lg border border-calce-200 bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-profondo/45">{etichetta}</p>
      <p className="num mt-1 text-lg font-bold text-profondo">{valore}</p>
    </div>
  )
}
