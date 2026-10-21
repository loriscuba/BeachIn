import type { RichiestaEvento } from '@/data/types'
import { urlPubblico } from '@/lib/urlPubblico'

// Alfabeto senza caratteri ambigui (0/O, 1/I/L): il codice si può anche dettare o digitare a mano.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Codice invito casuale di 8 caratteri (≈ 40 bit). */
export function nuovoCodiceInvito(): string {
  const b = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join('')
}

/** Pagina pubblica dell'invito: è anche il contenuto del QR. */
export const urlInvito = (codice: string) => urlPubblico(`invito?c=${codice}`)

/** Estrae il codice da quello che legge lo scanner (URL dell'invito o codice nudo). */
export function codiceDaTesto(testo: string): string {
  const m = /[?&]c=([A-Za-z0-9]+)/.exec(testo)
  return (m ? m[1] : testo.trim()).toUpperCase()
}

export type EsitoInvito =
  | { tipo: 'ok'; r: RichiestaEvento }
  | { tipo: 'gia_entrato'; r: RichiestaEvento }
  | { tipo: 'altro_evento'; r: RichiestaEvento }
  | { tipo: 'non_confermata'; r: RichiestaEvento }
  | { tipo: 'sconosciuto' }

/** Controllo all'ingresso: l'invito deve esistere, essere confermato ed essere per l'evento che si sta accogliendo. */
export function verificaInvito(richieste: RichiestaEvento[], codice: string, eventoId?: string): EsitoInvito {
  const r = richieste.find((x) => x.codice === codice)
  if (!r) return { tipo: 'sconosciuto' }
  if (r.stato !== 'confermata') return { tipo: 'non_confermata', r }
  if (eventoId && r.eventoId !== eventoId) return { tipo: 'altro_evento', r }
  if ((r.arrivati ?? 0) >= r.persone) return { tipo: 'gia_entrato', r }
  return { tipo: 'ok', r }
}

/** Evento da accogliere di default: quello di oggi, altrimenti il prossimo, altrimenti l'ultimo passato. */
export function eventoPredefinito<T extends { id: string; data: string }>(eventi: T[], oggi: string): T | undefined {
  const ord = [...eventi].sort((a, b) => a.data.localeCompare(b.data))
  return ord.find((e) => e.data >= oggi) ?? ord.at(-1)
}

/** Ora "hh:mm" di un istante in ms. */
export const oraDa = (ts?: number) => (ts ? new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '')
