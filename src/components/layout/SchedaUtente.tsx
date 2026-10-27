import { LogOut } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import type { Profilo } from '@/lib/permessi'

/** Finestra dell'utente collegato (tocco sulla foto in alto a sinistra). Per ora: nome, ruolo ed Esci. */
export function SchedaUtente({ profilo, aperta, onChiudi, onEsci }: { profilo: Profilo; aperta: boolean; onChiudi: () => void; onEsci: () => void }) {
  return (
    <Modal aperto={aperta} onChiudi={onChiudi} titolo="Il tuo profilo" larghezza="max-w-sm">
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <Avatar nome={profilo.nome} foto={profilo.foto} className="h-20 w-20 text-xl" />
        <p className="mt-1 font-display text-xl font-semibold text-profondo">{profilo.nome}</p>
        <p className="text-sm text-profondo/60">{profilo.ruolo}</p>
        <button
          onClick={() => { onChiudi(); onEsci() }}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-boa/40 font-semibold text-boa hover:bg-boa/10"
        >
          <LogOut className="h-4 w-4" /> Esci
        </button>
      </div>
    </Modal>
  )
}
