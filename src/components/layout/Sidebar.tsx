import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { navigazione, gruppiNav } from '@/config/navigazione'
import { config } from '@/data/config'
import { Logo } from './Logo'
import { cn } from '@/lib/cn'

interface SidebarProps {
  aperta: boolean
  onChiudi: () => void
}

export function Sidebar({ aperta, onChiudi }: SidebarProps) {
  return (
    <>
      {/* Backdrop su mobile */}
      {aperta && (
        <div
          className="fixed inset-0 z-30 bg-profondo-900/40 lg:hidden"
          onClick={onChiudi}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-profondo text-white',
          'transition-transform duration-200 lg:static lg:translate-x-0',
          aperta ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Intestazione */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <Logo />
          <button
            className="lg:hidden text-white/70 hover:text-white p-1"
            onClick={onChiudi}
            aria-label="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigazione */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {gruppiNav.map((gruppo) => {
            const voci = navigazione.filter((v) => v.gruppo === gruppo)
            if (voci.length === 0) return null
            return (
              <div key={gruppo}>
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  {gruppo}
                </p>
                <ul className="space-y-0.5">
                  {voci.map((v) => (
                    <li key={v.percorso}>
                      <NavLink
                        to={v.percorso}
                        end={v.percorso === '/'}
                        onClick={onChiudi}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-white/12 text-white'
                              : 'text-white/70 hover:bg-white/6 hover:text-white'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <v.icona
                              className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-tenda')}
                            />
                            <span className="truncate">{v.etichetta}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Piè di pagina */}
        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-sm font-semibold text-white leading-tight">{config.nome}</p>
          <p className="text-xs text-white/50">{config.localita}</p>
        </div>
      </aside>
    </>
  )
}
