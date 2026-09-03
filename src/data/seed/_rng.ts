/**
 * Generatore pseudo-casuale DETERMINISTICO (seed fisso).
 * Serve a produrre dati vari ma sempre identici a ogni caricamento:
 * niente Math.random() a runtime. Vedi PROMPT — "seed fisso o valori a mano".
 */

/** mulberry32: piccolo PRNG a 32 bit, veloce e deterministico. */
export function creaRng(seed: number) {
  let a = seed >>> 0
  return function rng(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = () => number

/** Intero in [min, max] inclusi. */
export function intero(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

/** Float in [min, max). */
export function reale(rng: Rng, min: number, max: number): number {
  return rng() * (max - min) + min
}

/** Elemento a caso da un array. */
export function scegli<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** Estrazione pesata: pesi paralleli agli elementi. */
export function scegliPesato<T>(rng: Rng, arr: readonly T[], pesi: readonly number[]): T {
  const somma = pesi.reduce((s, p) => s + p, 0)
  let r = rng() * somma
  for (let i = 0; i < arr.length; i++) {
    r -= pesi[i]
    if (r <= 0) return arr[i]
  }
  return arr[arr.length - 1]
}

/** true con probabilità p. */
export function forse(rng: Rng, p: number): boolean {
  return rng() < p
}

/** Arrotonda a `passo` (es. 0.5 per i prezzi al 50 cent). */
export function arrotonda(v: number, passo = 1): number {
  return Math.round(v / passo) * passo
}
