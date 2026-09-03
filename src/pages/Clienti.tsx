import { Users } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function Clienti() {
  return (
    <PaginaSegnaposto
      icona={Users}
      titolo="Clienti"
      descrizione="Anagrafiche, storico e valore generato in stagione."
      fase={5}
      contenuti={[
        'Elenco con ricerca e filtri per tipologia',
        'Scheda cliente: anagrafica, postazione, saldo, documenti',
        'Storico presenze e storico consumazioni',
        'Vista “clienti storici” con anni di fedeltà e valore in stagione',
      ]}
    />
  )
}
