import { Play, Square, RotateCcw, Umbrella, Coffee, Globe, Sparkles, X } from 'lucide-react'
import { useDemoData, type TipoAttivita } from '@/context/DemoDataContext'
import { euro } from '@/lib/formatters'
import { cn } from '@/lib/cn'

const iconaAttivita: Record<TipoAttivita, typeof Umbrella> = {
  postazione: Umbrella, bar: Coffee, sito: Globe, info: Sparkles,
}
const coloreAttivita: Record<TipoAttivita, string> = {
  postazione: 'text-cabina', bar: 'text-tenda', sito: 'text-acqua', info: 'text-profondo/50',
}

/** Overlay della demo guidata: progresso, incasso simulato e feed attività. */
export function DemoPlayer() {
  const { demoInCorso, demoProgresso, incassoDemo, attivita, avviaDemo, fermaDemo, reset } = useDemoData()

  if (!demoInCorso && attivita.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,340px)] overflow-hidden rounded-card border border-calce-200 bg-white shadow-pop anim-pop">
      {/* Testata */}
      <div className="flex items-center justify-between gap-2 bg-profondo px-3 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-tenda" />
          <span className="text-sm font-semibold">Demo guidata</span>
          {demoInCorso && <span className="text-xs text-white/60">giornata in corso…</span>}
        </div>
        {!demoInCorso && (
          <button onClick={reset} className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Chiudi">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Incasso simulato + progresso */}
      <div className="border-b border-calce-200 px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-profondo/55">Incasso simulato oggi</span>
          <span className="num text-lg font-bold text-profondo">{euro(incassoDemo)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-calce-200">
          <div className="h-full rounded-full bg-cabina transition-all duration-500" style={{ width: `${demoProgresso * 100}%` }} />
        </div>
      </div>

      {/* Feed attività */}
      <ul className="max-h-44 space-y-1 overflow-y-auto px-3 py-2">
        {attivita.map((a) => {
          const Icona = iconaAttivita[a.tipo]
          return (
            <li key={a.id} className="flex items-start gap-2 text-xs text-profondo/80">
              <Icona className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', coloreAttivita[a.tipo])} />
              <span>{a.testo}</span>
            </li>
          )
        })}
      </ul>

      {/* Controlli */}
      <div className="flex gap-2 border-t border-calce-200 p-2.5">
        {demoInCorso ? (
          <button onClick={fermaDemo} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-boa px-3 py-2 text-sm font-medium text-white hover:bg-boa/90">
            <Square className="h-4 w-4" /> Ferma
          </button>
        ) : (
          <>
            <button onClick={avviaDemo} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-profondo px-3 py-2 text-sm font-medium text-white hover:bg-profondo-600">
              <RotateCcw className="h-4 w-4" /> Riavvia
            </button>
            <button onClick={reset} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-calce-200 px-3 py-2 text-sm font-medium text-profondo hover:bg-calce">
              Chiudi
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Pulsante di avvio, da mettere nella topbar. */
export function BottoneDemo() {
  const { demoInCorso, avviaDemo, fermaDemo } = useDemoData()
  return (
    <button
      onClick={demoInCorso ? fermaDemo : avviaDemo}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
        demoInCorso ? 'bg-boa text-white hover:bg-boa/90' : 'bg-profondo text-white hover:bg-profondo-600'
      )}
      title="Simula una giornata tipo in ~90 secondi"
    >
      {demoInCorso ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{demoInCorso ? 'Ferma demo' : 'Avvia demo'}</span>
    </button>
  )
}
