import { CalendarDays } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function Eventi() {
  return (
    <PaginaSegnaposto
      icona={CalendarDays}
      titolo="Eventi"
      descrizione="Calendario della stagione e conto economico dei singoli eventi."
      fase={7}
      contenuti={[
        'Calendario eventi della stagione',
        'Scheda evento con budget, costi, ricavi e margine',
        'Partecipanti e confronto budget vs consuntivo',
      ]}
    />
  )
}
