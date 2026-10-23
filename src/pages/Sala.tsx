/**
 * Comande ristorante — dal tavolo alla cucina, in due modalità:
 * - **Cameriere**: sceglie il tavolo, compone la comanda dal menu del Ristorante e la manda in cucina;
 * - **Tablet self**: il tablet resta al tavolo bloccato sul menu con foto, il cliente ordina da solo.
 * In entrambi i casi la comanda arriva nella scheda **Cucina** (stati, campanello). Schede `?tab=`.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy, ExternalLink, Smartphone } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { QrCodice } from '@/components/QrCodice'
import { urlSalaApp } from '@/lib/sala'
import { Tabs } from '@/components/ui/Tabs'
import { useDemoData } from '@/context/DemoDataContext'
import Cameriere from './sala/Cameriere'
import Cucina from './sala/Cucina'
import AvvioSelf, { leggiSelf, type StatoSelf } from './sala/AvvioSelf'
import TabletSelf from './sala/TabletSelf'

type Scheda = 'cameriere' | 'cucina' | 'self'
const SCHEDE: Scheda[] = ['cameriere', 'cucina', 'self']

export default function Sala() {
  const [params, setParams] = useSearchParams()
  const tab = SCHEDE.includes(params.get('tab') as Scheda) ? (params.get('tab') as Scheda) : 'cameriere'
  const { comandeSala } = useDemoData()
  // tablet in modalità self: resta bloccato anche se si ricarica la pagina
  const [self, setSelf] = useState<StatoSelf | null>(leggiSelf)

  if (self) return <TabletSelf stato={self} onEsci={() => setSelf(null)} />

  return (
    <div className="space-y-4">
      <LinkSalaApp />
      <Tabs
        valore={tab}
        onChange={(v) => setParams({ tab: v })}
        opzioni={[
          { valore: 'cameriere', etichetta: 'Cameriere' },
          { valore: 'cucina', etichetta: 'Cucina', badge: comandeSala.filter((c) => c.stato === 'inviata').length },
          { valore: 'self', etichetta: 'Tablet self' },
        ]}
      />
      {tab === 'cameriere' && <Cameriere />}
      {tab === 'cucina' && <Cucina />}
      {tab === 'self' && <AvvioSelf onAvvia={setSelf} />}
    </div>
  )
}

/** Link all'app di sala separata (telefono del cameriere, tablet in cucina), come quello di ComandApp. */
function LinkSalaApp() {
  const link = urlSalaApp()
  const [copiato, setCopiato] = useState(false)
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center gap-4">
        <QrCodice url={link} className="w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 font-semibold text-profondo"><Smartphone className="h-4 w-4 text-cabina" /> BeachIn Sala: l'app per cameriere, cucina e tablet</p>
          <p className="break-all text-xs text-profondo/55">{link}</p>
          <p className="mt-1 text-xs text-profondo/55">Si apre col telefono o il tablet e si aggiunge alla schermata Home. Si entra con lo stesso utente del gestionale.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button dimensione="sm" onClick={() => { navigator.clipboard?.writeText(link); setCopiato(true); window.setTimeout(() => setCopiato(false), 2000) }}><Copy className="h-4 w-4" /> {copiato ? 'Copiato!' : 'Copia link'}</Button>
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-calce-200 px-3 py-1.5 text-sm font-medium text-profondo hover:bg-calce/50"><ExternalLink className="h-4 w-4" /> Apri</a>
        </div>
      </CardBody>
    </Card>
  )
}
