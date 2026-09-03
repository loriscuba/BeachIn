import { Umbrella } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function Arenile() {
  return (
    <PaginaSegnaposto
      icona={Umbrella}
      titolo="Arenile"
      descrizione="La schermata più importante: la pianta dello stabilimento vista dall'alto."
      fase={3}
      contenuti={[
        'Pianta vista dall’alto: mare in cima, strada in fondo, file come file vere',
        'Ogni postazione cliccabile e colorata per stato',
        'Passerelle, cabine, bar, ristorante e torrette disegnati nella pianta',
        'Pannello laterale con cliente, periodo, tariffa, conto bar e azioni',
        'Filtri per stato, tipologia, periodo e ricerca cliente',
        'Contatori sempre visibili: libere, occupate, stagionali, fuori servizio',
      ]}
    />
  )
}
