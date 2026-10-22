import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { useSessione } from '@/context/SessioneContext'

/** Sezione non consentita dal ruolo dell'utente collegato. */
export function AccessoNegato() {
  const { profilo } = useSessione()
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-6 text-center text-profondo shadow-sm">
      <ShieldOff className="mx-auto h-8 w-8 text-boa" />
      <h1 className="mt-3 font-display text-xl font-semibold">Accesso non consentito</h1>
      <p className="mt-1 text-sm text-profondo/60">
        Il ruolo {profilo ? <b>{profilo.ruolo}</b> : 'attuale'} non può aprire questa sezione. Chiedi all'amministratore di abilitarla.
      </p>
      <Link to="/" className="mt-4 inline-block rounded-full bg-cabina px-4 py-2 text-sm font-semibold text-white hover:bg-profondo">Torna alla panoramica</Link>
    </div>
  )
}
