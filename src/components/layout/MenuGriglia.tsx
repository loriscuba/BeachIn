import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { accento } from '@/config/accenti'
import type { LucideIcon } from 'lucide-react'
import { useConteggiNav, useVociMenu } from '@/hooks/useNavStaff'
import type { SottoVoce } from '@/config/navigazione'
import { cn } from '@/lib/cn'

interface Tessera { percorso: string; etichetta: string; icona: LucideIcon; colore: string; badge?: SottoVoce['badge'] }

/**
 * Telefono: "Altro" apre tutte le sezioni come pulsanti grandi con icona (come la barra in basso), divisi per area,
 * al posto del menu a elenco. Pannello dal basso; si chiude toccando fuori, con la X o scegliendo una sezione.
 */
export function MenuGriglia({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const voci = useVociMenu()
  const conta = useConteggiNav()
  const { pathname, search } = useLocation()
  // cambio pagina (anche dal tasto indietro) = pannello chiuso
  useEffect(() => { onChiudi() }, [pathname, search]) // eslint-disable-line react-hooks/exhaustive-deps

  // sezioni senza sottomenu insieme in "Generale", le altre ognuna col suo gruppo
  const singole: Tessera[] = voci.filter((v) => !v.figli).map((v) => ({ percorso: v.percorso, etichetta: v.etichetta, icona: v.icona, colore: accento(v.percorso) }))
  const gruppi: { titolo: string; tessere: Tessera[] }[] = [
    ...(singole.length ? [{ titolo: 'Generale', tessere: singole }] : []),
    ...voci.filter((v) => v.figli).map((v) => ({
      titolo: v.etichetta,
      tessere: v.figli!.map((f) => ({ percorso: f.percorso, etichetta: f.etichetta, icona: v.icona, colore: accento(v.percorso), badge: f.badge })),
    })),
  ]
  const qui = pathname + search

  return (
    <div className={cn('fixed inset-0 z-40 md:hidden', !aperto && 'pointer-events-none')} aria-hidden={!aperto}>
      <div className={cn('absolute inset-0 bg-profondo-900/50 transition-opacity duration-200', aperto ? 'opacity-100' : 'opacity-0')} onClick={onChiudi} />
      <div
        role="dialog"
        aria-label="Tutte le sezioni"
        className={cn(
          'shell-side absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-profondo pb-[env(safe-area-inset-bottom)] text-white shadow-2xl transition-transform duration-200',
          aperto ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <p className="font-display text-xl font-semibold text-white">Tutte le sezioni</p>
          <button type="button" onClick={onChiudi} className="grid h-10 w-10 place-items-center rounded-full text-white/70 hover:bg-white/10" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-5">
          {gruppi.map((g) => (
            <section key={g.titolo}>
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">{g.titolo}</p>
              <div className="grid grid-cols-3 gap-2">
                {g.tessere.map((t) => {
                  const att = qui === t.percorso || (!t.percorso.includes('?') && pathname === t.percorso)
                  const n = t.badge ? conta[t.badge] : 0
                  return (
                    <Link
                      key={t.percorso}
                      to={t.percorso}
                      onClick={onChiudi}
                      className={cn('relative flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3 text-center text-[12px] font-semibold leading-tight transition active:scale-95',
                        att ? 'bg-white/[0.12] text-white' : 'bg-white/[0.05] text-white/80')}
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: t.colore, color: '#0B2C39' }}>
                        <t.icona className="h-5 w-5" strokeWidth={2.2} />
                      </span>
                      <span className="line-clamp-2">{t.etichetta}</span>
                      {n > 0 && <span className="num absolute right-2 top-2 grid h-5 min-w-5 place-content-center rounded-full bg-boa px-1.5 text-[11px] font-bold text-white">{n > 99 ? '99+' : n}</span>}
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
