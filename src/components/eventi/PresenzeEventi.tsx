import { useMemo, useState } from 'react'
import { Check, RotateCcw, Users, UserCheck, Clock, Ticket, ExternalLink, ScanLine, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { dataEstesa, numero } from '@/lib/formatters'
import { oraDa, urlInvito } from '@/lib/invitiEventi'

/** Eventi → Presenze: chi ha l'invito confermato e chi è già entrato (ingressi registrati dall'app admin col QR). */
export function PresenzeEventi() {
  const { eventi, richiesteEventi, segnaArrivoEvento, reinviaInvito } = useDemoData()
  const [inviati, setInviati] = useState<Record<string, boolean>>({})
  const reinvia = (id: string) => {
    reinviaInvito(id)
    setInviati((m) => ({ ...m, [id]: true }))
    setTimeout(() => setInviati((m) => ({ ...m, [id]: false })), 4000)
  }
  // Solo eventi di oggi e futuri, dal più vicino.
  const ordinati = useMemo(() => eventi.filter((e) => e.data >= config.oggi).sort((a, b) => a.data.localeCompare(b.data)), [eventi])
  const [scelto, setEventoId] = useState('')
  const evento = ordinati.find((e) => e.id === scelto) ?? ordinati[0]
  const eventoId = evento?.id ?? ''

  const invitati = richiesteEventi
    .filter((r) => r.eventoId === eventoId && r.stato === 'confermata')
    .sort((a, b) => a.nome.localeCompare(b.nome))
  const attese = invitati.reduce((s, r) => s + r.persone, 0)
  const entrate = invitati.reduce((s, r) => s + (r.arrivati ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-96">
          <Select value={eventoId} onChange={(e) => setEventoId(e.target.value)}
            opzioni={ordinati.length ? ordinati.map((e) => ({ valore: e.id, etichetta: `${dataEstesa(e.data)} · ${e.nome}` })) : [{ valore: '', etichetta: 'Nessun evento in programma' }]} />
        </div>
        {eventoId && <Link to={`/prenotazioni?tab=ingressi&evento=${eventoId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-cabina hover:underline">
          <ScanLine className="h-4 w-4" /> Registra ingressi col QR
        </Link>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icona={Ticket} etichetta="Inviti confermati" valore={numero(invitati.length)} />
        <Tile icona={Users} etichetta="Persone attese" valore={numero(attese)} />
        <Tile icona={UserCheck} etichetta="Entrate" valore={numero(entrate)} sotto={attese ? `${Math.round((entrate / attese) * 100)}% delle attese` : undefined} />
        <Tile icona={Clock} etichetta="Ancora da arrivare" valore={numero(Math.max(0, attese - entrate))} />
      </div>

      <Card>
        <CardHeader titolo={evento ? `Presenze · ${evento.nome}` : 'Presenze'} sottotitolo="Gli ingressi si registrano scansionando il QR dell’invito; qui puoi anche segnarli a mano" />
        <CardBody className="pt-1">
          {invitati.length === 0 ? (
            <p className="py-6 text-center text-sm text-profondo/50">Nessun invito confermato per questo evento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-calce-200 text-left text-xs uppercase tracking-wide text-profondo/55">
                  <th className="py-2 pr-3 font-semibold">Invitato</th><th className="py-2 pr-3 font-semibold">Persone</th>
                  <th className="py-2 pr-3 font-semibold">Codice invito</th><th className="py-2 pr-3 font-semibold">Stato</th><th className="py-2" />
                </tr></thead>
                <tbody className="divide-y divide-calce-200">
                  {invitati.map((r) => {
                    const arr = r.arrivati ?? 0
                    return (
                      <tr key={r.id}>
                        <td className="py-2.5 pr-3"><p className="font-medium text-profondo">{r.nome}</p><p className="text-profondo/55">{r.email || r.telefono || (r.origine === 'manuale' ? 'inserito a mano' : '')}</p></td>
                        <td className="num py-2.5 pr-3">{arr}/{r.persone}</td>
                        <td className="py-2.5 pr-3">{r.codice
                          ? <a href={urlInvito(r.codice)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono tracking-wider text-cabina hover:underline">{r.codice} <ExternalLink className="h-3.5 w-3.5" /></a>
                          : <span className="text-profondo/40">—</span>}</td>
                        <td className="py-2.5 pr-3">{arr >= r.persone ? <Badge tono="verde">Entrati {oraDa(r.arrivoTs)}</Badge> : arr > 0 ? <Badge tono="giallo">In parte · {oraDa(r.arrivoTs)}</Badge> : <Badge tono="tenda">Atteso</Badge>}</td>
                        <td className="space-x-2 whitespace-nowrap py-2.5 text-right">
                          {r.email.includes('@') && (inviati[r.id]
                            ? <span className="inline-flex items-center gap-1 text-sm font-medium text-[#2F6E5F]"><Check className="h-4 w-4" /> Invito inviato</span>
                            : <Button variante="secondario" dimensione="sm" onClick={() => reinvia(r.id)} title={`Rimanda la mail con il QR a ${r.email}`}><Mail className="h-4 w-4" /> Reinvia invito</Button>)}
                          {arr >= r.persone
                          ? <Button variante="secondario" dimensione="sm" onClick={() => segnaArrivoEvento(r.id, 0)}><RotateCcw className="h-4 w-4" /> Annulla</Button>
                          : <Button variante="primario" dimensione="sm" onClick={() => segnaArrivoEvento(r.id, r.persone)}><Check className="h-4 w-4" /> Segna entrati</Button>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function Tile({ icona: Icona, etichetta, valore, sotto }: { icona: typeof Users; etichetta: string; valore: string; sotto?: string }) {
  return (
    <Card><CardBody>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-profondo/55"><Icona className="h-4 w-4 text-cabina" /> {etichetta}</p>
      <p className="num mt-1 text-3xl font-bold text-profondo">{valore}</p>
      {sotto && <p className="mt-0.5 text-sm text-profondo/55">{sotto}</p>}
    </CardBody></Card>
  )
}
