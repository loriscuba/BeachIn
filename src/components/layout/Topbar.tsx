import { Menu, FlaskConical, CalendarClock } from 'lucide-react'
import { config } from '@/data/config'
import { dataEstesa } from '@/lib/formatters'

interface TopbarProps {
  titolo: string
  sottotitolo?: string
  onApriMenu: () => void
}

export function Topbar({ titolo, sottotitolo, onApriMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-calce-200 bg-calce/85 px-4 backdrop-blur lg:px-6">
      <button
        className="lg:hidden -ml-1 rounded-lg p-2 text-profondo hover:bg-profondo/5"
        onClick={onApriMenu}
        aria-label="Apri menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-tight text-profondo">{titolo}</h1>
        {sottotitolo && (
          <p className="truncate text-xs text-profondo/55">{sottotitolo}</p>
        )}
      </div>

      {/* Data simulata della demo */}
      <div className="hidden items-center gap-1.5 rounded-lg border border-calce-200 bg-white px-3 py-1.5 text-sm text-profondo sm:flex">
        <CalendarClock className="h-4 w-4 text-cabina" />
        <span className="font-medium capitalize">{dataEstesa(config.stagione.oggi)}</span>
      </div>

      {/* Badge dati dimostrativi — sempre visibile */}
      <div
        className="flex items-center gap-1.5 rounded-full bg-tenda/20 px-2.5 py-1 text-xs font-semibold text-[#7A5A12]"
        title="Tutti i dati sono statici e mockati: le modifiche restano in memoria e al refresh tornano allo stato iniziale."
      >
        <FlaskConical className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Dati dimostrativi</span>
        <span className="sm:hidden">Demo</span>
      </div>
    </header>
  )
}
