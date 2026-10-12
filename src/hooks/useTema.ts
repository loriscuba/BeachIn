import { useSyncExternalStore } from 'react'

/** Tema del gestionale (per ora applicato al solo Cruscotto). Ricordato nel browser. */
export type Tema = 'chiaro' | 'scuro'

const CHIAVE = 'beachin.tema.v1'
const ascoltatori = new Set<() => void>()

function leggi(): Tema {
  try { return localStorage.getItem(CHIAVE) === 'chiaro' ? 'chiaro' : 'scuro' } catch { return 'scuro' }
}

let tema: Tema = leggi()

export function impostaTema(t: Tema) {
  tema = t
  try { localStorage.setItem(CHIAVE, t) } catch { /* storage non disponibile */ }
  ascoltatori.forEach((f) => f())
}

export function useTema(): [Tema, () => void] {
  const t = useSyncExternalStore(
    (f) => { ascoltatori.add(f); return () => ascoltatori.delete(f) },
    () => tema,
  )
  return [t, () => impostaTema(t === 'scuro' ? 'chiaro' : 'scuro')]
}
