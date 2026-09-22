/**
 * ModuliContext — quali moduli sono attivi per il cliente corrente.
 *
 * Oggi lo stato è in memoria (persistito in localStorage per comodità della
 * demo). In una fase successiva questo insieme arriverà dal DB come campo
 * per-cliente (entitlements): cambierà solo la sorgente, non le pagine.
 *
 * I moduli CORE sono sempre attivi. Gli altri si attivano/disattivano dal vivo
 * (utile per mostrare l'upsell al cliente) o applicando un piano.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { MODULI_CORE, PIANI, PIANO_DEFAULT, type ModuloId } from '@/config/moduli'

const CHIAVE = 'beachin.moduli.v1'

function carica(): ModuloId[] {
  try {
    const raw = localStorage.getItem(CHIAVE)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr as ModuloId[]
    }
  } catch {
    /* localStorage non disponibile: si parte dal piano di default */
  }
  return PIANI[PIANO_DEFAULT].moduli
}

/** Unisce i moduli richiesti con i core (sempre attivi), senza duplicati. */
function conCore(moduli: ModuloId[]): ModuloId[] {
  return Array.from(new Set<ModuloId>([...MODULI_CORE, ...moduli]))
}

interface ModuliValue {
  attivi: ModuloId[]
  pianoCorrente: string | null
  moduloAttivo: (id: ModuloId) => boolean
  attiva: (id: ModuloId) => void
  disattiva: (id: ModuloId) => void
  toggle: (id: ModuloId) => void
  applicaPiano: (pianoId: string) => void
}

const ModuliContext = createContext<ModuliValue | null>(null)

export function ModuliProvider({ children }: { children: ReactNode }) {
  const [attivi, setAttivi] = useState<ModuloId[]>(() => conCore(carica()))

  const salva = useCallback((next: ModuloId[]) => {
    const v = conCore(next)
    setAttivi(v)
    try { localStorage.setItem(CHIAVE, JSON.stringify(v)) } catch { /* no-op */ }
  }, [])

  const moduloAttivo = useCallback((id: ModuloId) => attivi.includes(id), [attivi])

  const attiva = useCallback((id: ModuloId) => salva([...attivi, id]), [attivi, salva])
  const disattiva = useCallback(
    (id: ModuloId) => salva(attivi.filter((m) => m !== id)),
    [attivi, salva]
  )
  const toggle = useCallback(
    (id: ModuloId) => (attivi.includes(id) ? disattiva(id) : attiva(id)),
    [attivi, attiva, disattiva]
  )
  const applicaPiano = useCallback(
    (pianoId: string) => { const p = PIANI[pianoId]; if (p) salva(p.moduli) },
    [salva]
  )

  // Il piano corrente è quello i cui moduli coincidono esattamente con gli attivi.
  const pianoCorrente = useMemo(() => {
    const set = new Set(attivi)
    const match = Object.values(PIANI).find(
      (p) => {
        const pset = new Set(conCore(p.moduli))
        return pset.size === set.size && [...pset].every((m) => set.has(m))
      }
    )
    return match ? match.id : null
  }, [attivi])

  const value = useMemo<ModuliValue>(
    () => ({ attivi, pianoCorrente, moduloAttivo, attiva, disattiva, toggle, applicaPiano }),
    [attivi, pianoCorrente, moduloAttivo, attiva, disattiva, toggle, applicaPiano]
  )

  return <ModuliContext.Provider value={value}>{children}</ModuliContext.Provider>
}

export function useModuli(): ModuliValue {
  const ctx = useContext(ModuliContext)
  if (!ctx) throw new Error('useModuli deve stare dentro <ModuliProvider>')
  return ctx
}
