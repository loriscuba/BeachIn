import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Lock, SlidersHorizontal, X } from 'lucide-react'
import { MODULI, funzioniDi, type ModuloId } from '@/config/moduli'
import { navigazione, gruppiNav, type VoceNav } from '@/config/navigazione'
import { useModuli } from '@/context/ModuliContext'
import { useSessione } from '@/context/SessioneContext'
import { cn } from '@/lib/cn'

type Area = VoceNav['gruppo']

/** Moduli attivabili di un'area del menu (voci e sottovoci, senza i core). L'Assistente vocale sta col Ristorante. */
export function moduliDiArea(area: Area): ModuloId[] {
  const ids = navigazione
    .filter((v) => v.gruppo === area)
    .flatMap((v) => [v.modulo, ...(v.figli ?? []).map((f) => f.modulo), ...(v.modulo === 'ristorante' ? ['assistente-vocale' as const] : [])])
  return Array.from(new Set(ids)).filter((m) => !MODULI[m].core)
}

/** Aree con almeno un modulo attivabile. */
export const areeConModuli = gruppiNav.filter((a) => moduliDiArea(a).length > 0)

/** Il pulsante è solo per l'amministratore (lo stesso che gestisce Impostazioni → Moduli). */
export function usePuoModuliAlVolo() {
  const { profilo } = useSessione()
  return !!profilo?.amministratore
}

/**
 * Pulsante (solo amministratore) accanto al titolo di una sezione del menu: apre l'elenco dei moduli di quella
 * sezione con interruttori per attivarli/disattivarli al volo, e le loro funzionalità. Stesso stato di
 * Impostazioni → Moduli (vale per tutti gli utenti e dispositivi).
 */
export function PulsanteModuli({ aree, scuro = true, className }: { aree: Area[]; scuro?: boolean; className?: string }) {
  const puo = usePuoModuliAlVolo()
  const [aperto, setAperto] = useState(false)
  const valide = aree.filter((a) => moduliDiArea(a).length > 0)
  if (!puo || valide.length === 0) return null
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setAperto(true) }}
        aria-label="Mostra o nascondi moduli"
        title="Mostra o nascondi moduli"
        className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors',
          scuro ? 'text-white/45 hover:bg-white/10 hover:text-white' : 'text-profondo/50 hover:bg-calce-200', className)}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>
      {aperto && createPortal(<FinestraModuli aree={valide} onChiudi={() => setAperto(false)} />, document.body)}
    </>
  )
}

function FinestraModuli({ aree, onChiudi }: { aree: Area[]; onChiudi: () => void }) {
  const { moduloAttivo, toggle, funzioneAttiva, toggleFunzione } = useModuli()
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-label="Moduli della sezione">
      <div className="absolute inset-0 bg-profondo-900/50" onClick={onChiudi} />
      <div className="relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] text-profondo shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-calce-200 px-5 py-3">
          <div>
            <p className="font-display text-lg font-semibold">Moduli</p>
            <p className="text-xs text-profondo/55">Attiva o nascondi al volo. Vale per tutti gli utenti.</p>
          </div>
          <button type="button" onClick={onChiudi} className="-mr-2 grid h-10 w-10 place-items-center rounded-full hover:bg-calce-100" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-3">
          {aree.map((a) => (
            <section key={a}>
              {aree.length > 1 && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{a}</p>}
              <ul className="divide-y divide-calce-200">
                {moduliDiArea(a).map((id) => {
                  const m = MODULI[id]
                  const attivo = moduloAttivo(id)
                  const funzioni = funzioniDi(id)
                  return (
                    <li key={id} className="py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{m.nome}</span>
                          <span className="block truncate text-xs text-profondo/55">{m.sottotitolo}</span>
                        </span>
                        <Interruttore attivo={attivo} onClick={() => toggle(id)} si="Visibile" no="Nascosto" />
                      </div>
                      {attivo && funzioni.length > 0 && (
                        <ul className="mt-1.5 ml-2 space-y-0.5 border-l border-calce-200 pl-3">
                          {funzioni.map((x) => (
                            <li key={x.id} className="flex items-center justify-between gap-3 py-0.5">
                              <span className="text-sm">{x.nome}</span>
                              <Interruttore attivo={funzioneAttiva(x.id)} onClick={() => toggleFunzione(x.id)} si="Sì" no="No" piccolo />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function Interruttore({ attivo, onClick, si, no, piccolo }: { attivo: boolean; onClick: () => void; si: string; no: string; piccolo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={attivo}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition-colors',
        piccolo ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        attivo ? 'bg-acqua/25 text-profondo hover:bg-acqua/40' : 'bg-calce-200 text-profondo/60 hover:bg-calce-300'
      )}
    >
      {attivo ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      {attivo ? si : no}
    </button>
  )
}
