import type { GiornoChiuso, PrenotazioneRistorante, Tavolo, Turno } from '@/data/types'

/** Disponibilità di un turno: tavoli/posti liberi a partire dalle prenotazioni attive di quel giorno. */
export interface DisponibilitaTurno {
  tavoliTotali: number
  postiTotali: number
  /** Tavoli non assegnati a nessuna prenotazione del turno. */
  liberi: Tavolo[]
  /** Prenotazioni attive ancora senza tavolo (occuperanno un tavolo libero). */
  senzaTavolo: number
  copertiPrenotati: number
  postiLiberi: number
  /** Tavoli liberi al netto delle prenotazioni ancora da sistemare. */
  tavoliLiberi: number
  pieno: boolean
  /** Il tavolo libero più piccolo che contiene i coperti richiesti (se c'è). */
  tavoloAdatto?: Tavolo
}

export function disponibilitaTurno(tavoli: Tavolo[], prenotazioni: PrenotazioneRistorante[], data: string, turno: Turno, coperti = 0): DisponibilitaTurno {
  const attive = prenotazioni.filter((p) => p.data === data && p.turno === turno && p.stato !== 'annullata')
  const occupati = new Set(attive.flatMap((p) => (p.tavoloId ? [p.tavoloId] : [])))
  const liberi = tavoli.filter((t) => !occupati.has(t.id))
  const senzaTavolo = attive.filter((p) => !p.tavoloId).length
  const postiTotali = tavoli.reduce((s, t) => s + t.posti, 0)
  const copertiPrenotati = attive.reduce((s, p) => s + p.coperti, 0)
  const postiLiberi = Math.max(0, postiTotali - copertiPrenotati)
  const tavoliLiberi = Math.max(0, liberi.length - senzaTavolo)
  const tavoloAdatto = coperti > 0 ? [...liberi].sort((a, b) => a.posti - b.posti).find((t) => t.posti >= coperti) : undefined
  return {
    tavoliTotali: tavoli.length, postiTotali, liberi, senzaTavolo, copertiPrenotati, postiLiberi, tavoliLiberi,
    pieno: tavoliLiberi === 0 || postiLiberi === 0, tavoloAdatto,
  }
}

export type StatoGiorno = 'chiuso' | 'pieno' | 'parziale' | 'libero'

/** Stato di un giorno per il calendario del sito: chiuso, tutto pieno, un turno pieno, disponibile. */
export function statoGiorno(tavoli: Tavolo[], prenotazioni: PrenotazioneRistorante[], chiusi: GiornoChiuso[], data: string) {
  const chiuso = chiusi.some((g) => g.data === data)
  const pieno: Record<Turno, boolean> = {
    pranzo: chiuso || disponibilitaTurno(tavoli, prenotazioni, data, 'pranzo').pieno,
    cena: chiuso || disponibilitaTurno(tavoli, prenotazioni, data, 'cena').pieno,
  }
  const stato: StatoGiorno = chiuso ? 'chiuso' : pieno.pranzo && pieno.cena ? 'pieno' : pieno.pranzo || pieno.cena ? 'parziale' : 'libero'
  return { stato, pieno, nota: chiusi.find((g) => g.data === data)?.nota }
}
