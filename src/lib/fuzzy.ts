/**
 * Corrispondenza "fuzzy" di stringhe, per riconoscere i piatti anche quando la
 * trascrizione vocale è imprecisa o parziale (es. «calamari» → «Calamari
 * fritti», «branzino forno» → «Branzino al forno»).
 *
 * Nessuna dipendenza esterna: normalizzazione + distanza di Levenshtein +
 * sovrapposizione di parole. Restituisce un punteggio 0–1.
 */

/** minuscolo, senza accenti/punteggiatura, spazi compattati. */
export function normalizzaTesto(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + costo)
    }
    prev = cur
  }
  return prev[n]
}

/** Somiglianza carattere-per-carattere 0–1. */
function ratio(a: string, b: string): number {
  const L = Math.max(a.length, b.length)
  return L === 0 ? 1 : 1 - levenshtein(a, b) / L
}

/**
 * Somiglianza 0–1 tra ciò che è stato detto e il nome di un piatto.
 * Combina più segnali e tiene il migliore: contenimento (una è dentro l'altra),
 * sovrapposizione di parole (Dice) e somiglianza per token.
 */
export function similarita(query: string, target: string): number {
  const q = normalizzaTesto(query)
  const t = normalizzaTesto(target)
  if (!q || !t) return 0
  if (q === t) return 1
  if (t.includes(q) || q.includes(t)) {
    const r = Math.min(q.length, t.length) / Math.max(q.length, t.length)
    return 0.85 + 0.15 * r
  }
  const qt = q.split(' ')
  const tt = t.split(' ')
  const comuni = qt.filter((w) => tt.includes(w)).length
  const dice = (2 * comuni) / (qt.length + tt.length)
  // Media del miglior ratio di ogni parola detta contro le parole del piatto.
  const perToken = qt.reduce((acc, w) => acc + Math.max(...tt.map((x) => ratio(w, x))), 0) / qt.length
  const intero = ratio(q, t)
  return Math.max(dice, perToken, intero)
}

export interface Corrispondenza<T> {
  item: T
  score: number
}

/** Il candidato più simile alla query (con il suo punteggio), o null se lista vuota. */
export function trovaMigliore<T>(
  query: string,
  items: T[],
  nome: (x: T) => string
): Corrispondenza<T> | null {
  let best: Corrispondenza<T> | null = null
  for (const item of items) {
    const score = similarita(query, nome(item))
    if (!best || score > best.score) best = { item, score }
  }
  return best
}
