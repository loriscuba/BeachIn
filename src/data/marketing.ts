/**
 * Sito e marketing — dati di esempio (seed fisso) per il cruscotto del titolare:
 * visite al sito, interazioni, provenienza, Google (Search Console + Profilo
 * dell'attività), recensioni Tripadvisor e salute del sito.
 *
 * Modulo unico e puro: la UI chiama solo `getMarketing(periodo)`. Per passare ai
 * dati veri basta sostituire il corpo di quella funzione con le chiamate alle API
 * (Cloudflare Web Analytics/Umami, Search Console, Business Profile, Tripadvisor),
 * restituendo lo stesso tipo `DatiMarketing`. Nessuna chiamata di rete qui.
 *
 * Coerenza (verificata da `npm test`):
 * - totali di periodo = somma dei giorni; la stagione = somma dei quattro mesi;
 * - clic da Google ricerca = provenienza "Google, ricerca" (~41% delle visite);
 * - clic sul sito dal profilo = provenienza "Google Maps" (~17%);
 * - apparizioni ≈ 5,8 × visite, % clic ≈ 7%; interazioni 11–18%, visitatori 70–76%.
 */
import { config } from './config'
import { creaRng, type Rng } from './seed/_rng'

export type PeriodoMarketing = 'giugno' | 'luglio' | 'agosto' | 'settembre' | 'stagione'

export const PERIODI_MARKETING: { valore: PeriodoMarketing; etichetta: string }[] = [
  { valore: 'giugno', etichetta: 'Giugno' },
  { valore: 'luglio', etichetta: 'Luglio' },
  { valore: 'agosto', etichetta: 'Agosto' },
  { valore: 'settembre', etichetta: 'Settembre' },
  { valore: 'stagione', etichetta: 'Tutta la stagione' },
]

export type Azione = 'prenota' | 'chiama' | 'whatsapp' | 'indicazioni' | 'menu'
export type Provenienza = 'ricerca' | 'maps' | 'diretto' | 'instagram' | 'tripadvisor' | 'altri'

export const ETICHETTE_AZIONI: Record<Azione, string> = {
  prenota: 'Prenota un ombrellone',
  chiama: 'Chiama',
  whatsapp: 'Scrivi su WhatsApp',
  indicazioni: 'Indicazioni stradali',
  menu: 'Menù del ristorante',
}

export const ETICHETTE_PROVENIENZE: Record<Provenienza, string> = {
  ricerca: 'Google, ricerca',
  maps: 'Google Maps',
  diretto: 'Diretto',
  instagram: 'Instagram',
  tripadvisor: 'Tripadvisor',
  altri: 'Altri siti',
}

export interface GiornoWeb {
  data: string // yyyy-MM-dd
  visite: number
  visitatori: number
  interazioni: number
}

export interface RicercaGoogle {
  query: string
  apparizioni: number
  clic: number
  posizione: number
}

export interface Metriche {
  giorni: GiornoWeb[]
  visite: number
  visitatori: number
  interazioni: number
  /** Clic sui pulsanti del sito: la somma è `interazioni`. */
  azioni: Record<Azione, number>
  /** Visite per provenienza: la somma è `visite`. */
  provenienze: Record<Provenienza, number>
  pagine: { pagina: string; visualizzazioni: number }[]
  /** Google Search Console. `clic` = provenienze.ricerca. */
  google: { apparizioni: number; clic: number; posizione: number }
  ricerche: RicercaGoogle[]
  /** Profilo dell'attività su Google. `clicSito` = provenienze.maps. */
  profilo: { visualizzazioni: number; daMaps: number; daRicerca: number; chiamate: number; indicazioni: number; clicSito: number }
}

export interface PuntoSerie {
  etichetta: string
  visite: number
  interazioni: number
}

export interface DatiMarketing {
  periodo: PeriodoMarketing
  etichetta: string
  dal: string
  al: string
  attuale: Metriche
  /** Stesso periodo della stagione 2025. */
  precedente: Metriche
  /** Giornaliera per i mesi, media giornaliera per settimana per la stagione. */
  serie: PuntoSerie[]
  serieSettimanale: boolean
  /** Postazioni prenotabili a giornata (totali − abbonati stagionali): metro per le richieste. */
  postiGiornalieri: number
  tripadvisor: Tripadvisor
  salute: SaluteSito
}

export interface Tripadvisor {
  voto: number
  recensioni: number
  distribuzione: { bolle: 1 | 2 | 3 | 4 | 5; numero: number }[]
  esempi: { voto: number; titolo: string; testo: string; autore: string; mese: string }[]
}

export interface SaluteSito {
  punteggio: number
  controlli: { stato: 'ok' | 'da_sistemare'; titolo: string; dettaglio: string }[]
  vitali: { nome: string; valore: string; esito: 'buono' | 'da_migliorare'; soglia: string }[]
}

// ---------------------------------------------------------------- costanti

const ANNO = config.stagione.anno // 2026
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const MESE_DI: Record<Exclude<PeriodoMarketing, 'stagione'>, number> = { giugno: 5, luglio: 6, agosto: 7, settembre: 8 }

/** Abbonati stagionali (vedi seed/clienti.ts): i loro posti non si prenotano dal sito. */
const STAGIONALI = 60

/** Visite di un giorno feriale al picco (metà agosto) — 2025 con ~24% in meno. */
const BASE = { [ANNO]: 190, [ANNO - 1]: 153 } as Record<number, number>

const PESI_AZIONI: Record<Azione, number> = { prenota: 0.34, chiama: 0.24, whatsapp: 0.19, indicazioni: 0.13, menu: 0.1 }
const PESI_PROVENIENZE: Record<Provenienza, number> = { ricerca: 0.41, maps: 0.17, diretto: 0.18, instagram: 0.12, tripadvisor: 0.08, altri: 0.04 }
const PESI_PAGINE: [string, number][] = [
  ['Home', 0.3],
  ['Listino e abbonamenti', 0.17],
  ['Ristorante e menù', 0.15],
  ['Prenota un ombrellone', 0.13],
  ['Eventi e serate', 0.09],
  ['Bar e aperitivi', 0.08],
  ['Dove siamo e come arrivare', 0.08],
]
/** Visualizzazioni di pagina per visita. */
const PAGINE_PER_VISITA = 2.3

/** Percentuale di clic media su Google (2026 vs 2025). */
const CTR = { [ANNO]: 0.0705, [ANNO - 1]: 0.066 } as Record<number, number>
/** Posizione media per mese (giu–set). */
const POSIZIONE = { [ANNO]: [6.1, 5.8, 5.4, 5.6], [ANNO - 1]: [7.4, 7.2, 7.0, 7.1] } as Record<number, number[]>

const loc = config.localita.replace(/\s*\(.*\)/, '').toLowerCase() // "savona"
const nome = config.nome.toLowerCase() // "lido dei pini"
/** Le 10 ricerche principali: [query, quota delle apparizioni, % clic, posizione base]. */
const RICERCHE: [string, number, number, number][] = [
  [`stabilimento balneare ${loc}`, 0.2, 0.045, 4.6],
  [`spiagge ${loc}`, 0.14, 0.022, 8.4],
  [`ristorante sul mare ${loc}`, 0.08, 0.041, 5.3],
  [`${nome} ${loc}`, 0.07, 0.3, 1.1],
  [`spiaggia attrezzata ${loc}`, 0.07, 0.038, 5.7],
  [`lido con ristorante ${loc}`, 0.05, 0.052, 4.2],
  [`prenotare ombrellone ${loc}`, 0.04, 0.055, 3.9],
  [nome, 0.03, 0.3, 1.0],
  [`bagni via nizza ${loc}`, 0.02, 0.12, 2.4],
  [`${nome} menù`, 0.015, 0.28, 1.3],
]

// ---------------------------------------------------------------- generatore

const iso = (a: number, m: number, g: number) => `${a}-${String(m + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`

/** Serie giornaliera 1 giugno – 30 settembre di un anno. */
function serieAnno(anno: number): GiornoWeb[] {
  const rng = creaRng(anno * 7 + 11)
  const out: GiornoWeb[] = []
  for (let d = 0; d < 122; d++) {
    const dt = new Date(Date.UTC(anno, 5, 1 + d))
    const dow = dt.getUTCDay()
    // Picco a Ferragosto (giorno 75), giugno/settembre intorno a un terzo del picco:
    // la salita è lenta, dopo Ferragosto il calo è più rapido (scuole, rientri).
    const stagione = 0.3 + 0.7 * Math.exp(-(((d - 75) / (d < 75 ? 32 : 17)) ** 2))
    const sett = dow === 0 || dow === 6 ? 1.28 : dow === 1 ? 0.85 : dow === 5 ? 1.1 : 1
    const visite = Math.round(BASE[anno] * stagione * sett * (0.9 + 0.2 * rng()))
    out.push({
      data: iso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
      visite,
      visitatori: Math.round(visite * (0.7 + 0.06 * rng())),
      interazioni: Math.round(visite * (0.11 + 0.07 * rng())),
    })
  }
  return out
}

const SERIE: Record<number, GiornoWeb[]> = { [ANNO]: serieAnno(ANNO), [ANNO - 1]: serieAnno(ANNO - 1) }

const somma = <T,>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0)

/** Ripartisce `totale` secondo i pesi (con un po' di variazione) senza perdere unità. */
function ripartisci<K extends string>(totale: number, pesi: Record<K, number>, rng: Rng): Record<K, number> {
  const chiavi = Object.keys(pesi) as K[]
  const w = chiavi.map((k) => pesi[k] * (0.96 + 0.08 * rng()))
  const sw = w.reduce((s, x) => s + x, 0)
  const esatti = w.map((x) => (totale * x) / sw)
  const base = esatti.map(Math.floor)
  let resto = totale - base.reduce((s, x) => s + x, 0)
  esatti
    .map((x, i) => [x - Math.floor(x), i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (resto > 0) { base[i]++; resto-- } })
  return Object.fromEntries(chiavi.map((k, i) => [k, base[i]])) as Record<K, number>
}

function metricheMese(anno: number, mese: number): Metriche {
  const giorni = SERIE[anno].filter((g) => Number(g.data.slice(5, 7)) === mese + 1)
  const rng = creaRng(anno * 100 + mese)
  const j = (min: number, max: number) => min + (max - min) * rng()

  const visite = somma(giorni, (g) => g.visite)
  const visitatori = somma(giorni, (g) => g.visitatori)
  const interazioni = somma(giorni, (g) => g.interazioni)
  const azioni = ripartisci(interazioni, PESI_AZIONI, rng)
  const provenienze = ripartisci(visite, PESI_PROVENIENZE, rng)
  const pagine = Object.entries(
    ripartisci(Math.round(visite * PAGINE_PER_VISITA), Object.fromEntries(PESI_PAGINE) as Record<string, number>, rng),
  ).map(([pagina, visualizzazioni]) => ({ pagina, visualizzazioni }))

  const clic = provenienze.ricerca
  const apparizioni = Math.round(clic / (CTR[anno] * j(0.97, 1.03)))
  const posMese = POSIZIONE[anno][mese - 5]
  const ricerche = RICERCHE.map(([query, quota, ctr, pos]) => {
    const qa = Math.round(apparizioni * quota * j(0.94, 1.06))
    return {
      query,
      apparizioni: qa,
      clic: Math.round(qa * ctr * j(0.92, 1.08)),
      posizione: Math.max(1, Math.round((pos * (posMese / 5.7) + (rng() - 0.5) * 0.4) * 10) / 10),
    }
  })

  const viste = Math.round(visite * 7.5 * j(0.97, 1.03))
  const daMaps = Math.round(viste * 0.62)
  return {
    giorni, visite, visitatori, interazioni, azioni, provenienze, pagine,
    google: { apparizioni, clic, posizione: posMese },
    ricerche,
    profilo: {
      visualizzazioni: viste, daMaps, daRicerca: viste - daMaps,
      chiamate: Math.round(visite * 0.11 * j(0.95, 1.05)),
      indicazioni: Math.round(visite * 0.16 * j(0.95, 1.05)),
      clicSito: provenienze.maps,
    },
  }
}

/** Somma di più mesi: conteggi sommati, posizioni medie pesate sulle apparizioni. */
function sommaMetriche(mesi: Metriche[]): Metriche {
  const sommaRec = <K extends string>(f: (m: Metriche) => Record<K, number>) => {
    const out = {} as Record<K, number>
    for (const m of mesi) for (const [k, v] of Object.entries(f(m)) as [K, number][]) out[k] = (out[k] ?? 0) + v
    return out
  }
  const mediaPos = (righe: { apparizioni: number; posizione: number }[]) =>
    Math.round((somma(righe, (r) => r.apparizioni * r.posizione) / somma(righe, (r) => r.apparizioni)) * 10) / 10
  const pagine = mesi[0].pagine.map((p, i) => ({ pagina: p.pagina, visualizzazioni: somma(mesi, (m) => m.pagine[i].visualizzazioni) }))
  const ricerche = mesi[0].ricerche.map((r, i) => {
    const righe = mesi.map((m) => m.ricerche[i])
    return { query: r.query, apparizioni: somma(righe, (x) => x.apparizioni), clic: somma(righe, (x) => x.clic), posizione: mediaPos(righe) }
  })
  return {
    giorni: mesi.flatMap((m) => m.giorni),
    visite: somma(mesi, (m) => m.visite),
    visitatori: somma(mesi, (m) => m.visitatori),
    interazioni: somma(mesi, (m) => m.interazioni),
    azioni: sommaRec((m) => m.azioni),
    provenienze: sommaRec((m) => m.provenienze),
    pagine,
    google: {
      apparizioni: somma(mesi, (m) => m.google.apparizioni),
      clic: somma(mesi, (m) => m.google.clic),
      posizione: mediaPos(mesi.map((m) => m.google)),
    },
    ricerche,
    profilo: sommaRec((m) => m.profilo),
  }
}

function metriche(anno: number, periodo: PeriodoMarketing): Metriche {
  if (periodo !== 'stagione') return metricheMese(anno, MESE_DI[periodo])
  return sommaMetriche([5, 6, 7, 8].map((m) => metricheMese(anno, m)))
}

const etichettaGiorno = (data: string) => `${Number(data.slice(8))} ${MESI[Number(data.slice(5, 7)) - 1]}`

function serieGrafico(giorni: GiornoWeb[], settimanale: boolean): PuntoSerie[] {
  if (!settimanale) return giorni.map((g) => ({ etichetta: etichettaGiorno(g.data), visite: g.visite, interazioni: g.interazioni }))
  const out: PuntoSerie[] = []
  for (let i = 0; i < giorni.length; i += 7) {
    const s = giorni.slice(i, i + 7)
    out.push({
      etichetta: etichettaGiorno(s[0].data),
      visite: Math.round(somma(s, (g) => g.visite) / s.length),
      interazioni: Math.round(somma(s, (g) => g.interazioni) / s.length),
    })
  }
  return out
}

// ---------------------------------------------------------------- parti fisse

/** Distribuzione coerente con voto e numero reali della scheda (4,4 su 234). */
function tripadvisor(): Tripadvisor {
  const { voto, recensioni } = config.tripadvisor
  const quote: [1 | 2 | 3 | 4 | 5, number][] = [[5, 0.62], [4, 0.25], [3, 0.07], [2, 0.03], [1, 0.03]]
  const distribuzione = quote.map(([bolle, q]) => ({ bolle, numero: Math.round(recensioni * q) }))
  distribuzione[0].numero += recensioni - somma(distribuzione, (d) => d.numero)
  return {
    voto,
    recensioni,
    distribuzione,
    esempi: [
      { voto: 5, titolo: 'Pranzo sul mare da ricordare', testo: 'Tartare di pescato freschissima e spaghetti ai gamberoni ottimi, serviti sotto il canniccio con la vista sul mare. Personale gentile.', autore: 'Giulia M.', mese: `agosto ${ANNO}` },
      { voto: 4, titolo: 'Bella spiaggia, ad agosto prenotate prima', testo: 'Ombrelloni ben distanziati e spiaggia pulita. A Ferragosto le prime file erano tutte prese: conviene prenotare dal sito con anticipo.', autore: 'Marco R.', mese: `agosto ${ANNO}` },
      { voto: 5, titolo: 'Perfetto con i bambini', testo: 'Animazione per i più piccoli, docce calde e bar comodo. Comodo da raggiungere a piedi dal centro di Savona.', autore: 'Famiglia D.', mese: `luglio ${ANNO}` },
    ],
  }
}

const SALUTE: SaluteSito = {
  punteggio: 84,
  controlli: [
    { stato: 'ok', titolo: 'Sitemap inviata', dettaglio: 'La mappa del sito è stata inviata a Google e letta senza errori.' },
    { stato: 'ok', titolo: 'Titoli e descrizioni', dettaglio: 'Le pagine principali hanno un titolo e una descrizione propri.' },
    { stato: 'ok', titolo: 'Dati dell’attività locale', dettaglio: `Indirizzo (${config.indirizzo}), orari e telefono sono leggibili da Google.` },
    { stato: 'ok', titolo: 'Connessione sicura (HTTPS)', dettaglio: 'Il sito si apre sempre in HTTPS.' },
    { stato: 'da_sistemare', titolo: 'Immagini pesanti', dettaglio: 'Tre foto della galleria superano 1 MB e rallentano il caricamento da telefono.' },
    { stato: 'da_sistemare', titolo: 'Descrizioni mancanti', dettaglio: 'La pagina “Dove siamo” non ha una descrizione per i risultati di ricerca.' },
  ],
  vitali: [
    { nome: 'Caricamento del contenuto principale', valore: '2,1 s', esito: 'buono', soglia: 'buono sotto 2,5 s' },
    { nome: 'Risposta ai tocchi', valore: '180 ms', esito: 'buono', soglia: 'buono sotto 200 ms' },
    { nome: 'Stabilità della pagina', valore: '0,12', esito: 'da_migliorare', soglia: 'buono sotto 0,1' },
  ],
}

// ---------------------------------------------------------------- API

/** Calcolo puro e sincrono (usato anche dalla verifica `npm test`). */
export function calcolaMarketing(periodo: PeriodoMarketing): DatiMarketing {
  const attuale = metriche(ANNO, periodo)
  const settimanale = periodo === 'stagione'
  return {
    periodo,
    etichetta: PERIODI_MARKETING.find((p) => p.valore === periodo)!.etichetta,
    dal: attuale.giorni[0].data,
    al: attuale.giorni[attuale.giorni.length - 1].data,
    attuale,
    precedente: metriche(ANNO - 1, periodo),
    serie: serieGrafico(attuale.giorni, settimanale),
    serieSettimanale: settimanale,
    postiGiornalieri: config.arenile.postazioniTotali - STAGIONALI,
    tripadvisor: tripadvisor(),
    salute: SALUTE,
  }
}

/** Punto di aggancio per le API reali: stessa firma, oggi dati di esempio. */
export async function getMarketing(periodo: PeriodoMarketing): Promise<DatiMarketing> {
  return calcolaMarketing(periodo)
}
