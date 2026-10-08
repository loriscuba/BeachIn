/** Dati iniziali dell'app clienti: news del gestore e lavagnetta del giorno. */
import type { Notizia, VoceLavagnetta } from '@/data/types'
import { config } from '@/data/config'

const giorniFa = (n: number) => {
  const d = new Date(`${config.oggi}T12:00:00`)
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const notizie: Notizia[] = [
  { id: 'NW-1', titolo: 'Benvenuti nella nuova app del Lido!', testo: 'Da qui potete ordinare dal vostro ombrellone, prenotare un tavolo o un evento e seguire tutte le novità del Lido dei Pini.', data: giorniFa(0), ts: 3, fissata: true },
  { id: 'NW-2', titolo: 'Stasera aperitivo al tramonto', testo: 'Dalle 18:30 aperitivo con musica dal vivo sulla terrazza del Ciringuito. Vi aspettiamo!', data: giorniFa(1), ts: 2 },
  { id: 'NW-3', titolo: 'Pescato del giorno', testo: 'Oggi in cucina acciughe fresche del mercato di Savona: trovate le proposte sulla lavagnetta.', data: giorniFa(2), ts: 1 },
]

export const lavagnetta: VoceLavagnetta[] = [
  { id: 'LV-1', nome: 'Trofie al pesto', descrizione: 'pesto genovese fatto in casa', prezzo: 13 },
  { id: 'LV-2', nome: 'Acciughe fritte', descrizione: 'pescato del giorno', prezzo: 12 },
  { id: 'LV-3', nome: 'Frittura mista', descrizione: 'calamari, gamberi e verdure', prezzo: 18 },
  { id: 'LV-4', nome: 'Torta di verdure', prezzo: 6 },
]
