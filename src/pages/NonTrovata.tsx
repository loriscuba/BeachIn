import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function NonTrovata() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-profondo text-white">
        <Compass className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-profondo">Pagina non trovata</h2>
      <p className="mt-1 text-sm text-profondo/60">
        Il percorso richiesto non esiste in questo gestionale.
      </p>
      <Link to="/" className="mt-5">
        <Button variante="primario">Torna al cruscotto</Button>
      </Link>
    </div>
  )
}
