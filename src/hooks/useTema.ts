import { useSyncExternalStore } from 'react'

/** Tema dell'app staff. Di base segue il telefono/computer (chiaro o scuro); dal profilo si può fissare. Ricordato nel browser. */
export type Tema = 'chiaro' | 'scuro'
export type SceltaTema = Tema | 'auto'

const CHIAVE = 'beachin.tema.v2'
const ascoltatori = new Set<() => void>()
const avvisa = () => ascoltatori.forEach((f) => f())

function leggi(): SceltaTema {
  try { const v = localStorage.getItem(CHIAVE); return v === 'chiaro' || v === 'scuro' ? v : 'auto' } catch { return 'auto' }
}

const sistema = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
sistema?.addEventListener?.('change', avvisa)

let scelta: SceltaTema = leggi()

export function impostaTema(t: SceltaTema) {
  scelta = t
  try { if (t === 'auto') localStorage.removeItem(CHIAVE); else localStorage.setItem(CHIAVE, t) } catch { /* storage non disponibile */ }
  avvisa()
}

const iscrivi = (f: () => void) => { ascoltatori.add(f); return () => { ascoltatori.delete(f) } }

/** Tema in uso (scelta fissata, oppure quello del sistema) e cambio rapido chiaro↔scuro. */
export function useTema(): [Tema, () => void] {
  const t = useSyncExternalStore(iscrivi, (): Tema => (scelta !== 'auto' ? scelta : sistema?.matches ? 'scuro' : 'chiaro'))
  return [t, () => impostaTema(t === 'scuro' ? 'chiaro' : 'scuro')]
}

/** Scelta dell'utente: automatico (come il sistema), chiaro o scuro. */
export function useSceltaTema(): [SceltaTema, (t: SceltaTema) => void] {
  return [useSyncExternalStore(iscrivi, () => scelta), impostaTema]
}
