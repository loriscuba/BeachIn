/**
 * Scaffolding del calendario di stagione: per ogni giorno determina periodo,
 * meteo (deterministico), temperatura e un indice di "domanda" 0–1 che governa
 * occupazione e incassi. Non produce ancora euro: quello lo fa giornaliero.ts.
 */
import { eachDayOfInterval, format, getDate, getDay, getMonth, parseISO } from 'date-fns'
import { config } from '../config'
import type { Meteo, Periodo } from '../types'
import { creaRng, scegliPesato, type Rng } from './_rng'

const SEED = 20260501

export interface GiornoBase {
  data: string
  periodo: Periodo
  meteo: Meteo
  tempMax: number
  domanda: number // 0–1, guida occupazione e incassi
  weekend: boolean
}

/** Precedenza: agosto > luglio / 1–10 set > giugno > maggio / resto set. */
function classificaPeriodo(mese: number, giorno: number): Periodo {
  if (mese === 7) return 'altissima' // agosto (0-based)
  if (mese === 6) return 'alta' // luglio
  if (mese === 8 && giorno <= 10) return 'alta' // 1–10 settembre
  if (mese === 5) return 'media' // giugno
  return 'bassa' // maggio, resto settembre
}

// Base per periodo: meteo, weekday e rumore la riducono un po', così le medie
// effettive per periodo cadono nella banda ~55–92% indicata nel PROMPT.
const occupazioneBase: Record<Periodo, number> = {
  bassa: 0.63,
  media: 0.78,
  alta: 0.9,
  altissima: 0.98,
}

/** Domenica..Sabato → moltiplicatore domanda (weekend più pieno). */
const moltWeekday = [1.05, 0.9, 0.9, 0.92, 0.96, 1.06, 1.12]

const meteoOpzioni: Meteo[] = ['sole', 'poco_nuvoloso', 'nuvoloso', 'pioggia', 'temporale']
// Pesi meteo per periodo (l'estate è quasi sempre bella)
const meteoPesi: Record<Periodo, number[]> = {
  bassa: [45, 25, 15, 12, 3],
  media: [55, 25, 12, 6, 2],
  alta: [68, 20, 7, 4, 1],
  altissima: [72, 18, 6, 3, 1],
}
const meteoFattore: Record<Meteo, number> = {
  sole: 1.0,
  poco_nuvoloso: 0.97,
  nuvoloso: 0.85,
  pioggia: 0.5,
  temporale: 0.32,
}
const tempBase: Record<Periodo, number> = { bassa: 23, media: 27, alta: 31, altissima: 33 }

function costruisci(rng: Rng, dalISO: string, alISO: string): GiornoBase[] {
  const giorni = eachDayOfInterval({ start: parseISO(dalISO), end: parseISO(alISO) })
  return giorni.map((d) => {
    const mese = getMonth(d)
    const giornoMese = getDate(d)
    const periodo = classificaPeriodo(mese, giornoMese)
    const dow = getDay(d) // 0 dom .. 6 sab
    const weekend = dow === 0 || dow === 6
    const meteo = scegliPesato(rng, meteoOpzioni, meteoPesi[periodo])

    const rumore = 0.94 + rng() * 0.12 // ±6%
    let domanda = occupazioneBase[periodo] * moltWeekday[dow] * meteoFattore[meteo] * rumore
    domanda = Math.max(0.28, Math.min(1, domanda))

    const tempMax = Math.round(
      tempBase[periodo] + (weekend ? 1 : 0) - (meteo === 'pioggia' || meteo === 'temporale' ? 5 : 0) + rng() * 3
    )

    return { data: format(d, 'yyyy-MM-dd'), periodo, meteo, tempMax, domanda, weekend }
  })
}

/** Giorni della stagione 2026 (fonte primaria). */
export const giorniBase: GiornoBase[] = costruisci(
  creaRng(SEED),
  config.stagione.inizio,
  config.stagione.fine
)

/** Serie 2025 semplificata, solo per il confronto anno precedente. */
export const giorniBaseAnnoScorso: GiornoBase[] = costruisci(
  creaRng(SEED - 1),
  '2025-05-01',
  '2025-09-30'
).map((g) => ({ ...g, domanda: Math.max(0.26, g.domanda * 0.94) })) // stagione un po' più fiacca
