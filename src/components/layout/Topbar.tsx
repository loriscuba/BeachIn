import { Menu, FlaskConical, CalendarClock, Sun, CloudSun, Cloud, CloudRain, CloudLightning } from 'lucide-react'
import type { Meteo } from '@/data/types'
import { useMeteoOggi } from '@/hooks/useMeteoOggi'
import { config } from '@/data/config'
import { dataEstesa } from '@/lib/formatters'

interface TopbarProps {
  titolo: string
  sottotitolo?: string
  onApriMenu: () => void
}

const meteoIcona: Record<Meteo, typeof Sun> = {
  sole: Sun, poco_nuvoloso: CloudSun, nuvoloso: Cloud, pioggia: CloudRain, temporale: CloudLightning,
}

export function Topbar({ titolo, sottotitolo, onApriMenu }: TopbarProps) {
  const meteo = useMeteoOggi()
  const IconaMeteo = meteoIcona[meteo.meteo]
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-calce-200 bg-calce/85 px-4 backdrop-blur lg:px-6">
      <button
        className="-ml-1 rounded-lg p-2 text-profondo hover:bg-profondo/5"
        onClick={onApriMenu}
        aria-label="Apri o chiudi il menu"
        title="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-tight text-profondo">{titolo}</h1>
        {sottotitolo && (
          <p className="truncate text-xs text-profondo/55">{sottotitolo}</p>
        )}
      </div>


      {/* Data di oggi + meteo attuale a Savona */}
      <div className="flex items-center gap-2 rounded-lg border border-calce-200 bg-white px-2.5 py-1.5 text-sm text-profondo">
        <CalendarClock className="hidden h-4 w-4 text-cabina sm:block" />
        <span className="hidden font-medium capitalize md:inline">{dataEstesa(config.oggi)}</span>
        <span className="font-medium md:hidden">{config.oggi.slice(8, 10)}/{config.oggi.slice(5, 7)}</span>
        <span
          className="flex items-center gap-1 border-l border-calce-200 pl-2"
          title={meteo.reale ? `Meteo attuale a Savona (Open-Meteo)${meteo.min != null ? ` · min ${meteo.min}° max ${meteo.max}°` : ''}` : 'Meteo di esempio (rete non disponibile)'}
        >
          <IconaMeteo className="h-4 w-4 text-tenda" />
          {meteo.temp ?? meteo.max}°
        </span>
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
