import { useSessione } from '@/context/SessioneContext'
import { Avatar } from '@/components/ui/Avatar'
import { useState } from 'react'
import { CentroNotifiche } from './CentroNotifiche'
import { SchedaUtente } from './SchedaUtente'
import { Menu, FlaskConical, CalendarClock, Sun, CloudSun, Cloud, CloudRain, CloudLightning } from 'lucide-react'
import { logoLido } from '@/assets/sito'
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

export function Topbar({ titolo, onApriMenu, onEsci }: TopbarProps) {
  const meteo = useMeteoOggi()
  const IconaMeteo = meteoIcona[meteo.meteo]
  const gradi = meteo.temp ?? meteo.max
  const dataBreve = `${config.oggi.slice(8, 10)}/${config.oggi.slice(5, 7)}`
  const { profilo } = useSessione()
  const [scheda, setScheda] = useState(false)
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

      {/* sinistra: foto (tocco = profilo), saluto con il nome del lido, data e meteo; il titolo resta per i lettori di schermo */}
      <h1 className="sr-only">{titolo}</h1>
      {/* tre zone: sinistra e destra larghe uguali, così il logo sta al centro senza mai sovrapporsi */}
      <div className="flex flex-1 basis-0 items-center gap-2.5">
        {profilo && (
          <button onClick={() => setScheda(true)} className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-full text-left" aria-label="Apri il tuo profilo" title="Il tuo profilo">
            <Avatar nome={profilo.nome} foto={profilo.foto} className="h-10 w-10" />
            <span className="min-w-0 leading-tight">
              <span className="block max-w-[7.5rem] truncate text-sm font-semibold text-profondo sm:max-w-[10rem]">Ciao {profilo.nome.trim().split(/\s+/)[0]}</span>
              <span className="hidden truncate text-xs text-profondo/55 sm:block">{config.nome}</span>
              {/* telefono: data e meteo sotto il saluto */}
              <span className="flex items-center gap-1 text-xs text-profondo/55 sm:hidden">{dataBreve} · <IconaMeteo className="h-3.5 w-3.5 text-tenda" /> {gradi}°</span>
            </span>
          </button>
        )}
        {/* tablet e PC: data e meteo accanto al saluto */}
        <div
          className="hidden shrink-0 items-center gap-2 rounded-lg border border-calce-200 bg-white px-2.5 py-1.5 text-sm text-profondo sm:flex"
          title={meteo.reale ? `Meteo attuale a Savona (Open-Meteo)${meteo.min != null ? ` · min ${meteo.min}° max ${meteo.max}°` : ''}` : 'Meteo di esempio (rete non disponibile)'}
        >
          <CalendarClock className="h-4 w-4 text-cabina" />
          <span className="hidden font-medium capitalize xl:inline">{dataEstesa(config.oggi)}</span>
          <span className="font-medium xl:hidden">{dataBreve}</span>
          <span className="flex items-center gap-1 border-l border-calce-200 pl-2">
            <IconaMeteo className="h-4 w-4 text-tenda" />
            {gradi}°
          </span>
        </div>
      </div>

      {/* logo dello stabilimento al centro della testata (chiaro in tema scuro) */}
      <img
        src={logoLido}
        alt={config.nome}
        className="logo-testata h-9 w-auto shrink-0 select-none md:h-11"
      />

      <div className="flex flex-1 basis-0 items-center justify-end gap-3">
      <CentroNotifiche />
      {profilo && <SchedaUtente profilo={profilo} aperta={scheda} onChiudi={() => setScheda(false)} onEsci={onEsci} />}

      {/* Badge dati dimostrativi — sempre visibile */}
      <div
        // sul telefono non c'è spazio: il badge esce dallo schermo
        className="hidden items-center gap-1.5 rounded-full bg-tenda/20 px-2.5 py-1 text-xs font-semibold text-[#7A5A12] sm:flex"
        title="Tutti i dati sono statici e mockati: le modifiche restano in memoria e al refresh tornano allo stato iniziale."
      >
        <FlaskConical className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Dati dimostrativi</span>
      </div>
      </div>
    </header>
  )
}
