import { useState, type ReactNode, type SyntheticEvent } from 'react'
import { Eye } from 'lucide-react'

/** Comandi sempre consentiti in sola lettura: schede, filtri di data e ricerca, select (servono per guardare). */
const CONSENTITI = '[data-naviga], select, input[type=date], input[type=month], input[type=week], input[type=search]'
const COMANDI = 'button, [role=button], input, textarea, label'

/**
 * Sola lettura per la sezione: blocca clic e digitazione su pulsanti e campi (tranne schede e filtri).
 * È solo comodità d'interfaccia: la vera protezione è nel database (policy RLS `beachin.ha_permesso`).
 */
export function SolaLettura({ children }: { children: ReactNode }) {
  const [avviso, setAvviso] = useState(false)
  const blocca = (e: SyntheticEvent) => {
    const el = e.target as HTMLElement
    if (!el.closest(COMANDI) || el.closest(CONSENTITI)) return
    e.preventDefault()
    e.stopPropagation()
    setAvviso(true)
    window.setTimeout(() => setAvviso(false), 2500)
  }
  return (
    <div onClickCapture={blocca} onKeyDownCapture={(e) => { if (e.key === 'Enter' || e.key === ' ') blocca(e) }} onBeforeInputCapture={blocca}>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-tenda/40 bg-tenda/15 px-3 py-2 text-sm text-[#7A5A12]">
        <Eye className="h-4 w-4 shrink-0" />
        {avviso ? 'Il tuo ruolo può solo consultare questa sezione.' : 'Sola lettura: puoi consultare questa sezione ma non modificarla.'}
      </div>
      {children}
    </div>
  )
}
