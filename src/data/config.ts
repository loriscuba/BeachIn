/**
 * Parametri dello stabilimento — TUTTO in un solo file.
 * Cambia questi valori prima della demo: il resto dell'app li legge da qui.
 *
 * Nota: in Fase 1 sono definiti i parametri di anagrafica e arenile usati
 * dallo shell e dalle intestazioni. I numeri di scala economici (incassi,
 * costi, occupazione) verranno agganciati ai seed nella Fase 2.
 */

const STAGIONE = { anno: 2026, inizio: '2026-05-01', fine: '2026-09-30' }

/**
 * "Oggi" della demo = la data REALE del dispositivo, limitata alla stagione.
 * Così l'app mostra sempre la data odierna, ma resta dentro l'intervallo per cui
 * esistono i dati (serie giornaliera, KPI): fuori stagione si ferma agli estremi.
 */
function oggiInStagione(): string {
  const d = new Date()
  const oggi = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (oggi < STAGIONE.inizio) return STAGIONE.inizio
  if (oggi > STAGIONE.fine) return STAGIONE.fine
  return oggi
}

export const config = {
  // — Anagrafica — (dati reali del cliente da fonti pubbliche: Tripadvisor, spiagge.it, TheFork)
  nome: 'Lido dei Pini',
  localita: 'Savona (SV)',
  indirizzo: 'Via Nizza, 85/R — 17100',
  telefono: '+39 349 574 5156',
  // Da farsi comunicare dal cliente (non pubblicati online): se vuoti non compaiono sul sito.
  email: '',
  sito: '',
  partitaIva: '',
  facebook: 'https://www.facebook.com/lidodeipinisavona/',
  mappa: 'https://www.google.com/maps/search/?api=1&query=Lido+dei+Pini+Via+Nizza+85R+Savona',
  // Reputazione online (Tripadvisor)
  tripadvisor: {
    voto: 4.4,
    recensioni: 234,
    classifica: '#34 su 303 ristoranti a Savona',
    url: 'https://www.tripadvisor.it/Restaurant_Review-g194908-d2464057-Reviews-Lido_Dei_Pini-Savona_Italian_Riviera_Liguria.html',
  },
  prezzoMedioRistorante: 32,

  // — Stagione —
  stagione: {
    anno: STAGIONE.anno,
    inizio: STAGIONE.inizio,
    fine: STAGIONE.fine,
    // Data "odierna": la data reale del dispositivo, limitata alla stagione.
    oggi: oggiInStagione(),
  },

  // — Orari —
  orari: {
    apertura: '08:00',
    chiusura: '19:30', // spiaggia: da confermare col cliente
    barApertura: '08:00',
    barChiusura: '23:00',
    ristorantePranzo: '12:00 – 14:30',
    ristoranteCena: '19:00 – 22:00',
    // Spiaggia da maggio a settembre, ristorante aperto tutto l'anno.
    stagioneSpiaggia: 'maggio – settembre',
  },

  // — Arenile —
  arenile: {
    // File dalla A (prima fila fronte mare) alla I
    file: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const,
    postazioniPerFila: 20,
    get postazioniTotali() {
      return this.file.length * this.postazioniPerFila
    },
    gazeboPrimaFila: 6,
    cabine: 40,
    armadietti: 24,
    docce: 8,
    torrette: 2,
  },

  // — Aliquote / fiscale —
  aliquote: {
    ivaOrdinaria: 0.22,
    ivaRidotta: 0.1, // ristorazione / somministrazione
    ivaSuperRidotta: 0.04,
    impostaRegionaleConcessione: 0.15,
  },

  // — Numeri di scala di stagione (default, correggibili) —
  // Servono come riferimento/target; i valori effettivi derivano dai seed.
  scala: {
    occupazioneMediaMin: 0.55,
    occupazioneMediaMax: 0.92,
    incassoSpiaggiaStagione: 210_000,
    incassoBarStagione: 155_000,
    incassoRistoranteStagione: 195_000,
    incassoNoleggiStagione: 30_000,
    incassoEventiStagione: 16_000,
    costiTotaliStagione: 468_000,
  },

  // — Valuta / locale —
  locale: 'it-IT',
  valuta: 'EUR',
} as const

export type Config = typeof config

/** Etichette leggibili degli stati postazione (usate in tutta l'app). */
export const STATI_POSTAZIONE = {
  libera: 'Libera',
  occupata: 'Occupata',
  prenotata: 'Prenotata',
  stagionale: 'Stagionale',
  fuori_servizio: 'Fuori servizio',
} as const

export type StatoPostazione = keyof typeof STATI_POSTAZIONE
