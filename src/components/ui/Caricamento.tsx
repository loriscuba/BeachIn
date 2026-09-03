import { Loader2 } from 'lucide-react'

/** Stato di caricamento a pagina intera (fallback di Suspense). */
export function Caricamento() {
  return (
    <div className="grid h-64 place-items-center text-profondo/50">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}
