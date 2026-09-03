import { Tags } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function Tariffe() {
  return (
    <PaginaSegnaposto
      icona={Tags}
      titolo="Tariffe"
      descrizione="Listini per periodo, fila e tipologia, con simulatore di preventivo."
      fase={5}
      contenuti={[
        'Matrice periodo × fila × tipologia, editabile',
        'Simulatore: “2 persone, fila C, ombrellone e 2 lettini, 3–17 agosto → totale”',
        'Tariffe accessorie, sconti e convenzioni',
        'Stato bozza/pubblicato e pubblicazione sul sito',
      ]}
    />
  )
}
