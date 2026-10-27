import { LogOut, Moon } from 'lucide-react'
import { useSceltaTema, type SceltaTema } from '@/hooks/useTema'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import type { Profilo } from '@/lib/permessi'

const SCELTE: [SceltaTema, string][] = [['auto', 'Automatico'], ['chiaro', 'Chiaro'], ['scuro', 'Scuro']]

/** Finestra dell'utente collegato (tocco sulla foto in alto a sinistra): nome, ruolo, tema (automatico come il telefono, chiaro o scuro) ed Esci. */
export function SchedaUtente({ profilo, aperta, onChiudi, onEsci }: { profilo: Profilo; aperta: boolean; onChiudi: () => void; onEsci: () => void }) {
  const [scelta, impostaScelta] = useSceltaTema()
  return (
    <Modal aperto={aperta} onChiudi={onChiudi} titolo="Il tuo profilo" larghezza="max-w-sm">
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <Avatar nome={profilo.nome} foto={profilo.foto} className="h-20 w-20 text-xl" />
        <p className="mt-1 font-display text-xl font-semibold text-profondo">{profilo.nome}</p>
        <p className="text-sm text-profondo/60">{profilo.ruolo}</p>
        <div className="mt-4 w-full text-left">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-profondo/55"><Moon className="h-3.5 w-3.5" /> Tema</p>
          <div className="grid grid-cols-3 rounded-xl bg-calce p-1 text-[13px] font-semibold" role="radiogroup" aria-label="Tema">
            {SCELTE.map(([id, etichetta]) => (
              <button
                key={id}
                role="radio"
                aria-checked={scelta === id}
                onClick={() => impostaScelta(id)}
                className={`rounded-lg py-2 ${scelta === id ? 'bg-white text-profondo shadow-sm' : 'text-profondo/60'}`}
              >
                {etichetta}
              </button>
            ))}
          </div>
          {scelta === 'auto' && <p className="mt-1.5 text-xs text-profondo/55">Chiaro o scuro come il telefono.</p>}
        </div>
        <button
          onClick={() => { onChiudi(); onEsci() }}
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-boa/40 font-semibold text-boa hover:bg-boa/10"
        >
          <LogOut className="h-4 w-4" /> Esci
        </button>
      </div>
    </Modal>
  )
}
