/**
 * Comande ristorante — dal tavolo alla cucina, in due modalità:
 * - **Cameriere**: sceglie il tavolo, compone la comanda dal menu del Ristorante e la manda in cucina;
 * - **Tablet self**: il tablet resta al tavolo bloccato sul menu con foto, il cliente ordina da solo.
 * In entrambi i casi la comanda arriva nella scheda **Cucina** (stati, campanello). Schede `?tab=`.
 * QR fisso per tavolo (il cliente ordina dal telefono quando il tavolo è aperto): si gestisce dentro **Cameriere**.
 * Con il modulo Bar al tavolo c'è anche la scheda **Bar**: coda unica di bevande dei tavoli e comande degli ombrelloni.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy, ExternalLink, Smartphone } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { QrCodice } from '@/components/QrCodice'
import { daFareCucina, urlSalaApp, codaBar } from '@/lib/sala'
import { Tabs } from '@/components/ui/Tabs'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { useSessione } from '@/context/SessioneContext'
import CodaBar from './sala/CodaBar'
import { useFunzioni, SchedaProtetta } from '@/hooks/useFunzioni'
import type { Livello } from '@/lib/permessi'
import Cameriere from './sala/Cameriere'
import Cucina from './sala/Cucina'
import AvvioSelf, { leggiSelf, type StatoSelf } from './sala/AvvioSelf'
import TabletSelf from './sala/TabletSelf'

type Scheda = 'cameriere' | 'cucina' | 'self' | 'bar'

export default function Sala() {
  const [params, setParams] = useSearchParams()
  const { comande, comandeSala } = useDemoData()
  const { moduloAttivo } = useModuli()
  const { puo, livello } = useSessione()
  const { livello: livFunzione } = useFunzioni()
  const conBar = moduloAttivo('bar-tavolo') && puo('bar-tavolo', 1)
  // chi ha solo la Coda bar (es. Responsabile senza Sala) vede solo quella; le schede della Sala seguono le funzionalità
  const schedeSala = (['cameriere', 'cucina', 'self'] as const).filter((x) => moduloAttivo('sala') && livFunzione(`sala.${x}`) > 0)
  const conSala = schedeSala.length > 0
  const schede: Scheda[] = [...schedeSala, ...(conBar ? ['bar' as const] : [])]
  // il vecchio link ?tab=qr (QR tavoli) porta al Cameriere, dove ora stanno i QR
  const richiesta = params.get('tab') === 'qr' ? 'cameriere' : params.get('tab')
  const tab = schede.includes(richiesta as Scheda) ? (richiesta as Scheda) : schede[0]
  const livScheda = !tab ? 0 : tab === 'bar' ? livello('bar-tavolo') : livFunzione(`sala.${tab}`)
  // tablet in modalità self: resta bloccato anche se si ricarica la pagina
  const [self, setSelf] = useState<StatoSelf | null>(leggiSelf)

  if (self) return <TabletSelf stato={self} onEsci={() => setSelf(null)} />

  return (
    <div className="space-y-4">
      {conSala && <LinkSalaApp className="hidden lg:block" />}
      {schede.length > 1 && <Tabs
        valore={tab}
        onChange={(v) => setParams({ tab: v })}
        opzioni={[
          ...[
            { valore: 'cameriere' as const, etichetta: 'Cameriere' },
            { valore: 'cucina' as const, etichetta: 'Cucina', badge: daFareCucina(comandeSala) },
            { valore: 'self' as const, etichetta: 'Tablet self' },
          ].filter((x) => schedeSala.includes(x.valore)),
          ...(conBar ? [{ valore: 'bar', etichetta: 'Bar', badge: codaBar(comande, comandeSala).daFare.length }] : []),
        ]}
      />}
      <SchedaProtetta modulo={tab === 'bar' ? 'bar-tavolo' : 'sala'} livello={livScheda as Livello}>
        {tab === 'cameriere' && <Cameriere />}
        {tab === 'cucina' && <Cucina />}
        {tab === 'self' && <AvvioSelf onAvvia={setSelf} />}
        {tab === 'bar' && <CodaBar />}
      </SchedaProtetta>
    </div>
  )
}

/** Solo su PC: QR per aprire la stessa app sul telefono del cameriere o sul tablet della cucina. */
function LinkSalaApp({ className }: { className?: string }) {
  const link = urlSalaApp()
  const [copiato, setCopiato] = useState(false)
  return (
    <Card className={className}>
      <CardBody className="flex flex-wrap items-center gap-4">
        <QrCodice url={link} className="w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 font-semibold text-profondo"><Smartphone className="h-4 w-4 text-cabina" /> Apri la sala sul telefono o sul tablet</p>
          <p className="break-all text-xs text-profondo/55">{link}</p>
          <p className="mt-1 text-xs text-profondo/55">È la stessa app BeachIn: inquadra il QR, entra con il tuo utente e aggiungila alla schermata Home. Ognuno vede le schede del suo ruolo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button dimensione="sm" onClick={() => { navigator.clipboard?.writeText(link); setCopiato(true); window.setTimeout(() => setCopiato(false), 2000) }}><Copy className="h-4 w-4" /> {copiato ? 'Copiato!' : 'Copia link'}</Button>
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-calce-200 px-3 py-1.5 text-sm font-medium text-profondo hover:bg-calce/50"><ExternalLink className="h-4 w-4" /> Apri</a>
        </div>
      </CardBody>
    </Card>
  )
}
