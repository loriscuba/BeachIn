/**
 * Serie giornaliera della stagione — FONTE DI VERITÀ dei numeri.
 * Gli incassi sono scalati sui target di config.scala tramite pesi giornalieri,
 * poi arrotondati; ogni totale nell'app si ottiene SOMMANDO questi record, così
 * i numeri tornano tra Cruscotto, Conto economico, Bar, Ristorante e Sito.
 */
import { isAfter, parseISO } from 'date-fns'
import { config } from '../config'
import type { CategoriaBar, Fascia, GiornoStagione } from '../types'
import { creaRng, arrotonda, type Rng } from './_rng'
import { giorniBase, giorniBaseAnnoScorso } from './_calendario'

const TOTALE_POSTAZIONI = config.arenile.postazioniTotali
const oggi = parseISO(config.stagione.oggi)

// Distribuisce un totale-obiettivo sui giorni in proporzione ai pesi, arrotondato.
function distribuisci(pesi: number[], totale: number, passo = 1): number[] {
  const somma = pesi.reduce((s, p) => s + p, 0)
  return pesi.map((p) => arrotonda((totale * p) / somma, passo))
}

// Pesi per centro
const pesiSpiaggia = giorniBase.map((g) => g.domanda)
const pesiBar = giorniBase.map((g) => g.domanda * (g.weekend ? 1.08 : 1))
const pesiRist = giorniBase.map((g) => g.domanda * (g.weekend ? 1.28 : 0.95))
const pesiNol = giorniBase.map((g) => g.domanda * (g.meteo === 'sole' ? 1.2 : 0.7))

const incSpiaggia = distribuisci(pesiSpiaggia, config.scala.incassoSpiaggiaStagione, 5)
const incBar = distribuisci(pesiBar, config.scala.incassoBarStagione, 1)
const incRist = distribuisci(pesiRist, config.scala.incassoRistoranteStagione, 1)
const incNol = distribuisci(pesiNol, config.scala.incassoNoleggiStagione, 1)

// Confronto anno scorso: mappa MM-DD → occupazione/incasso 2025
const spiaggiaAS = distribuisci(
  giorniBaseAnnoScorso.map((g) => g.domanda),
  Math.round(config.scala.incassoSpiaggiaStagione * 0.9),
  5
)
const mappaAnnoScorso = new Map<string, { occ: number; inc: number }>()
giorniBaseAnnoScorso.forEach((g, i) => {
  mappaAnnoScorso.set(g.data.slice(5), { occ: g.domanda, inc: spiaggiaAS[i] })
})

const categorieBar: CategoriaBar[] = [
  'caffetteria',
  'bibite',
  'birre',
  'cocktail',
  'gelati',
  'snack',
  'gastronomia',
]
// Ripartizione media dell'incasso bar per categoria e per fascia oraria
const quoteCat = [0.16, 0.2, 0.14, 0.12, 0.15, 0.1, 0.13]
const fasce: Fascia[] = ['mattina', 'pranzo', 'pomeriggio', 'sera']
const quoteFascia = [0.22, 0.31, 0.27, 0.2]

function scontrinoBar(periodo: string): number {
  return periodo === 'altissima' ? 8.4 : periodo === 'alta' ? 7.8 : periodo === 'media' ? 7.1 : 6.5
}
function scontrinoRist(periodo: string, turno: 'pranzo' | 'cena'): number {
  const base = turno === 'cena' ? 39 : 27
  const mod = periodo === 'altissima' ? 3 : periodo === 'alta' ? 1.5 : periodo === 'bassa' ? -2 : 0
  return base + mod
}

function costruisci(rng: Rng): GiornoStagione[] {
  return giorniBase.map((g, i) => {
    const consuntivo = !isAfter(parseISO(g.data), oggi)

    const postazioniOccupate = Math.min(
      TOTALE_POSTAZIONI,
      Math.round(g.domanda * TOTALE_POSTAZIONI)
    )
    const occupazione = postazioniOccupate / TOTALE_POSTAZIONI
    const presenze = Math.round(postazioniOccupate * (2.3 + rng() * 0.7))

    // Ristorante: split incasso pranzo/cena e coperti derivati
    const incR = incRist[i]
    const incPranzo = Math.round(incR * 0.4)
    const incCena = incR - incPranzo
    const copertiPranzo = Math.max(0, Math.round(incPranzo / scontrinoRist(g.periodo, 'pranzo')))
    const copertiCena = Math.max(0, Math.round(incCena / scontrinoRist(g.periodo, 'cena')))

    const as = mappaAnnoScorso.get(g.data.slice(5)) ?? { occ: occupazione * 0.92, inc: incSpiaggia[i] * 0.9 }

    return {
      data: g.data,
      periodo: g.periodo,
      meteo: g.meteo,
      tempMax: g.tempMax,
      consuntivo,
      postazioniOccupate,
      occupazione,
      presenze,
      copertiPranzo,
      copertiCena,
      incassoSpiaggia: incSpiaggia[i],
      incassoBar: incBar[i],
      incassoRistorante: incRist[i],
      incassoNoleggi: incNol[i],
      incassoEventi: 0, // gli eventi sono contabilizzati a parte (seed eventi)
      scontrinoMedioBar: Math.round(scontrinoBar(g.periodo) * 100) / 100,
      occupazioneAnnoScorso: Math.round(as.occ * 1000) / 1000,
      incassoSpiaggiaAnnoScorso: as.inc,
    }
  })
}

export const giorni: GiornoStagione[] = costruisci(creaRng(777))

/** Solo i giorni fino a "oggi" (consuntivo). */
export const giorniConsuntivo = giorni.filter((g) => g.consuntivo)

/** Record del giorno corrente. */
export const giornoOggi =
  giorni.find((g) => g.data === config.stagione.oggi) ?? giorniConsuntivo[giorniConsuntivo.length - 1]

// — Dettagli bar/ristorante derivati (per le rispettive pagine) —

export function dettaglioBarGiorno(g: GiornoStagione) {
  const perCategoria = Object.fromEntries(
    categorieBar.map((c, idx) => [c, Math.round(g.incassoBar * quoteCat[idx])])
  ) as Record<CategoriaBar, number>
  const perFascia = Object.fromEntries(
    fasce.map((f, idx) => [f, Math.round(g.incassoBar * quoteFascia[idx])])
  ) as Record<Fascia, number>
  const numScontrini = Math.max(1, Math.round(g.incassoBar / g.scontrinoMedioBar))
  return {
    perCategoria,
    perFascia,
    numScontrini,
    costoMerce: Math.round(g.incassoBar * 0.29),
  }
}
