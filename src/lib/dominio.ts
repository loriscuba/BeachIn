import { DOMINI } from '@/config/domini'

export type RuoloDominio = 'sito' | 'app' | 'gestione' | null

/** Ruolo dell'indirizzo corrente; `null` = indirizzo generico (beachin.pages.dev, anteprime, localhost). */
export const ruoloDominio: RuoloDominio = (() => {
  const h = window.location.hostname.toLowerCase()
  if (DOMINI.sito.includes(h)) return 'sito'
  if (h === DOMINI.app) return 'app'
  if (h === DOMINI.gestione) return 'gestione'
  return null
})()

/** Pagine per i clienti, aperte su ogni dominio (link delle mail, QR, app installate). */
export const PERCORSI_CLIENTI = ['/sito/anteprima', '/menu', '/comandapp', '/tavolo', '/invito', '/prenotazione']

/** Sul dominio del sito la radice è la vetrina: per i dati conta come `/sito/anteprima` (vedi `PAGINE_CLIENTI`). */
export const percorsoPagina = (p: string) => (ruoloDominio === 'sito' && p === '/' ? '/sito/anteprima' : p)

/**
 * Sistema l'indirizzo prima che il router lo legga: sul sito "/sito/anteprima" diventa "/" e le pagine staff
 * tornano alla vetrina; sull'app clienti la radice e le pagine staff aprono "/comandapp".
 */
export function adattaPercorsoAlDominio() {
  if (!ruoloDominio || ruoloDominio === 'gestione') return
  const { pathname, search, hash } = window.location
  const p = pathname.replace(/\/+$/, '') || '/'
  const vai = (dest: string) => window.history.replaceState(null, '', dest + search + hash)
  if (ruoloDominio === 'sito' && (p === '/sito/anteprima' || (p !== '/' && !PERCORSI_CLIENTI.includes(p)))) vai('/')
  if (ruoloDominio === 'app' && !PERCORSI_CLIENTI.includes(p)) vai('/comandapp')
}

/** Indirizzo per un link/QR quando si è su un dominio del lido: pagine staff sul gestionale, le altre sull'app clienti. */
export function urlSuDominio(rotta: string): string | null {
  if (!ruoloDominio) return null
  const staff = /^(prenotazioni|sala|adminapp|salaapp)\b/.test(rotta)
  return `https://${staff ? DOMINI.gestione : DOMINI.app}/${rotta}`
}
