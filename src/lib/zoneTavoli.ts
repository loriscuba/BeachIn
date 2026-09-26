import type { Tavolo } from '@/data/types'

type Zona = Tavolo['zona']

/** Pianta del locale (in %): Veranda + Interno a sinistra, Ciringuito a tutta altezza a destra. */
export const ZONE: { zona: Zona; nome: string; x0: number; y0: number; x1: number; y1: number; colore: string }[] = [
  { zona: 'veranda', nome: 'Ristorante Veranda', x0: 0, y0: 0, x1: 50, y1: 70, colore: 'bg-acqua/15' },
  { zona: 'interno', nome: 'Ristorante Interno', x0: 0, y0: 70, x1: 50, y1: 100, colore: 'bg-tenda/10' },
  { zona: 'ciringuito', nome: 'Ciringuito', x0: 50, y0: 0, x1: 100, y1: 100, colore: 'bg-cabina/10' },
]
export const nomeZona = (z: Zona) => ZONE.find((r) => r.zona === z)!.nome

export const zonaDaPos = (x: number, y: number): Zona => (x >= 50 ? 'ciringuito' : y >= 70 ? 'interno' : 'veranda')

/** Posizione libera-ish al centro della zona (sfalsata per non sovrapporre i nuovi tavoli). */
export function posInZona(z: Zona, n: number) {
  const r = ZONE.find((q) => q.zona === z)!
  return { x: (r.x0 + r.x1) / 2 + ((n % 5) - 2) * 4, y: (r.y0 + r.y1) / 2 + ((n % 3) - 1) * 6 }
}
