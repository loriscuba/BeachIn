import { UtensilsCrossed } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function Ristorante() {
  return (
    <PaginaSegnaposto
      icona={UtensilsCrossed}
      titolo="Ristorante"
      descrizione="Prenotazioni per turno, coperti e menù con food cost e margine."
      fase={5}
      contenuti={[
        'Prenotazioni per turno (pranzo/cena) e mappa tavoli semplificata',
        'Coperti serviti, scontrino medio e incasso',
        'Menù con food cost e margine per piatto',
        'Piatti più venduti e piatti meno redditizi',
      ]}
    />
  )
}
