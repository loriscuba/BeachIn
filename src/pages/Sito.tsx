import { Globe, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PaginaSegnaposto } from '@/components/ui/PaginaSegnaposto'
import { Button } from '@/components/ui/Button'

export default function Sito() {
  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-2xl justify-end">
        <Link to="/sito/anteprima" target="_blank" rel="noreferrer">
          <Button variante="secondario" dimensione="sm">
            <ExternalLink className="h-4 w-4" />
            Anteprima sito
          </Button>
        </Link>
      </div>
      <PaginaSegnaposto
        icona={Globe}
        titolo="Sito internet"
        descrizione="Gestione del sito dello stabilimento, non un semplice link."
        fase={8}
        contenuti={[
          'Gestione pagine: home, listino, servizi, ristorante, contatti, dove siamo',
          'Editor homepage, galleria fotografica, news ed eventi',
          'Listino pubblicato sincronizzato con il modulo Tariffe',
          'Disponibilità ombrelloni mostrata in tempo reale',
          'Richieste di prenotazione online da confermare o rifiutare',
          'Messaggi dal form contatti, recensioni, statistiche visite, SEO',
        ]}
      />
    </div>
  )
}
