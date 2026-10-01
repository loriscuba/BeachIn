import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { X, Lock, ChevronDown } from 'lucide-react'
import { navigazione, gruppiNav, type SottoVoce, type VoceNav } from '@/config/navigazione'
import { useModuli } from '@/context/ModuliContext'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Logo } from './Logo'
import { cn } from '@/lib/cn'
import { campanello, sbloccaAudio } from '@/lib/suoni'

interface SidebarProps {
  aperta: boolean
  onChiudi: () => void
}

/** Badge rosso stile iPhone. */
export function BadgeConta({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null
  return <span className={cn('num grid h-5 min-w-5 place-content-center rounded-full bg-boa px-1.5 text-[11px] font-bold leading-none text-white', className)}>{n > 99 ? '99+' : n}</span>
}

/** Il sottomenu è attivo se pagina e `?tab=` coincidono (senza tab = il primo della pagina). */
function sottoAttivo(f: SottoVoce, fratelli: SottoVoce[], pathname: string, search: string) {
  const [base, qs] = f.percorso.split('?')
  if (pathname !== base) return false
  const tabFiglio = new URLSearchParams(qs).get('tab')
  if (!tabFiglio) return true
  const tab = new URLSearchParams(search).get('tab')
  if (tab) return tab === tabFiglio
  return fratelli.find((x) => x.percorso.startsWith(base + '?')) === f
}

export function Sidebar({ aperta, onChiudi }: SidebarProps) {
  const { moduloAttivo } = useModuli()
  const { richiesteRistorante } = useDemoData()
  const { pathname, search } = useLocation()
  const [aperti, setAperti] = useState<Record<string, boolean>>({})
  const conta = { richieste: richiesteRistorante.filter((r) => r.stato === 'da_confermare').length }
  const chiudiSeMobile = () => { if (!window.matchMedia('(min-width: 1024px)').matches) onChiudi() }
  // Suono a ogni richiesta nuova dal sito (non al primo caricamento). Il browser
  // permette l'audio solo dopo un gesto: lo sblocchiamo al primo tocco sulla pagina.
  const viste = useRef<Set<string> | null>(null)
  const idRichieste = richiesteRistorante.filter((r) => r.stato === 'da_confermare').map((r) => r.id)
  useEffect(() => {
    if (viste.current && moduloAttivo('ristorante') && idRichieste.some((id) => !viste.current!.has(id))) campanello()
    viste.current = new Set(idRichieste)
  }, [idRichieste.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const sblocca = () => sbloccaAudio()
    window.addEventListener('pointerdown', sblocca, { once: true })
    return () => window.removeEventListener('pointerdown', sblocca)
  }, [])
  const dentro = (v: VoceNav) => (v.figli ?? []).some((f) => pathname === f.percorso.split('?')[0])
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
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-profondo text-white',
          // mobile: pannello sopra i contenuti; desktop: colonna che scorre fuori a sinistra
          'transition-all duration-200 lg:static',
          aperta ? 'translate-x-0' : '-translate-x-full lg:-ml-64'
        )}
        aria-hidden={!aperta}
      >
        {/* Intestazione */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <Logo />
          <button
            className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onChiudi}
            aria-label="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigazione */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {gruppiNav.map((gruppo) => {
            // Si mostrano solo i moduli attivi (i bloccati restano raggiungibili da Impostazioni → Moduli)
            const voci = navigazione
              .filter((v) => v.gruppo === gruppo)
              .map((v) => (v.figli ? { ...v, figli: v.figli.filter((f) => moduloAttivo(f.modulo)) } : v))
              .filter((v) => (v.figli ? v.figli.length > 0 : moduloAttivo(v.modulo)))
            if (voci.length === 0) return null
            return (
              <div key={gruppo}>
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  {gruppo}
                </p>
                <ul className="space-y-0.5">
                  {voci.map((v) => {
                    const bloccato = v.figli ? !v.figli.some((f) => moduloAttivo(f.modulo)) : !moduloAttivo(v.modulo)
                    if (v.figli) {
                      const qui = dentro(v)
                      const espanso = aperti[v.percorso] ?? qui
                      const totBadge = v.figli.reduce((n, f) => n + (f.badge ? conta[f.badge] : 0), 0)
                      return (
                        <li key={v.percorso}>
                          <button
                            type="button"
                            onClick={() => setAperti({ ...aperti, [v.percorso]: !espanso })}
                            aria-expanded={espanso}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                              qui ? 'text-white' : bloccato ? 'text-white/35 hover:bg-white/6' : 'text-white/70 hover:bg-white/6 hover:text-white'
                            )}
                          >
                            <v.icona className={cn('h-[18px] w-[18px] shrink-0', qui && 'text-tenda')} />
                            <span className="truncate">{v.etichetta}</span>
                            <span className="ml-auto flex items-center gap-2">
                              {!espanso && <BadgeConta n={totBadge} />}
                              {bloccato && <Lock className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                              <ChevronDown className={cn('h-4 w-4 opacity-60 transition-transform', espanso && 'rotate-180')} />
                            </span>
                          </button>
                          {espanso && (
                            <ul className="mb-1 ml-[1.35rem] space-y-0.5 border-l border-white/10 pl-3">
                              {v.figli.map((f) => {
                                const att = sottoAttivo(f, v.figli!, pathname, search)
                                const blocc = !moduloAttivo(f.modulo)
                                return (
                                  <li key={f.percorso}>
                                    <Link
                                      to={f.percorso}
                                      onClick={chiudiSeMobile}
                                      className={cn(
                                        'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                        att ? 'bg-white/12 font-semibold text-white' : blocc ? 'text-white/35 hover:bg-white/6' : 'text-white/65 hover:bg-white/6 hover:text-white'
                                      )}
                                    >
                                      <span className="truncate">{f.etichetta}</span>
                                      <span className="ml-auto flex items-center gap-2">
                                        {f.badge && <BadgeConta n={conta[f.badge]} />}
                                        {blocc && <Lock className="h-3.5 w-3.5 opacity-70" />}
                                      </span>
                                    </Link>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </li>
                      )
                    }
                    return (
                      <li key={v.percorso}>
                        <NavLink
                          to={v.percorso}
                          end={v.percorso === '/'}
                          // su desktop il menu resta aperto dopo la scelta
                          onClick={chiudiSeMobile}
                          title={bloccato ? 'Modulo non incluso nel piano — attivalo' : undefined}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-white/12 text-white'
                                : bloccato
                                  ? 'text-white/35 hover:bg-white/6 hover:text-white/60'
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
                              {bloccato && <Lock className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" />}
                            </>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
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
