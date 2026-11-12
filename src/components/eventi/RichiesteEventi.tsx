import { useMemo, useState } from 'react'
import { Check, X as XIcon, Inbox } from 'lucide-react'
import type { RichiestaEvento } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { dataEstesa } from '@/lib/formatters'

/** Eventi → Richieste: prenotazioni eventi arrivate dal sito/app clienti da confermare o rifiutare. */
export function RichiesteEventi() {
  const { richiesteEventi, confermaEvento, rifiutaEvento } = useDemoData()
  const [vista, setVista] = useState<'da_confermare' | 'gestite'>('da_confermare')
  const dalSito = useMemo(() => richiesteEventi.filter((r) => r.origine !== 'manuale'), [richiesteEventi])
  // da confermare: dall'evento più vicino; gestite: solo eventi da oggi in poi, dalla più recente
  const daConfermare = useMemo(() => dalSito.filter((r) => r.stato === 'da_confermare')
    .sort((a, b) => a.eventoData.localeCompare(b.eventoData) || a.ricevutaIl.localeCompare(b.ricevutaIl)), [dalSito])
  const gestite = useMemo(() => dalSito.filter((r) => r.stato !== 'da_confermare' && r.eventoData >= config.oggi)
    .sort((a, b) => b.ricevutaIl.localeCompare(a.ricevutaIl)), [dalSito])
  const lista = vista === 'da_confermare' ? daConfermare : gestite

  return (
    <Card>
      <CardHeader titolo="Richieste dal sito" sottotitolo="Confermando, l’invitato passa in Presenze e riceve il QR dell’invito" />
      <CardBody className="space-y-3 pt-1">
        <Tabs opzioni={[
          { valore: 'da_confermare', etichetta: 'Da confermare', badge: daConfermare.length },
          { valore: 'gestite', etichetta: 'Già gestite' },
        ]} valore={vista} onChange={setVista} />
        {lista.length === 0 ? (
          <p className="flex flex-col items-center gap-2 py-8 text-center text-sm text-profondo/50">
            <Inbox className="h-6 w-6 text-profondo/30" />
            {vista === 'da_confermare' ? 'Nessuna richiesta da confermare.' : 'Nessuna richiesta gestita per gli eventi in programma.'}
          </p>
        ) : (
          <ul className="divide-y divide-calce-200">
            {lista.map((r) => <Riga key={r.id} r={r} onConferma={() => confermaEvento(r.id)} onRifiuta={() => rifiutaEvento(r.id)} />)}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

function Riga({ r, onConferma, onRifiuta }: { r: RichiestaEvento; onConferma: () => void; onRifiuta: () => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-profondo">{r.nome} <span className="font-normal text-profondo/50">· {r.persone} {r.persone === 1 ? 'persona' : 'persone'}</span></p>
        <p className="text-xs text-profondo/55">{r.eventoNome} · {dataEstesa(r.eventoData)}</p>
        {(r.email || r.telefono) && <p className="text-xs text-profondo/45">{[r.email, r.telefono].filter(Boolean).join(' · ')}</p>}
        {r.note && <p className="mt-0.5 text-xs italic text-profondo/50">“{r.note}”</p>}
      </div>
      {r.stato === 'da_confermare' ? (
        <div className="flex items-center gap-2">
          {r.azioneCliente === 'modifica' && <Badge tono="tenda">Modificata dal cliente</Badge>}
          <Button variante="primario" dimensione="sm" onClick={onConferma}><Check className="h-4 w-4" /> Conferma</Button>
          <Button variante="secondario" dimensione="sm" onClick={() => { if (confirm(`Rifiutare la richiesta di ${r.nome}? Riceverà la mail “posti esauriti”.`)) onRifiuta() }}><XIcon className="h-4 w-4" /> Rifiuta</Button>
        </div>
      ) : (
        <Badge tono={r.stato === 'confermata' ? 'acqua' : 'boa'} puntino>{r.stato === 'confermata' ? 'Confermata' : r.stato === 'annullata' ? 'Annullata dal cliente' : 'Rifiutata'}</Badge>
      )}
    </li>
  )
}
