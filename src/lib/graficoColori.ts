/**
 * Colori dei grafici — palette categorica dei centri di ricavo.
 * Validata con lo script della skill dataviz (light):
 *   ordine stack blu → rosso → verde → ambra = tutti i check PASS
 *   (CVD ok, banda di luminosità ok, chroma ok; l'ambra ha contrasto basso
 *    → sempre accompagnata da etichette dirette e legenda).
 * Sono versioni più sature dei colori di brand, pensate per i grafici.
 */
import type { CentroCosto } from '@/data/types'

export const coloriCentro: Record<CentroCosto, string> = {
  spiaggia: '#0F7BA6', // blu mare (più saturo di cabina)
  ristorante: '#C0392B', // rosso
  noleggi: '#2F8F6E', // verde
  bar: '#D9A21A', // ambra
  eventi: '#6B4E9A', // viola (usato solo dove serve un 5° centro)
  struttura: '#7A8791', // grigio (overhead)
}

/** I centri con un flusso di ricavo giornaliero (esclusi eventi/struttura). */
export type CentroFlusso = 'spiaggia' | 'ristorante' | 'noleggi' | 'bar'

/** Ordine di impilamento validato: adiacenze distinguibili. */
export const ordineCentriRicavo: CentroFlusso[] = ['spiaggia', 'ristorante', 'noleggi', 'bar']

export const etichetteCentro: Record<CentroCosto, string> = {
  spiaggia: 'Spiaggia',
  bar: 'Bar',
  ristorante: 'Ristorante',
  noleggi: 'Noleggi',
  eventi: 'Eventi',
  struttura: 'Struttura',
}

/** Blu per le serie a singolo colore (occupazione, ecc.). */
export const bluGrafico = '#0F7BA6'
