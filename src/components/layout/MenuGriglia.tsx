import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { accento } from '@/config/accenti'
import type { LucideIcon } from 'lucide-react'
import { useConteggiNav, useVociMenu } from '@/hooks/useNavStaff'
import type { SottoVoce } from '@/config/navigazione'
import { cn } from '@/lib/cn'

interface Tessera { percorso: string; etichetta: string; icona: LucideIcon; colore: string; badge?: SottoVoce['badge'] }

/**
 * Telefono: "Altro" apre tutte le sezioni come pulsanti con icona come quelli della barra in basso, divisi per area,
 * al posto del menu a elenco. Pannello dal basso; si chiude toccando fuori, con la X o scegliendo una sezione.
 */
export function MenuGriglia({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const voci = useVociMenu()
  const conta = useConteggiNav()
  const { pathname, search } = useLocation()
  // cambio pagina (anche dal tasto indietro) = pannello chiuso
  useEffect(() => { onChiudi() }, [pathname, search]) // eslint-disable-line react-hooks/exhaustive-deps
  // aperto: la pagina dietro non scorre e Esc chiude
  const chiudi = useRef(onChiudi)
  chiudi.current = onChiudi
  useEffect(() => {
    if (!aperto) return
    const main = document.querySelector('main')
    const prima = main?.style.overflowY ?? ''
    if (main) main.style.overflowY = 'hidden'
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') chiudi.current() }
    window.addEventListener('keydown', esc)
    return () => { if (main) main.style.overflowY = prima; window.removeEventListener('keydown', esc) }
  }, [aperto])
  // trascinando giù la maniglia/il titolo il pannello si chiude
  const inizioY = useRef<number | null>(null)

  // sezioni senza sottomenu insieme in "Generale", le altre ognuna col suo gruppo
  const singole: Tessera[] = voci.filter((v) => !v.figli).map((v) => ({ percorso: v.percorso, etichetta: v.etichetta, icona: v.icona, colore: accento(v.percorso) }))
  const gruppi: { titolo: string; tessere: Tessera[] }[] = [
    ...(singole.length ? [{ titolo: 'Generale', tessere: singole }] : []),
    ...voci.filter((v) => v.figli).map((v) => ({
      titolo: v.etichetta,
      tessere: v.figli!.map((f) => ({ percorso: f.percorso, etichetta: f.etichetta, icona: f.icona ?? v.icona, colore: accento(v.percorso), badge: f.badge })),
    })),
  ]
  const qui = pathname + search

  return (
    <div className={cn('fixed inset-0 z-40 md:hidden', !aperto && 'pointer-events-none')} aria-hidden={!aperto}>
      <div className={cn('absolute inset-0 touch-none bg-profondo-900/50 transition-opacity duration-200', aperto ? 'opacity-100' : 'opacity-0')} onClick={onChiudi} />
      <div
        role="dialog"
        aria-label="Tutte le sezioni"
        className={cn(
          'shell-side absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-profondo pb-[env(safe-area-inset-bottom)] text-white shadow-2xl transition-transform duration-200',
          aperto ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="shrink-0 touch-none px-5 pb-2 pt-2"
          onTouchStart={(e) => { inizioY.current = e.touches[0].clientY }}
          onTouchEnd={(e) => { if (inizioY.current !== null && e.changedTouches[0].clientY - inizioY.current > 50) onChiudi(); inizioY.current = null }}>
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/25" />
          <div className="flex items-center justify-between">
          <p className="font-display text-xl font-semibold text-white">Tutte le sezioni</p>
          <button type="button" onClick={onChiudi} className="-mr-2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/10" aria-label="Chiudi">
            <X className="h-6 w-6" />
          </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-5 [-webkit-overflow-scrolling:touch]">
          {gruppi.map((g) => (
            // riquadro con un velo leggero del colore della sezione, per distinguerle a colpo d'occhio
            <section key={g.titolo} className="rounded-2xl p-2 pt-2.5"
              style={{ background: `color-mix(in srgb, ${g.tessere[0]?.colore} 11%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${g.tessere[0]?.colore} 18%, transparent)` }}>
              {/* colore dell'area: puntino accanto al titolo e velo del riquadro; icone sobrie come nella barra in basso */}
              <p className="mb-1.5 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.tessere[0]?.colore }} />{g.titolo}
              </p>
              <div className="grid grid-cols-4 gap-1">
                {g.tessere.map((t) => {
                  const att = qui === t.percorso || (!t.percorso.includes('?') && pathname === t.percorso)
                  const n = t.badge ? conta[t.badge] : 0
                  return (
                    <Link
                      key={t.percorso}
                      to={t.percorso}
                      onClick={onChiudi}
                      className={cn('relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-center text-[11px] font-semibold leading-tight transition active:scale-95',
                        att ? 'bg-white/[0.09] text-white' : 'text-white/65 hover:bg-white/[0.05]')}
                    >
                      {/* come la barra in basso: icona a linee, colorata solo sulla sezione aperta */}
                      <span className="relative grid h-7 w-7 place-items-center rounded-lg" style={att ? { background: t.colore, color: '#0B2C39' } : undefined}>
                        <t.icona className="h-[19px] w-[19px]" strokeWidth={att ? 2.4 : 2} />
                        {n > 0 && <span className="num absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-content-center rounded-full bg-boa px-1 text-[10px] font-bold leading-none text-white">{n > 99 ? '99+' : n}</span>}
                      </span>
                      <span className="line-clamp-2 max-w-full">{t.etichetta}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
