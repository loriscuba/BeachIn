import { LogOut, Moon } from 'lucide-react'
import { useTema } from '@/hooks/useTema'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import type { Profilo } from '@/lib/permessi'

/** Finestra dell'utente collegato (tocco sulla foto in alto a sinistra): nome, ruolo, tema chiaro/scuro ed Esci. */
export function SchedaUtente({ profilo, aperta, onChiudi, onEsci }: { profilo: Profilo; aperta: boolean; onChiudi: () => void; onEsci: () => void }) {
  const [tema, cambiaTema] = useTema()
  const scuro = tema === 'scuro'
  return (
    <Modal aperto={aperta} onChiudi={onChiudi} titolo="Il tuo profilo" larghezza="max-w-sm">
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <Avatar nome={profilo.nome} foto={profilo.foto} className="h-20 w-20 text-xl" />
        <p className="mt-1 font-display text-xl font-semibold text-profondo">{profilo.nome}</p>
        <p className="text-sm text-profondo/60">{profilo.ruolo}</p>
        <div className="mt-4 flex w-full items-center gap-3 rounded-xl border border-calce-200 px-3 py-2.5 text-left text-sm text-profondo">
          <Moon className="h-4 w-4 text-cabina" />
          <span className="flex-1 font-medium">Tema scuro</span>
          <button
            role="switch"
            aria-checked={scuro}
            aria-label="Tema scuro"
            onClick={cambiaTema}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${scuro ? 'bg-cabina' : 'bg-calce-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${scuro ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`} />
          </button>
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
