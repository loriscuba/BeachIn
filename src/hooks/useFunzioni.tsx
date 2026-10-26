/**
 * Funzionalità dei moduli (schede `?tab=`): attive per il cliente (Impostazioni → Moduli) **e** permesse al ruolo.
 * Le pagine filtrano le loro schede con `useSchede`; `SchedaProtetta` mette in sola lettura la scheda con permesso 1
 * quando il resto del modulo è modificabile (se tutto il modulo è in lettura ci pensa già `ModuloGate`).
 */
import type { ReactNode } from 'react'
import { useModuli } from '@/context/ModuliContext'
import { useSessione } from '@/context/SessioneContext'
import { idFunzione, type ModuloId } from '@/config/moduli'
import { sezioneDi, type Livello } from '@/lib/permessi'
import { SolaLettura } from '@/components/SolaLettura'
import { AccessoNegato } from '@/components/AccessoNegato'

export function useFunzioni() {
  const { funzioneAttiva } = useModuli()
  const { livelloFunzione } = useSessione()
  const livello = (id: string): Livello => (funzioneAttiva(id) ? livelloFunzione(id) : 0)
  return { livello, ok: (id: string, minimo: Livello = 1) => livello(id) >= minimo }
}

/** Schede visibili di una pagina e quella aperta (la richiesta se ammessa, altrimenti la prima visibile). */
export function useSchede<T extends string>(modulo: ModuloId, schede: readonly T[], richiesta: string | null, minimo: Livello = 1) {
  const { livello } = useFunzioni()
  const visibili = schede.filter((s) => livello(idFunzione(modulo, s)) >= minimo)
  const tab = visibili.find((s) => s === richiesta) ?? visibili[0]
  return { visibili, tab: tab as T | undefined, livello: tab ? livello(idFunzione(modulo, tab)) : (0 as Livello) }
}

/** Contenuto della scheda: nessuna scheda permessa → accesso negato; permesso 1 su modulo modificabile → sola lettura. */
export function SchedaProtetta({ modulo, livello, children }: { modulo: ModuloId; livello: Livello; children: ReactNode }) {
  const { livello: livModulo } = useSessione()
  if (livello === 0) return <AccessoNegato />
  if (livello === 1 && livModulo(sezioneDi(modulo)) >= 2) return <SolaLettura>{children}</SolaLettura>
  return <>{children}</>
}
