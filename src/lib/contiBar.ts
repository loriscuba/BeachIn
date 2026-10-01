/**
 * Conti bar per ombrellone, calcolati dalle comande non ancora pagate.
 * Il numero ombrellone delle comande (es. "12" da ComandApp, oppure "A-12" scritto al banco)
 * viene collegato alla postazione dell'arenile: "A-12"/"a12" = fila + numero; un numero solo è il
 * progressivo sull'arenile (fila A = 1…20, fila B = 21…40, …), così "12" = A-12 e "27" = B-07.
 */
import type { Comanda } from '@/data/types'
import { config } from '@/data/config'

const FILE = config.arenile.file as readonly string[]
const PER_FILA = config.arenile.postazioniPerFila

/** Id della postazione (es. "A-12") a cui si riferisce il numero ombrellone di una comanda. */
export function postazioneDaOmbrellone(ombrellone: string): string | undefined {
  const t = ombrellone.trim().toUpperCase().replace(/\s+/g, '')
  const fn = t.match(/^([A-Z])-?0*(\d{1,2})$/)
  if (fn && FILE.includes(fn[1]) && +fn[2] >= 1 && +fn[2] <= PER_FILA) return `${fn[1]}-${fn[2].padStart(2, '0')}`
  if (/^\d+$/.test(t)) {
    const n = +t
    if (n < 1 || n > FILE.length * PER_FILA) return undefined
    return `${FILE[Math.floor((n - 1) / PER_FILA)]}-${String(((n - 1) % PER_FILA) + 1).padStart(2, '0')}`
  }
  return undefined
}

/** Giorno + ora della comanda: "oggi 13:50", "ieri 20:00", "lun 29 set 20:00". */
export function quandoComanda(c: Pick<Comanda, 'ts' | 'ora'>): string {
  if (!c.ts) return c.ora
  const d = new Date(c.ts)
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const giorno = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((giorno(new Date()) - giorno(d)) / 86_400_000)
  if (diff === 0) return `oggi ${ora}`
  if (diff === 1) return `ieri ${ora}`
  return `${d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })} ${ora}`
}

export interface ContoAperto {
  /** Chiave del conto: id postazione se riconosciuta, altrimenti il numero scritto. */
  chiave: string
  postazioneId?: string
  /** Come l'hanno scritto (es. "12"), per l'intestazione. */
  ombrellone: string
  clienti: string[]
  comande: Comanda[]
  righe: { nome: string; quantita: number; prezzo: number }[]
  totale: number
}

/** Comande non pagate raggruppate per ombrellone (le più vecchie prima dentro al conto). */
export function contiAperti(comande: Comanda[]): ContoAperto[] {
  const m = new Map<string, ContoAperto>()
  for (const c of [...comande].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))) {
    if (c.pagata) continue
    const postazioneId = postazioneDaOmbrellone(c.ombrellone)
    const chiave = postazioneId ?? c.ombrellone.trim()
    const conto = m.get(chiave) ?? { chiave, postazioneId, ombrellone: c.ombrellone.trim(), clienti: [], comande: [], righe: [], totale: 0 }
    if (c.cliente && !conto.clienti.includes(c.cliente)) conto.clienti.push(c.cliente)
    conto.comande.push(c)
    conto.totale += c.totale
    for (const r of c.righe) {
      const riga = conto.righe.find((x) => x.nome === r.nome && x.prezzo === r.prezzoUnitario)
      if (riga) riga.quantita += r.quantita
      else conto.righe.push({ nome: r.nome, quantita: r.quantita, prezzo: r.prezzoUnitario })
    }
    m.set(chiave, conto)
  }
  return [...m.values()].sort((a, b) => a.ombrellone.localeCompare(b.ombrellone, 'it', { numeric: true }))
}
