/**
 * Comande ristorante — dal tavolo alla cucina, in due modalità:
 * - **Cameriere**: sceglie il tavolo, compone la comanda dal menu del Ristorante e la manda in cucina;
 * - **Tablet self**: il tablet resta al tavolo bloccato sul menu con foto, il cliente ordina da solo.
 * In entrambi i casi la comanda arriva nella scheda **Cucina** (stati, campanello). Schede `?tab=`.
 * **QR tavoli**: QR fisso per tavolo, il cliente ordina dal telefono quando il tavolo è aperto.
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
import QrTavoli from './sala/QrTavoli'
import Cameriere from './sala/Cameriere'
import Cucina from './sala/Cucina'
import AvvioSelf, { leggiSelf, type StatoSelf } from './sala/AvvioSelf'
import TabletSelf from './sala/TabletSelf'

type Scheda = 'cameriere' | 'cucina' | 'self' | 'qr' | 'bar'

export default function Sala() {
  const [params, setParams] = useSearchParams()
  const { comande, comandeSala } = useDemoData()
  const { moduloAttivo } = useModuli()
  const { puo } = useSessione()
  const conBar = moduloAttivo('bar-tavolo') && puo('bar-tavolo', 1)
  const schede: Scheda[] = ['cameriere', 'cucina', 'self', 'qr', ...(conBar ? ['bar' as const] : [])]
  const tab = schede.includes(params.get('tab') as Scheda) ? (params.get('tab') as Scheda) : 'cameriere'
  // tablet in modalità self: resta bloccato anche se si ricarica la pagina
  const [self, setSelf] = useState<StatoSelf | null>(leggiSelf)

  if (self) return <TabletSelf stato={self} onEsci={() => setSelf(null)} />

  return (
    <div className="space-y-4">
      <LinkSalaApp className="hidden lg:block" />
      <Tabs
        valore={tab}
        onChange={(v) => setParams({ tab: v })}
        opzioni={[
          { valore: 'cameriere', etichetta: 'Cameriere' },
          { valore: 'cucina', etichetta: 'Cucina', badge: daFareCucina(comandeSala) },
          { valore: 'self', etichetta: 'Tablet self' },
          { valore: 'qr', etichetta: 'QR tavoli' },
          ...(conBar ? [{ valore: 'bar', etichetta: 'Bar', badge: codaBar(comande, comandeSala).daFare.length }] : []),
        ]}
      />
      {tab === 'cameriere' && <Cameriere />}
      {tab === 'cucina' && <Cucina />}
      {tab === 'self' && <AvvioSelf onAvvia={setSelf} />}
      {tab === 'qr' && <QrTavoli />}
      {tab === 'bar' && <CodaBar />}
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
