/**
 * Calcoli derivati: contatori arenile, KPI cruscotto, conto economico,
 * simulatore preventivo. Funzioni pure: ricevono i dati e restituiscono viste.
 */
import { getMonth, getDate, parseISO } from 'date-fns'
import { config } from '@/data/config'
import type {
  ContatoriArenile,
  ContoEconomico,
  CentroCosto,
  Durata,
  FilaId,
  GiornoStagione,
  KpiCruscotto,
  Periodo,
  Postazione,
  RigaContoEconomico,
  TipologiaPostazione,
  VoceCosto,
  VoceTariffa,
} from '@/data/types'

export function contatoriArenile(post: Postazione[]): ContatoriArenile {
  const c = { libere: 0, occupate: 0, prenotate: 0, stagionali: 0, fuoriServizio: 0 }
  for (const p of post) {
    if (p.stato === 'libera') c.libere++
    else if (p.stato === 'occupata') c.occupate++
    else if (p.stato === 'prenotata') c.prenotate++
    else if (p.stato === 'stagionale') c.stagionali++
    else if (p.stato === 'fuori_servizio') c.fuoriServizio++
  }
  const totali = post.length
  const vendute = c.occupate + c.prenotate + c.stagionali
  return { totali, ...c, occupazione: totali ? vendute / totali : 0 }
}

export function kpiCruscotto(giorni: GiornoStagione[], oggiISO: string): KpiCruscotto {
  const consuntivo = giorni.filter((g) => g.consuntivo)
  const oggi = giorni.find((g) => g.data === oggiISO) ?? consuntivo[consuntivo.length - 1]
  const idx = consuntivo.findIndex((g) => g.data === oggi.data)
  const ultimi30 = consuntivo.slice(Math.max(0, idx - 29), idx + 1)
  return {
    oggi,
    incassoOggi: oggi.incassoSpiaggia + oggi.incassoBar + oggi.incassoRistorante + oggi.incassoNoleggi,
    occupazioneOggi: oggi.occupazione,
    occupazioneAnnoScorso: oggi.occupazioneAnnoScorso,
    copertiPranzo: oggi.copertiPranzo,
    copertiCena: oggi.copertiCena,
    scontrinoMedioBar: oggi.scontrinoMedioBar,
    presenze: oggi.presenze,
    ultimi30,
  }
}

interface EventiSintesi {
  ricavi: number
  costi: number
}

export function contoEconomico(
  giorni: GiornoStagione[],
  costi: VoceCosto[],
  eventi: EventiSintesi
): ContoEconomico {
  // Ricavi per centro (somma della serie giornaliera → coincide col Cruscotto)
  const ricavi: Record<CentroCosto, number> = {
    spiaggia: somma(giorni, (g) => g.incassoSpiaggia),
    bar: somma(giorni, (g) => g.incassoBar),
    ristorante: somma(giorni, (g) => g.incassoRistorante),
    noleggi: somma(giorni, (g) => g.incassoNoleggi),
    eventi: eventi.ricavi,
    struttura: 0,
  }

  // Costi per centro (somma delle voci). Gli eventi includono i costi eventi.
  const costiCentro: Record<CentroCosto, number> = {
    spiaggia: 0, bar: 0, ristorante: 0, noleggi: 0, eventi: eventi.costi, struttura: 0,
  }
  let costiFissi = 0
  let costiVariabili = 0
  let costiPersonale = 0
  let costiMerce = 0
  for (const v of costi) {
    costiCentro[v.centroCosto] += v.imponibile
    if (v.tipo === 'fisso') costiFissi += v.imponibile
    else costiVariabili += v.imponibile
    if (v.categoria === 'Personale') costiPersonale += v.imponibile
    if (v.categoria === 'Acquisto merce') costiMerce += v.imponibile
  }
  costiVariabili += eventi.costi // costi eventi trattati come variabili

  const centri: CentroCosto[] = ['spiaggia', 'bar', 'ristorante', 'noleggi', 'eventi', 'struttura']
  const righe: RigaContoEconomico[] = centri.map((centro) => ({
    centro,
    ricavi: ricavi[centro],
    costi: costiCentro[centro],
    margine: ricavi[centro] - costiCentro[centro],
  }))

  const ricaviTotali = centri.reduce((s, c) => s + ricavi[c], 0)
  const costiTotali = centri.reduce((s, c) => s + costiCentro[c], 0)
  const presenze = somma(giorni, (g) => g.presenze)
  const giorniAttivi = giorni.length || 1
  const margineContribRatio = ricaviTotali ? (ricaviTotali - costiVariabili) / ricaviTotali : 0

  return {
    righe,
    ricaviTotali,
    costiTotali,
    costiFissi,
    costiVariabili,
    margine: ricaviTotali - costiTotali,
    breakEven: margineContribRatio > 0 ? costiFissi / margineContribRatio : 0,
    indicatori: {
      costoPerOmbrelloneGiorno: costiTotali / (config.arenile.postazioniTotali * giorniAttivi),
      ricavoPerPostazione: ricavi.spiaggia / config.arenile.postazioniTotali,
      ricavoPerPresenza: presenze ? ricaviTotali / presenze : 0,
      incidenzaPersonale: ricaviTotali ? costiPersonale / ricaviTotali : 0,
      incidenzaMerce: ricavi.bar + ricavi.ristorante ? costiMerce / (ricavi.bar + ricavi.ristorante) : 0,
    },
  }
}

function somma<T>(arr: T[], f: (t: T) => number): number {
  return arr.reduce((s, t) => s + f(t), 0)
}

// — Simulatore preventivo postazione —

function periodoDelGiorno(iso: string): Periodo {
  const d = parseISO(iso)
  const mese = getMonth(d)
  const giorno = getDate(d)
  if (mese === 7) return 'altissima'
  if (mese === 6) return 'alta'
  if (mese === 8 && giorno <= 10) return 'alta'
  if (mese === 5) return 'media'
  return 'bassa'
}

export interface RisultatoPreventivo {
  giorni: number
  totale: number
  dettaglioPerPeriodo: { periodo: Periodo; giorni: number; prezzoGiorno: number; subtotale: number }[]
  mancante: boolean
}

/** Preventivo giornaliero sommando la tariffa applicabile per ogni giorno. */
export function simulaPreventivo(
  tariffe: VoceTariffa[],
  fila: FilaId,
  tipologia: TipologiaPostazione,
  dalISO: string,
  alISO: string
): RisultatoPreventivo {
  const dal = parseISO(dalISO)
  const al = parseISO(alISO)
  const durata: Durata = 'giornaliera'
  const perPeriodo = new Map<Periodo, { giorni: number; prezzo: number }>()
  let mancante = false

  for (let d = new Date(dal); d <= al; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    const periodo = periodoDelGiorno(iso)
    const voce = tariffe.find(
      (t) => t.periodo === periodo && t.fila === fila && t.tipologia === tipologia && t.durata === durata
    )
    if (!voce) {
      mancante = true
      continue
    }
    const acc = perPeriodo.get(periodo) ?? { giorni: 0, prezzo: voce.prezzo }
    acc.giorni++
    perPeriodo.set(periodo, acc)
  }

  const dettaglioPerPeriodo = Array.from(perPeriodo.entries()).map(([periodo, v]) => ({
    periodo,
    giorni: v.giorni,
    prezzoGiorno: v.prezzo,
    subtotale: v.giorni * v.prezzo,
  }))
  const totale = dettaglioPerPeriodo.reduce((s, r) => s + r.subtotale, 0)
  const giorni = dettaglioPerPeriodo.reduce((s, r) => s + r.giorni, 0)
  return { giorni, totale, dettaglioPerPeriodo, mancante }
}
