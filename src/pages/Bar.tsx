import { Coffee } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function Bar() {
  return (
    <PaginaSegnaposto
      icona={Coffee}
      titolo="Bar"
      descrizione="Vendite, listino con margini, giacenze e conti aperti per ombrellone."
      fase={5}
      contenuti={[
        'Vendite del giorno e di periodo, per categoria e fascia oraria',
        'Listino con prezzo, costo, margine e incidenza costo merce',
        'Giacenze con soglie di riordino',
        'Conti aperti per ombrellone e addebito sul conto della postazione',
      ]}
    />
  )
}
