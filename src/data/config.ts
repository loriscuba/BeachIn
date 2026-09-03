/**
 * Parametri dello stabilimento — TUTTO in un solo file.
 * Cambia questi valori prima della demo: il resto dell'app li legge da qui.
 *
 * Nota: in Fase 1 sono definiti i parametri di anagrafica e arenile usati
 * dallo shell e dalle intestazioni. I numeri di scala economici (incassi,
 * costi, occupazione) verranno agganciati ai seed nella Fase 2.
 */

export const config = {
  // — Anagrafica —
  nome: 'Bagni BeachIn',
  localita: 'Marina di BeachIn (LU)',
  indirizzo: 'Lungomare delle Boe, 12',
  telefono: '+39 0584 000000',
  email: 'info@bagnibeachin.it',
  sito: 'www.bagnibeachin.it',
  partitaIva: '0123456789 0',

  // — Stagione —
  stagione: {
    anno: 2026,
    inizio: '2026-05-01',
    fine: '2026-09-30',
    // Data "odierna" simulata su cui si posiziona la demo
    oggi: '2026-07-15',
  },

  // — Orari —
  orari: {
    apertura: '08:00',
    chiusura: '19:30',
    barApertura: '08:30',
    barChiusura: '24:00',
    ristorantePranzo: '12:30 – 15:00',
    ristoranteCena: '19:30 – 23:00',
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
    costiTotaliStagione: 450_000,
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
