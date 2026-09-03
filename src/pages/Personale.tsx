import { useEffect, useMemo, useState } from 'react'
import { Loader2, Users, Wallet, Clock, CalendarClock } from 'lucide-react'
import type { Dipendente, RuoloDipendente } from '@/data/types'
import { getPersonale } from '@/data/api'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabella, type Colonna } from '@/components/ui/Tabella'
import { euro, numero, iniziali, data as fmtData } from '@/lib/formatters'
import { etichetteContratto, etichetteRuolo, giorniSettimanaBrevi } from '@/lib/etichette'
import { cn } from '@/lib/cn'

export default function Personale() {
  const [dip, setDip] = useState<Dipendente[]>([])
  const [caricato, setCaricato] = useState(false)

  useEffect(() => {
    getPersonale().then((d) => { setDip(d); setCaricato(true) })
  }, [])

  const sintesi = useMemo(() => {
    const costoMensile = dip.reduce((s, d) => s + d.costoAziendaleMensile, 0)
    const oreContratto = dip.reduce((s, d) => s + d.oreContrattoSettimana, 0)
    const oreLavorate = dip.reduce((s, d) => s + d.oreLavorateSettimana, 0)
    const perRuolo = Object.entries(
      dip.reduce<Record<string, { costo: number; n: number }>>((acc, d) => {
        acc[d.ruolo] = { costo: (acc[d.ruolo]?.costo ?? 0) + d.costoAziendaleMensile, n: (acc[d.ruolo]?.n ?? 0) + 1 }
        return acc
      }, {})
    ).map(([ruolo, v]) => ({ ruolo: ruolo as RuoloDipendente, ...v })).sort((a, b) => b.costo - a.costo)
    return { costoMensile, oreContratto, oreLavorate, perRuolo, maxRuolo: Math.max(1, ...perRuolo.map((r) => r.costo)) }
  }, [dip])

  if (!caricato) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  const colonne: Colonna<Dipendente>[] = [
    {
      chiave: 'nome', intestazione: 'Dipendente',
      cella: (d) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-profondo/10 text-xs font-bold text-profondo">{iniziali(d.nome, d.cognome)}</span>
          <div>
            <p className="font-medium text-profondo">{d.nome} {d.cognome}</p>
            <p className="text-xs text-profondo/50">{etichetteRuolo[d.ruolo]}</p>
          </div>
        </div>
      ),
    },
    { chiave: 'contratto', intestazione: 'Contratto', nascondiMobile: true, cella: (d) => <Badge tono="mare">{etichetteContratto[d.tipoContratto]}</Badge> },
    { chiave: 'inq', intestazione: 'Inquadr.', nascondiMobile: true, cella: (d) => <span className="text-profondo/60">{d.inquadramento}</span> },
    { chiave: 'periodo', intestazione: 'Periodo', nascondiMobile: true, cella: (d) => <span className="num text-xs text-profondo/60">{fmtData(d.periodoDal)} – {fmtData(d.periodoAl)}</span> },
    {
      chiave: 'ore', intestazione: 'Ore (lav/contr)', allineaDx: true,
      cella: (d) => (
        <span className={cn('num font-medium', d.oreLavorateSettimana > d.oreContrattoSettimana ? 'text-boa' : 'text-profondo')}>
          {d.oreLavorateSettimana}/{d.oreContrattoSettimana}
        </span>
      ),
    },
    { chiave: 'costo', intestazione: 'Costo/mese', allineaDx: true, cella: (d) => <span className="num font-semibold text-profondo">{euro(d.costoAziendaleMensile)}</span> },
  ]

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icona={Users} etichetta="Dipendenti" valore={String(dip.length)} />
        <Kpi icona={Wallet} etichetta="Costo del lavoro / mese" valore={euro(sintesi.costoMensile)} />
        <Kpi icona={Clock} etichetta="Ore contratto / sett." valore={numero(sintesi.oreContratto)} />
        <Kpi icona={CalendarClock} etichetta="Ore lavorate / sett." valore={numero(sintesi.oreLavorate)} sotto={`${sintesi.oreLavorate - sintesi.oreContratto >= 0 ? '+' : ''}${sintesi.oreLavorate - sintesi.oreContratto} vs contratto`} />
      </div>

      {/* Costo per ruolo */}
      <Card>
        <CardHeader titolo="Costo per ruolo" sottotitolo="Costo aziendale mensile" />
        <CardBody className="grid gap-x-6 gap-y-2.5 pt-2 sm:grid-cols-2">
          {sintesi.perRuolo.map((r) => (
            <div key={r.ruolo}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-profondo">{etichetteRuolo[r.ruolo]} <span className="text-profondo/45">· {r.n}</span></span>
                <span className="num text-profondo/70">{euro(r.costo)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-calce-200">
                <div className="h-full rounded-full bg-cabina" style={{ width: `${(r.costo / sintesi.maxRuolo) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Organico */}
      <Card>
        <CardHeader titolo="Organico" sottotitolo={`${dip.length} dipendenti`} />
        <CardBody className="px-1 py-1 sm:px-2">
          <Tabella colonne={colonne} righe={dip} chiaveRiga={(d) => d.id} />
        </CardBody>
      </Card>

      {/* Turni settimanali */}
      <Card>
        <CardHeader titolo="Turni della settimana" sottotitolo="Griglia dei turni per dipendente" />
        <CardBody className="px-1 py-1 sm:px-2">
          <GrigliaTurni dip={dip} />
        </CardBody>
      </Card>
    </div>
  )
}

function GrigliaTurni({ dip }: { dip: Dipendente[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-calce-200">
            <th className="sticky left-0 bg-white px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-profondo/45">Dipendente</th>
            {giorniSettimanaBrevi.map((g) => (
              <th key={g} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{g}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dip.map((d) => {
            const perGiorno = new Map(d.turni.map((t) => [t.giorno, t]))
            return (
              <tr key={d.id} className="border-b border-calce-200/70 last:border-0">
                <td className="sticky left-0 bg-white px-3 py-1.5">
                  <p className="whitespace-nowrap text-sm font-medium text-profondo">{d.nome} {d.cognome}</p>
                  <p className="text-[11px] text-profondo/45">{etichetteRuolo[d.ruolo]}</p>
                </td>
                {giorniSettimanaBrevi.map((_, i) => {
                  const t = perGiorno.get(i)
                  return (
                    <td key={i} className="px-1.5 py-1.5 text-center">
                      {t ? (
                        <span className="num inline-block whitespace-nowrap rounded-md bg-cabina/10 px-1.5 py-1 text-[11px] font-medium text-cabina">
                          {t.inizio}–{t.fine}
                        </span>
                      ) : (
                        <span className="text-[11px] text-profondo/30">riposo</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Kpi({ icona: Icona, etichetta, valore, sotto }: { icona: typeof Users; etichetta: string; valore: string; sotto?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
          <Icona className="h-3.5 w-3.5 text-cabina" /> {etichetta}
        </p>
        <p className="num mt-0.5 text-2xl font-bold text-profondo">{valore}</p>
        {sotto && <p className="num text-xs text-profondo/50">{sotto}</p>}
      </CardBody>
    </Card>
  )
}
