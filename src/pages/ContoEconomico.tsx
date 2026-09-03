import { Calculator } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function ContoEconomico() {
  return (
    <PaginaSegnaposto
      icona={Calculator}
      titolo="Conto economico"
      descrizione="Ricavi e costi per centro, margini e break-even della stagione."
      fase={6}
      contenuti={[
        'Ricavi e costi per centro: spiaggia, bar, ristorante, noleggi, eventi',
        'Margine di contribuzione per area e break-even di stagione',
        'Indicatori: costo per ombrellone/giorno, ricavo per postazione, per presenza',
        'Incidenza costo del personale e costo merce',
        'Vista mensile e vista stagionale',
      ]}
    />
  )
}
