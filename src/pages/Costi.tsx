import { Receipt } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function Costi() {
  return (
    <PaginaSegnaposto
      icona={Receipt}
      titolo="Costi"
      descrizione="Tutte le voci di spesa dello stabilimento, filtrabili e riepilogate."
      fase={6}
      contenuti={[
        'Elenco filtrabile per categoria, centro di costo, stato pagamento e periodo',
        'Sintesi fissi contro variabili e incidenza per categoria',
        'Calendario scadenze e confronto con l’anno precedente',
        'Form per inserire un nuovo costo',
      ]}
    />
  )
}
