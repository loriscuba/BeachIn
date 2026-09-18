/**
 * 8 eventi della stagione con budget, costi sostenuti, ricavi e partecipanti.
 * La somma dei ricavi è nell'ordine del target eventi (config.scala).
 */
import type { Evento, TipoEvento } from '../types'

interface DefE {
  nome: string
  tipo: TipoEvento
  data: string
  budget: number
  costi: number
  ricavi: number
  partecipanti: number
  descrizione: string
}

const def: DefE[] = [
  { nome: 'Torneo di beach volley', tipo: 'sport', data: '2026-06-20', budget: 1500, costi: 1320, ricavi: 2100, partecipanti: 64, descrizione: 'Torneo a coppie con premiazione e aperitivo finale.' },
  { nome: 'Aperitivo in musica', tipo: 'musica', data: '2026-06-28', budget: 1800, costi: 1650, ricavi: 2450, partecipanti: 140, descrizione: 'DJ set al tramonto con drink e finger food.' },
  { nome: 'Compleanno privato Bianchi', tipo: 'privato', data: '2026-07-12', budget: 0, costi: 900, ricavi: 1800, partecipanti: 40, descrizione: 'Festa privata su prenotazione, catering interno.' },
  { nome: 'Cena sotto le stelle', tipo: 'gastronomia', data: '2026-07-19', budget: 2200, costi: 2050, ricavi: 3200, partecipanti: 90, descrizione: 'Cena a tema con menù di mare e musica dal vivo.' },
  { nome: 'Corso di yoga all’alba', tipo: 'benessere', data: '2026-07-26', budget: 400, costi: 360, ricavi: 620, partecipanti: 28, descrizione: 'Quattro appuntamenti mattutini con istruttrice.' },
  { nome: 'Festa di Ferragosto', tipo: 'festa', data: '2026-08-15', budget: 3500, costi: 3300, ricavi: 4200, partecipanti: 220, descrizione: 'Cena, musica e spettacolo pirotecnico sulla spiaggia.' },
  { nome: 'Aperitivo in musica', tipo: 'musica', data: '2026-08-22', budget: 1800, costi: 1500, ricavi: 0, partecipanti: 0, descrizione: 'Secondo appuntamento con DJ set (in programma).' },
  { nome: 'Torneo di racchettoni', tipo: 'sport', data: '2026-09-05', budget: 900, costi: 0, ricavi: 0, partecipanti: 0, descrizione: 'Chiusura di stagione con torneo e merenda (in programma).' },
]

export const eventi: Evento[] = def.map((d, i) => ({
  id: `E-${String(i + 1).padStart(2, '0')}`,
  nome: d.nome,
  tipo: d.tipo,
  data: d.data,
  budget: d.budget,
  costiSostenuti: d.costi,
  ricavi: d.ricavi,
  partecipanti: d.partecipanti,
  descrizione: d.descrizione,
}))

/** Ricavi eventi realizzati (eventi passati). */
export const ricaviEventi = eventi.reduce((s, e) => s + e.ricavi, 0)
/** Costi eventi sostenuti. */
export const costiEventi = eventi.reduce((s, e) => s + e.costiSostenuti, 0)
