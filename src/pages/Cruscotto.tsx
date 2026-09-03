import { LayoutDashboard } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function Cruscotto() {
  return (
    <PaginaSegnaposto
      icona={LayoutDashboard}
      titolo="Cruscotto"
      descrizione="La schermata su cui si apre la demo: la giornata in un colpo d'occhio."
      fase={4}
      contenuti={[
        'Incasso di oggi diviso per area, con confronto sull’anno scorso',
        'Occupazione arenile in percentuale e coperti pranzo/cena',
        'Andamento incassi degli ultimi 30 giorni (grafico combinato)',
        'Occupazione per fila e mix ricavi per centro',
        'Prossime scadenze di pagamento e alert operativi',
        'Meteo del giorno e dei 3 giorni successivi affiancato all’occupazione',
      ]}
    />
  )
}
