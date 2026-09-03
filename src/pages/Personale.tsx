import { UserCog } from 'lucide-react'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'

export default function Personale() {
  return (
    <PaginaSegnaposto
      icona={UserCog}
      titolo="Personale"
      descrizione="Organico, turni e costo del lavoro per ruolo e per mese."
      fase={7}
      contenuti={[
        'Organico con ruolo, contratto e periodo di impiego',
        'Turni settimanali su griglia',
        'Ore lavorate contro ore contratto',
        'Costo per ruolo e per mese',
      ]}
    />
  )
}
