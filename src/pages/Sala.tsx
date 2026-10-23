/**
 * Comande ristorante — dal tavolo alla cucina, in due modalità:
 * - **Cameriere**: sceglie il tavolo, compone la comanda dal menu del Ristorante e la manda in cucina;
 * - **Tablet self**: il tablet resta al tavolo bloccato sul menu con foto, il cliente ordina da solo.
 * In entrambi i casi la comanda arriva nella scheda **Cucina** (stati, campanello). Schede `?tab=`.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
