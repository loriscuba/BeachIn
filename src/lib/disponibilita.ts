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

/** Zona preferita letta dalle note ("preferisce la veranda", "vista mare", "dentro"...). */
export function zonaPreferita(note?: string): Tavolo['zona'] | undefined {
  const n = (note ?? '').toLowerCase()
  if (/veranda|vista mare|fuori|esterno|aperto/.test(n)) return 'veranda'
  if (/interno|dentro|al chiuso/.test(n)) return 'interno'
  if (/ciringuito|chiringuito/.test(n)) return 'ciringuito'
  return undefined
}

export interface SuggerimentoTavolo {
  pren: PrenotazioneRistorante
  tavolo: Tavolo
  zona?: Tavolo['zona']
  /** Il tavolo è nella zona chiesta (undefined = nessuna preferenza). */
  zonaRispettata?: boolean
}

/**
 * Un tavolo consigliato per ogni prenotazione attiva del turno senza tavolo: libero, abbastanza grande,
 * nella zona preferita se possibile, il più piccolo che basta. Le comitive grandi scelgono per prime.
 */
export function suggerisciTavoli(tavoli: Tavolo[], prenotazioni: PrenotazioneRistorante[], data: string, turno: Turno): SuggerimentoTavolo[] {
  const attive = prenotazioni.filter((p) => p.data === data && p.turno === turno && p.stato !== 'annullata')
  const presi = new Set(attive.flatMap((p) => (p.tavoloId ? [p.tavoloId] : [])))
  const out: SuggerimentoTavolo[] = []
  for (const p of attive.filter((x) => !x.tavoloId).sort((a, b) => b.coperti - a.coperti)) {
    const zona = zonaPreferita(p.note)
    const tavolo = tavoli
      .filter((t) => !presi.has(t.id) && t.posti >= p.coperti)
      .sort((a, b) => Number(zona != null && b.zona === zona) - Number(zona != null && a.zona === zona) || a.posti - b.posti || a.numero - b.numero)[0]
    if (!tavolo) continue
    presi.add(tavolo.id)
    out.push({ pren: p, tavolo, zona, zonaRispettata: zona ? tavolo.zona === zona : undefined })
  }
  return out.sort((a, b) => (a.pren.ora ?? '').localeCompare(b.pren.ora ?? '') || a.pren.nome.localeCompare(b.pren.nome))
}
