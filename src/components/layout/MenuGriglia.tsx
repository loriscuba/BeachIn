import { useEffect, useRef, useState, type PointerEvent as EventoTocco } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Lock, Pencil, Star, X } from 'lucide-react'
import { accento } from '@/config/accenti'
import type { LucideIcon } from 'lucide-react'
import { useConteggiNav, useVociMenu } from '@/hooks/useNavStaff'
import type { SottoVoce } from '@/config/navigazione'
import { cn } from '@/lib/cn'
import { POSTI_PREFERITI, useBarraPreferiti } from '@/hooks/useBarraPreferiti'

interface Tessera { percorso: string; etichetta: string; icona: LucideIcon; colore: string; badge?: SottoVoce['badge'] }

/**
 * Telefono: "Altro" apre tutte le sezioni come pulsanti con icona come quelli della barra in basso, divisi per area,
 * al posto del menu a elenco. Pannello dal basso; si chiude toccando fuori, con la X o scegliendo una sezione.
 * "Personalizza" (matita): si tiene premuta una sezione e la si trascina su uno dei 3 posti della barra in basso
 * (oppure la si tocca e poi si tocca il posto); il primo posto (Home o prima scheda del ruolo) resta fisso.
 */
export function MenuGriglia({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const voci = useVociMenu()
  const conta = useConteggiNav()
  const { pathname, search } = useLocation()
  // cambio pagina (anche dal tasto indietro) = pannello chiuso
  useEffect(() => { onChiudi() }, [pathname, search]) // eslint-disable-line react-hooks/exhaustive-deps
  const barra = useBarraPreferiti()
  const [modifica, setModifica] = useState(false)
  const [scelta, setScelta] = useState<string | null>(null)
  const [trascina, setTrascina] = useState<{ percorso: string; x: number; y: number; posto: number | null } | null>(null)
  useEffect(() => { if (!aperto) { setModifica(false); setScelta(null) } }, [aperto])
  const premuto = useRef<{ percorso: string; x: number; y: number; timer: number; trascinato: boolean } | null>(null)
  // mentre si trascina la pagina non scorre (iPhone/Android: touchmove non passivo)
  const inTrascina = !!trascina
  useEffect(() => {
    if (!inTrascina) return
    const ferma = (e: TouchEvent) => e.preventDefault()
    window.addEventListener('touchmove', ferma, { passive: false })
    return () => window.removeEventListener('touchmove', ferma)
  }, [inTrascina])
  const postoSotto = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-posto]')
    return el ? Number(el.getAttribute('data-posto')) : null
  }
  const giu = (percorso: string, e: EventoTocco) => {
    const p = { percorso, x: e.clientX, y: e.clientY, trascinato: false, timer: 0 }
    // tenuto premuto ~1/4 di secondo senza muoversi = si comincia a trascinare
    p.timer = window.setTimeout(() => { p.trascinato = true; setTrascina({ percorso, x: p.x, y: p.y, posto: null }); navigator.vibrate?.(15) }, 250)
    premuto.current = p
    const muovi = (ev: PointerEvent) => {
      if (!p.trascinato) { if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) > 8) fine(); return } // sta scorrendo
      setTrascina({ percorso, x: ev.clientX, y: ev.clientY, posto: postoSotto(ev.clientX, ev.clientY) })
    }
    const su = (ev: PointerEvent) => {
      if (p.trascinato && ev.type === 'pointerup') { const n = postoSotto(ev.clientX, ev.clientY); if (n !== null) { barra.metti(n, percorso); setScelta(null) } }
      fine()
    }
    const fine = () => {
      clearTimeout(p.timer)
      window.removeEventListener('pointermove', muovi); window.removeEventListener('pointerup', su); window.removeEventListener('pointercancel', su)
      setTrascina(null)
    }
    window.addEventListener('pointermove', muovi); window.addEventListener('pointerup', su); window.addEventListener('pointercancel', su)
  }
  const tocca = (percorso: string) => {
    if (premuto.current?.trascinato) return // fine di un trascinamento, non un tocco
    setScelta((x) => (x === percorso ? null : percorso))
  }
  const nellaBarra = new Set([barra.fisso?.percorso, ...barra.posti.map((v) => v.percorso)])
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
          <p className="font-display text-xl font-semibold text-white">{modifica ? 'La tua barra' : 'Tutte le sezioni'}</p>
          <div className="-mr-2 flex items-center gap-2">
            {modifica ? (
              <button type="button" onClick={() => { setModifica(false); setScelta(null) }} className="flex h-10 items-center gap-1.5 rounded-full bg-acqua px-4 text-sm font-semibold text-profondo">
                <Check className="h-4 w-4" /> Fatto
              </button>
            ) : (
              <button type="button" onClick={() => setModifica(true)} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white" aria-label="Personalizza la barra in basso">
                <Pencil className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={onChiudi} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/10" aria-label="Chiudi">
              <X className="h-6 w-6" />
            </button>
          </div>
          </div>
        </div>
        {modifica && (
          <div className="shrink-0 px-4 pb-3">
            <p className="mb-2 px-1 text-xs text-white/60">
              {scelta ? 'Ora tocca il posto della barra dove metterla.' : 'Tieni premuta una sezione e trascinala in un posto (o toccala e poi tocca il posto). Il primo resta fisso.'}
            </p>
            <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-white p-1.5">
              {barra.fisso && (
                <div className="relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl bg-calce-100 text-[11px] font-semibold text-profondo/50">
                  <barra.fisso.icona className="h-[19px] w-[19px]" />
                  <span className="max-w-full truncate px-0.5">{barra.fisso.etichetta}</span>
                  <Lock className="absolute right-1.5 top-1.5 h-3 w-3" aria-label="fisso" />
                </div>
              )}
              {Array.from({ length: POSTI_PREFERITI }, (_, i) => {
                const v = barra.posti[i]
                const sopra = trascina?.posto === i
                return (
                  <button key={i} type="button" data-posto={i}
                    onClick={() => { if (scelta) { barra.metti(i, scelta); setScelta(null) } }}
                    className={cn('flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-[11px] font-semibold text-profondo transition',
                      sopra ? 'scale-105 border-tenda bg-tenda/25' : scelta || trascina ? 'border-cabina/60 bg-cabina/10' : 'border-transparent')}>
                    {v ? <v.icona className="h-[19px] w-[19px]" /> : <span className="h-[19px]" />}
                    <span className="max-w-full truncate px-0.5">{v?.etichetta ?? 'Vuoto'}</span>
                  </button>
                )
              })}
            </div>
            {barra.personalizzata && (
              <button type="button" onClick={barra.ripristina} className="mt-2 px-1 text-xs font-semibold text-white/60 underline">Torna alla barra del ruolo</button>
            )}
          </div>
        )}
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
                  const classe = cn('relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-center text-[11px] font-semibold leading-tight transition active:scale-95',
                    att ? 'bg-white/[0.09] text-white' : 'text-white/65 hover:bg-white/[0.05]')
                  const contenuto = (
                    <>
                      {/* come la barra in basso: icona a linee, colorata solo sulla sezione aperta */}
                      <span className="relative grid h-7 w-7 place-items-center rounded-lg" style={att ? { background: t.colore, color: '#0B2C39' } : undefined}>
                        <t.icona className="h-[19px] w-[19px]" strokeWidth={att ? 2.4 : 2} />
                        {n > 0 && <span className="num absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-content-center rounded-full bg-boa px-1 text-[10px] font-bold leading-none text-white">{n > 99 ? '99+' : n}</span>}
                      </span>
                      <span className="line-clamp-2 max-w-full">{t.etichetta}</span>
                    </>
                  )
                  if (modifica) {
                    return (
                      <button key={t.percorso} type="button" onPointerDown={(e) => giu(t.percorso, e)} onClick={() => tocca(t.percorso)}
                        onContextMenu={(e) => e.preventDefault()}
                        className={cn(classe, 'select-none [-webkit-touch-callout:none]', scelta === t.percorso && 'bg-tenda/20 text-white ring-2 ring-tenda', trascina?.percorso === t.percorso && 'opacity-40')}>
                        {nellaBarra.has(t.percorso) && <Star className="absolute right-1.5 top-1.5 h-3 w-3 fill-tenda text-tenda" aria-label="nella barra" />}
                        {contenuto}
                      </button>
                    )
                  }
                  return (
                    <Link
                      key={t.percorso}
                      to={t.percorso}
                      onClick={onChiudi}
                      className={classe}
                    >
                      {contenuto}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
      {trascina && (() => {
        const t = barra.disponibili.get(trascina.percorso)
        return t && (
          <div className="pointer-events-none fixed z-50 flex h-16 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-xl bg-white text-[11px] font-semibold text-profondo shadow-2xl ring-2 ring-tenda"
            style={{ left: trascina.x, top: trascina.y }}>
            <t.icona className="h-[19px] w-[19px]" /><span className="max-w-full truncate px-1">{t.etichetta}</span>
          </div>
        )
      })()}
    </div>
  )
}
