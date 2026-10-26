import { useSessione } from '@/context/SessioneContext'
import { Avatar } from '@/components/ui/Avatar'
import { LogOut, Menu, FlaskConical, CalendarClock, Sun, CloudSun, Cloud, CloudRain, CloudLightning, Moon } from 'lucide-react'
import { useTema } from '@/hooks/useTema'
import type { Meteo } from '@/data/types'
import { useMeteoOggi } from '@/hooks/useMeteoOggi'
import { config } from '@/data/config'
import { dataEstesa } from '@/lib/formatters'

interface TopbarProps {
  titolo: string
  /** Icona della sezione, mostrata su una tessera nel colore d'area. */
  icona?: typeof Sun
  sottotitolo?: string
  onApriMenu: () => void
  onEsci: () => void
}

const meteoIcona: Record<Meteo, typeof Sun> = {
  sole: Sun, poco_nuvoloso: CloudSun, nuvoloso: Cloud, pioggia: CloudRain, temporale: CloudLightning,
}

export function Topbar({ titolo, sottotitolo, onApriMenu, onEsci, icona: IconaPagina }: TopbarProps) {
  const meteo = useMeteoOggi()
  const [tema, cambiaTema] = useTema()
  const IconaMeteo = meteoIcona[meteo.meteo]
  const { profilo } = useSessione()
  return (
    <header className="shell-bar sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-calce-200 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-4 md:h-16 lg:px-6">
      {/* su telefono e tablet il menu completo si apre da "Altro"/"Menu" nella barra delle schede */}
      <button
        className="-ml-1 hidden rounded-lg p-2 text-profondo hover:bg-profondo/5 lg:block"
        onClick={onApriMenu}
        aria-label="Apri o chiudi il menu"
        title="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {IconaPagina && (
        <span
          className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl text-[#0B2C39] sm:grid"
          style={{ background: 'linear-gradient(135deg, var(--accento), color-mix(in srgb, var(--accento) 70%, #ffffff))', boxShadow: '0 8px 20px -10px var(--accento)' }}
          aria-hidden
        >
          <IconaPagina className="h-5 w-5" strokeWidth={2.25} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-semibold leading-tight text-profondo">{titolo}</h1>
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

      {(
        <button
          onClick={cambiaTema}
          className="relative flex h-9 w-16 shrink-0 items-center rounded-full border border-calce-200 bg-white p-1 transition-colors"
          aria-label={tema === 'scuro' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
          title={tema === 'scuro' ? 'Tema chiaro' : 'Tema scuro'}
        >
          <span
            className={`grid h-7 w-7 place-items-center rounded-full shadow transition-transform duration-300 ${tema === 'scuro' ? 'translate-x-7 bg-profondo-600 text-tenda' : 'bg-tenda text-profondo'}`}
          >
            {tema === 'scuro' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </span>
        </button>
      )}

      {profilo && (
        <div className="flex items-center gap-2">
          <div className="hidden text-right leading-tight md:block">
            <p className="text-sm font-medium text-profondo">{profilo.nome}</p>
            <p className="text-xs text-profondo/55">{profilo.ruolo}</p>
          </div>
          <Avatar nome={profilo.nome} foto={profilo.foto} />
        </div>
      )}
      <button
        onClick={onEsci}
        className="bi-esci grid h-9 w-9 shrink-0 place-content-center rounded-full border border-calce-200 bg-white text-profondo/70 hover:text-profondo"
        aria-label="Esci"
        title="Esci"
      >
        <LogOut className="h-4 w-4" />
      </button>

      {/* Badge dati dimostrativi — sempre visibile */}
      <div
        // sul telefono non c'è spazio: il badge esce dallo schermo
        className="hidden items-center gap-1.5 rounded-full bg-tenda/20 px-2.5 py-1 text-xs font-semibold text-[#7A5A12] sm:flex"
        title="Tutti i dati sono statici e mockati: le modifiche restano in memoria e al refresh tornano allo stato iniziale."
      >
        <FlaskConical className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Dati dimostrativi</span>
      </div>
    </header>
  )
}
