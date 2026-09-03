import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { Card } from './Card'
import { Badge } from './Badge'

interface PaginaSegnapostoProps {
  icona: LucideIcon
  titolo: string
  descrizione: string
  fase: number
  contenuti: string[]
}

/**
 * Segnaposto per una pagina non ancora riempita.
 * Mostra cosa conterrà e in quale fase viene sviluppata, così la
 * navigazione è completa e presentabile già dalla Fase 1.
 */
export function PaginaSegnaposto({
  icona: Icona,
  titolo,
  descrizione,
  fase,
  contenuti,
}: PaginaSegnapostoProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="overflow-hidden">
        <div className="flex items-start gap-4 border-b border-calce-200 bg-calce/40 px-5 py-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-profondo text-white">
            <Icona className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-profondo">{titolo}</h2>
              <Badge tono="tenda">Fase {fase}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-profondo/60">{descrizione}</p>
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-profondo/45">
            Cosa conterrà
          </p>
          <ul className="space-y-2">
            {contenuti.map((c) => (
              <li key={c} className="flex items-start gap-2.5 text-sm text-profondo/80">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-acqua" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  )
}
