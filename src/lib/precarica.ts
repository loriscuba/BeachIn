/**
 * Precaricamento delle pagine dell'app staff: quando il telefono è libero scarica il codice delle schede del ruolo,
 * così il primo tocco non aspetta la rete. Stessi import del router (Vite riusa gli stessi file).
 * Non con "risparmio dati" attivo.
 */
const PAGINE: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Panoramica'),
  '/prenotazioni': () => import('@/pages/Prenotazioni'),
  '/sala': () => import('@/pages/Sala'),
  '/comande': () => import('@/pages/Comande'),
  '/arenile': () => import('@/pages/Arenile'),
}

export function precaricaPagine(percorsi: string[]) {
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection
  if (conn?.saveData) return
  const w = window as unknown as { requestIdleCallback?: (f: () => void) => number; cancelIdleCallback?: (n: number) => void }
  const fai = () => { for (const p of new Set(percorsi.map((x) => x.split('?')[0]))) void PAGINE[p]?.().catch(() => undefined) }
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fai)
    return () => w.cancelIdleCallback?.(id)
  }
  const t = window.setTimeout(fai, 1500)
  return () => window.clearTimeout(t)
}
