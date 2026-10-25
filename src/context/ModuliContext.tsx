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
const CHIAVE_SALA = 'beachin.moduli.sala'
const CHIAVE_BAR_TAVOLO = 'beachin.moduli.bartavolo'

function carica(): ModuloId[] {
  try {
    const raw = localStorage.getItem(CHIAVE)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        // Comande ristorante (ott 2026) è nato dopo: chi aveva già il Ristorante lo trova attivo una volta, poi decide lui
        if (!localStorage.getItem(CHIAVE_SALA)) {
          localStorage.setItem(CHIAVE_SALA, '1')
          if (arr.includes('ristorante') && !arr.includes('sala')) arr.push('sala')
        }
        // Bar al tavolo (ott 2026): attivo una volta per chi ha già Comande ristorante e Bar
        if (!localStorage.getItem(CHIAVE_BAR_TAVOLO)) {
          localStorage.setItem(CHIAVE_BAR_TAVOLO, '1')
          if (arr.includes('sala') && arr.includes('bar') && !arr.includes('bar-tavolo')) arr.push('bar-tavolo')
        }
        return arr as ModuloId[]
      }
    }
  } catch {
    /* localStorage non disponibile: si parte dal piano di default */
  }
  return PIANI[PIANO_DEFAULT].moduli
}

/**
 * Unisce i moduli richiesti con i core (sempre attivi), senza duplicati.
 * Comande usa il listino del Bar: con Comande attivo, il Bar resta attivo
 * (altrimenti dal menu sparivano Listino e Conti lasciando solo Comande).
 * Allo stesso modo Comande ristorante usa il menu del Ristorante, e Bar al tavolo usa entrambi.
 */
function conCore(moduli: ModuloId[]): ModuloId[] {
  const dip: ModuloId[] = [
    ...(moduli.includes('comande') ? ['bar' as const] : []),
    ...(moduli.includes('sala') ? ['ristorante' as const] : []),
    ...(moduli.includes('bar-tavolo') ? ['sala' as const, 'ristorante' as const, 'bar' as const] : []),
  ]
  return Array.from(new Set<ModuloId>([...MODULI_CORE, ...moduli, ...dip]))
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
    // spegnere il Bar spegne anche Comande, che ne usa il listino
    (id: ModuloId) => salva(attivi.filter((m) => m !== id && !(id === 'bar' && m === 'comande') && !(id === 'ristorante' && m === 'sala')
      && !(['bar', 'sala', 'ristorante'].includes(id) && m === 'bar-tavolo'))),
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
