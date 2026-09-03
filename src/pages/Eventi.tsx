import { useEffect, useMemo, useState } from 'react'
import {
  Loader2, Trophy, Music, PartyPopper, UtensilsCrossed, Flower2, Gift, CalendarDays, Users, TrendingUp, Wallet,
} from 'lucide-react'
import type { Evento, TipoEvento } from '@/data/types'
import { getEventi } from '@/data/api'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Drawer } from '@/components/ui/Drawer'
import { euro, numero, dataEstesa, giornoMese } from '@/lib/formatters'
import { etichetteTipoEvento } from '@/lib/etichette'
import { cn } from '@/lib/cn'

const iconaTipo: Record<TipoEvento, typeof Trophy> = {
  sport: Trophy, musica: Music, festa: PartyPopper, gastronomia: UtensilsCrossed, benessere: Flower2, privato: Gift,
}
const mesiLabel: Record<string, string> = { '05': 'Maggio', '06': 'Giugno', '07': 'Luglio', '08': 'Agosto', '09': 'Settembre' }

export default function Eventi() {
  const [eventi, setEventi] = useState<Evento[]>([])
  const [caricato, setCaricato] = useState(false)
  const [sel, setSel] = useState<Evento>()

  useEffect(() => {
    getEventi().then((e) => { setEventi([...e].sort((a, b) => a.data.localeCompare(b.data))); setCaricato(true) })
  }, [])

  const sintesi = useMemo(() => {
    const ricavi = eventi.reduce((s, e) => s + e.ricavi, 0)
    const costi = eventi.reduce((s, e) => s + e.costiSostenuti, 0)
    const partecipanti = eventi.reduce((s, e) => s + e.partecipanti, 0)
    return { ricavi, costi, margine: ricavi - costi, partecipanti }
  }, [eventi])

  const perMese = useMemo(() => {
    const g: Record<string, Evento[]> = {}
    for (const e of eventi) (g[e.data.slice(5, 7)] ??= []).push(e)
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b))
  }, [eventi])

  const oggi = config.stagione.oggi

  if (!caricato) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icona={CalendarDays} etichetta="Eventi in stagione" valore={String(eventi.length)} />
        <Kpi icona={TrendingUp} etichetta="Ricavi eventi" valore={euro(sintesi.ricavi)} />
        <Kpi icona={Wallet} etichetta="Costi sostenuti" valore={euro(sintesi.costi)} />
        <Kpi icona={Users} etichetta="Partecipanti" valore={numero(sintesi.partecipanti)} sotto={`margine ${euro(sintesi.margine)}`} />
      </div>

      {/* Calendario / timeline */}
      <Card>
        <CardHeader titolo="Calendario eventi" sottotitolo="Clicca un evento per la scheda" />
        <CardBody className="space-y-4 pt-2">
          {perMese.map(([m, list]) => (
            <div key={m}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{mesiLabel[m] ?? m}</p>
              <ul className="space-y-2">
                {list.map((e) => {
                  const Icona = iconaTipo[e.tipo]
                  const futuro = e.data > oggi
                  const margine = e.ricavi - e.costiSostenuti
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => setSel(e)}
                        className="flex w-full items-center gap-3 rounded-lg border border-calce-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-calce-300 hover:bg-calce/50"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-profondo/8 text-cabina">
                          <Icona className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-profondo">{e.nome}</p>
                          <p className="num text-xs text-profondo/55">{giornoMese(e.data)} · {e.partecipanti > 0 ? `${e.partecipanti} partecipanti` : 'in programma'}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {futuro && e.ricavi === 0 ? (
                            <Badge tono="tenda">In programma</Badge>
                          ) : (
                            <>
                              <p className={cn('num text-sm font-bold', margine >= 0 ? 'text-profondo' : 'text-boa')}>{euro(margine)}</p>
                              <p className="text-[11px] text-profondo/45">margine</p>
                            </>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardBody>
      </Card>

      <SchedaEvento evento={sel} onChiudi={() => setSel(undefined)} />
    </div>
  )
}

function SchedaEvento({ evento: e, onChiudi }: { evento?: Evento; onChiudi: () => void }) {
  const Icona = e ? iconaTipo[e.tipo] : Trophy
  const margine = e ? e.ricavi - e.costiSostenuti : 0
  const scostamento = e ? e.costiSostenuti - e.budget : 0

  return (
    <Drawer
      aperto={!!e}
      onChiudi={onChiudi}
      intestazione={
        e ? (
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-profondo text-white"><Icona className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-bold text-profondo">{e.nome}</h2>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge tono="stagionale">{etichetteTipoEvento[e.tipo]}</Badge>
                <span className="num text-xs text-profondo/50 capitalize">{dataEstesa(e.data)}</span>
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      {e && (
        <div className="space-y-4">
          <p className="text-sm text-profondo/75">{e.descrizione}</p>

          <div className="flex items-center gap-2 rounded-lg border border-calce-200 bg-white px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-cabina" />
            <span className="text-profondo/75">{e.partecipanti > 0 ? `${numero(e.partecipanti)} partecipanti` : 'Evento in programma'}</span>
          </div>

          {/* Conto economico dell'evento */}
          <div className="rounded-lg border border-calce-200 bg-white">
            <RigaCE label="Budget" valore={euro(e.budget)} muto />
            <RigaCE label="Costi sostenuti" valore={euro(e.costiSostenuti)} />
            <RigaCE label="Ricavi" valore={euro(e.ricavi)} />
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-semibold text-profondo">Margine</span>
              <span className={cn('num text-lg font-bold', margine >= 0 ? 'text-profondo' : 'text-boa')}>{euro(margine)}</span>
            </div>
          </div>

          <div className={cn('rounded-lg px-3 py-2 text-xs', scostamento <= 0 ? 'bg-acqua/20 text-profondo' : 'bg-tenda/20 text-[#7A5A12]')}>
            {e.budget === 0
              ? 'Evento privato senza budget di spesa dedicato.'
              : scostamento <= 0
                ? `Costi entro budget (${euro(-scostamento)} risparmiati).`
                : `Costi oltre budget di ${euro(scostamento)}.`}
          </div>
        </div>
      )}
    </Drawer>
  )
}

function RigaCE({ label, valore, muto }: { label: string; valore: string; muto?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-calce-200 px-3 py-2 text-sm last:border-0">
      <span className="text-profondo/65">{label}</span>
      <span className={cn('num font-medium', muto ? 'text-profondo/60' : 'text-profondo')}>{valore}</span>
    </div>
  )
}

function Kpi({ icona: Icona, etichetta, valore, sotto }: { icona: typeof Trophy; etichetta: string; valore: string; sotto?: string }) {
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
