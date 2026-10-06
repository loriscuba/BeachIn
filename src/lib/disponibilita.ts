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

// ———————————————— Prenotazione dal sito: orari e coperti prenotabili ————————————————

/** Orari di arrivo proposti sul sito per ogni turno. */
export const ORARI_TURNO: Record<Turno, string[]> = {
  pranzo: ['12:00', '12:30', '13:00', '13:30', '14:00'],
  cena: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'],
}
/** Coperti massimi in arrivo nella stessa mezz'ora (ritmo della cucina). */
export const COPERTI_PER_ORARIO = 16
/** Coperti massimi prenotabili online (oltre si telefona). */
export const MAX_COPERTI_SITO = 12

export interface Sistemazione {
  tavoli: Tavolo[]
  posti: number
}

/**
 * Come far sedere `coperti` persone sui tavoli liberi: un tavolo solo (il più piccolo che basta),
 * altrimenti 2 o 3 tavoli uniti (meglio della stessa zona) con meno posti sprecati.
 */
export function sistemazionePer(liberi: Tavolo[], coperti: number): Sistemazione | undefined {
  if (coperti <= 0) return undefined
  const ordinati = [...liberi].sort((a, b) => a.posti - b.posti || a.numero - b.numero)
  const singolo = ordinati.find((t) => t.posti >= coperti)
  if (singolo) return { tavoli: [singolo], posti: singolo.posti }
  let migliore: { tavoli: Tavolo[]; posti: number; punti: number } | undefined
  const prova = (ts: Tavolo[]) => {
    const posti = ts.reduce((s, t) => s + t.posti, 0)
    if (posti < coperti) return
    const punti = (ts.length - 2) * 100 + (posti - coperti) * 2 + (new Set(ts.map((t) => t.zona)).size - 1) * 5
    if (!migliore || punti < migliore.punti) migliore = { tavoli: ts, posti, punti }
  }
  const n = ordinati.length
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    prova([ordinati[i], ordinati[j]])
    for (let k = j + 1; k < n; k++) prova([ordinati[i], ordinati[j], ordinati[k]])
  }
  return migliore && { tavoli: migliore.tavoli, posti: migliore.posti }
}

/** "tavolo da 4" oppure "tavoli da 3 + 2 uniti". */
export function descriviSistemazione(s: Sistemazione) {
  return s.tavoli.length === 1 ? `tavolo da ${s.posti}` : `tavoli da ${s.tavoli.map((t) => t.posti).join(' + ')} uniti`
}

export interface RichiestaInAttesa {
  data: string
  turno: Turno
  coperti: number
  ora?: string
}

export interface Prenotabilita {
  /** Tavoli ancora liberi dopo aver sistemato prenotazioni e richieste in attesa senza tavolo. */
  liberi: Tavolo[]
  /** Coperti prenotabili (1…MAX) con la sistemazione proposta. */
  coperti: { n: number; sistemazione: Sistemazione }[]
  /** Orari di arrivo con i coperti ancora accettabili in quella mezz'ora. */
  orari: { ora: string; postiLiberi: number }[]
}

/**
 * Cosa si può prenotare dal sito per un turno: parte dai tavoli liberi, "siede" prima le prenotazioni
 * e le richieste in attesa ancora senza tavolo (le più grandi per prime), poi calcola quali gruppi
 * ci stanno ancora (anche unendo tavoli) e quanti coperti accetta ogni orario.
 */
export function prenotabilita(tavoli: Tavolo[], prenotazioni: PrenotazioneRistorante[], inAttesa: RichiestaInAttesa[], data: string, turno: Turno): Prenotabilita {
  const attive = prenotazioni.filter((p) => p.data === data && p.turno === turno && p.stato !== 'annullata')
  const attesa = inAttesa.filter((r) => r.data === data && r.turno === turno)
  const occupati = new Set(attive.flatMap((p) => (p.tavoloId ? [p.tavoloId] : [])))
  let liberi = tavoli.filter((t) => !occupati.has(t.id))
  const daSedere = [...attive.filter((p) => !p.tavoloId).map((p) => p.coperti), ...attesa.map((r) => r.coperti)].sort((a, b) => b - a)
  for (const c of daSedere) {
    const s = sistemazionePer(liberi, c)
    if (s) liberi = liberi.filter((t) => !s.tavoli.includes(t))
  }
  const coperti: Prenotabilita['coperti'] = []
  for (let n = 1; n <= MAX_COPERTI_SITO; n++) {
    const s = sistemazionePer(liberi, n)
    if (!s) break
    coperti.push({ n, sistemazione: s })
  }
  const arrivi = [...attive, ...attesa]
  const orari = ORARI_TURNO[turno].map((ora) => ({
    ora,
    postiLiberi: Math.max(0, COPERTI_PER_ORARIO - arrivi.filter((p) => p.ora === ora).reduce((s, p) => s + p.coperti, 0)),
  }))
  return { liberi, coperti, orari }
}
