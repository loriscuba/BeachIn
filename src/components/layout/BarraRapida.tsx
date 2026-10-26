import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { accento } from '@/config/accenti'
import { schedaAttiva, useConteggiNav, useSchedeRapide } from '@/hooks/useNavStaff'
import { cn } from '@/lib/cn'
import { Logo } from './Logo'

/** Badge piccolo sopra l'icona. */
function Bollino({ n }: { n: number }) {
  if (n <= 0) return null
  return <span className="num absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-content-center rounded-full bg-boa px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{n > 99 ? '99+' : n}</span>
}

/**
 * Navigazione rapida dell'app staff. Telefono: barra in basso (4 schede del ruolo + "Altro" che apre il menu completo).
 * Tablet: colonna stretta a sinistra (fino a 6 schede + "Menu"). Su PC non c'è: resta la barra laterale completa.
 */
export function BarraRapida({ onAltro }: { onAltro: () => void }) {
  const schede = useSchedeRapide()
  const conta = useConteggiNav()
  const { pathname, search } = useLocation()
  const voce = (s: (typeof schede)[number], tablet: boolean) => {
    const att = schedaAttiva(s, pathname, search)
    return (
      <Link
        key={s.id}
        to={s.percorso}
        aria-current={att ? 'page' : undefined}
        className={cn(
          'relative flex flex-col items-center justify-center gap-1 font-semibold transition-colors active:scale-95',
          tablet ? 'mx-2 rounded-2xl py-2.5 text-[11px]' : 'min-h-[56px] py-1.5 text-[11px]',
          tablet ? (att ? 'bg-white/[0.12] text-white' : 'text-white/65 hover:bg-white/6') : att ? 'text-profondo' : 'text-profondo/45'
        )}
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-lg" style={att ? { background: accento(s.percorso.split('?')[0]), color: '#0B2C39' } : undefined}>
          <s.icona className="h-[19px] w-[19px]" strokeWidth={att ? 2.4 : 2} />
          {s.badge && <Bollino n={conta[s.badge]} />}
        </span>
        <span className="max-w-full truncate px-0.5">{s.etichetta}</span>
      </Link>
    )
  }
  const telefono = schede.slice(0, 4)
  const tablet = schede.slice(0, 6)
  return (
    <>
      {/* Tablet: colonna stretta */}
      <nav aria-label="Schede rapide" className="shell-side hidden w-[88px] shrink-0 flex-col bg-profondo pb-[env(safe-area-inset-bottom)] md:flex lg:hidden">
        <div className="grid h-16 place-items-center border-b border-white/10"><Logo compatto /></div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-3">{tablet.map((s) => voce(s, true))}</div>
        <button type="button" onClick={onAltro} className="mx-2 mb-3 flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-semibold text-white/65 hover:bg-white/6">
          <Menu className="h-[19px] w-[19px]" /> Menu
        </button>
      </nav>
      {/* Telefono: barra in basso */}
      <nav aria-label="Schede rapide" className="barra-basso fixed inset-x-0 bottom-0 z-30 border-t border-calce-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-12px_rgba(15,59,76,0.35)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${telefono.length + 1}, minmax(0, 1fr))` }}>
          {telefono.map((s) => voce(s, false))}
          <button type="button" onClick={onAltro} className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-profondo/45">
            <span className="grid h-7 w-7 place-items-center"><Menu className="h-[19px] w-[19px]" /></span> Altro
          </button>
        </div>
      </nav>
    </>
  )
}
