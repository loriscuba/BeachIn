/**
 * Tipi del dominio BeachIn.
 * Unico punto in cui vivono le interfacce: i seed producono questi tipi,
 * l'api li restituisce, le pagine li consumano.
 */

// ————————————————————————————————————————————————————————————
// Calendario / serie giornaliera (fonte di verità dei numeri)
// ————————————————————————————————————————————————————————————

export type Periodo = 'bassa' | 'media' | 'alta' | 'altissima'
export type Meteo = 'sole' | 'poco_nuvoloso' | 'nuvoloso' | 'pioggia' | 'temporale'
export type Fascia = 'mattina' | 'pranzo' | 'pomeriggio' | 'sera'

/** Un giorno della stagione. Sommando questi record si ottengono tutti i totali. */
export interface GiornoStagione {
  data: string // ISO gg
  periodo: Periodo
  meteo: Meteo
  tempMax: number
  consuntivo: boolean // true se data <= oggi (dato reale), false se proiezione
  // Occupazione
  postazioniOccupate: number
  occupazione: number // frazione 0–1
  presenze: number
  // Ristorazione
  copertiPranzo: number
  copertiCena: number
  // Incassi per centro
  incassoSpiaggia: number
  incassoBar: number
  incassoRistorante: number
  incassoNoleggi: number
  incassoEventi: number
  scontrinoMedioBar: number
  // Confronto anno precedente (stessa data 2025)
  occupazioneAnnoScorso: number
  incassoSpiaggiaAnnoScorso: number
}

// ————————————————————————————————————————————————————————————
// Arenile
// ————————————————————————————————————————————————————————————

export type FilaId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'

export type TipologiaPostazione =
  | 'ombrellone_2_lettini'
  | 'ombrellone_2_sdraio'
  | 'ombrellone_lettino_sdraio'
  | 'gazebo'
  | 'tenda'

export type StatoPostazione =
  | 'libera'
  | 'occupata'
  | 'prenotata'
  | 'stagionale'
  | 'fuori_servizio'

export interface Postazione {
  id: string // es. "A-01"
  fila: FilaId
  numero: number // 1..20
  tipologia: TipologiaPostazione
  stato: StatoPostazione
  clienteId?: string
  periodoDal?: string
  periodoAl?: string
  tariffaApplicata?: number // € per il periodo assegnato
  contoBarId?: string
  note?: string
}

export type StatoStruttura = 'libera' | 'occupata' | 'stagionale' | 'manutenzione'

export interface Cabina {
  id: string
  numero: number
  stato: StatoStruttura
  clienteId?: string
}

export interface Armadietto {
  id: string
  numero: number
  stato: StatoStruttura
  clienteId?: string
}

export interface Doccia {
  id: string
  numero: number
  tipo: 'fredda' | 'calda'
}

export interface Torretta {
  id: string
  nome: string
  fila: FilaId
}

// ————————————————————————————————————————————————————————————
// Clienti
// ————————————————————————————————————————————————————————————

export type TipologiaCliente =
  | 'stagionale'
  | 'mensile'
  | 'quindicinale'
  | 'settimanale'
  | 'giornaliero'
  | 'occasionale'

export interface Cliente {
  id: string
  nome: string
  cognome: string
  telefono: string
  email: string
  tipologia: TipologiaCliente
  componenti: number
  conBambini: boolean
  postazionePreferita?: string
  postazioneId?: string // assegnata in stagione (per stagionali/periodici)
  clienteDaAnni: number
  saldoAperto: number
  valoreStagione: number // € generato nella stagione corrente
  note?: string
}

// ————————————————————————————————————————————————————————————
// Tariffe
// ————————————————————————————————————————————————————————————

export type Durata =
  | 'giornaliera'
  | 'mezza_giornata'
  | 'settimanale'
  | 'quindicinale'
  | 'mensile'
  | 'stagionale'

export type StatoListino = 'bozza' | 'pubblicato'

export interface VoceTariffa {
  id: string
  periodo: Periodo
  fila: FilaId
  tipologia: TipologiaPostazione
  durata: Durata
  prezzo: number
  validaDal: string
  validaAl: string
  stato: StatoListino
}

export type CategoriaAccessoria =
  | 'ingresso'
  | 'servizi'
  | 'noleggio'
  | 'parcheggio'
  | 'sconto'

export interface TariffaAccessoria {
  id: string
  nome: string
  categoria: CategoriaAccessoria
  prezzo: number // negativo per gli sconti (in %) → vedi campo percentuale
  percentuale?: boolean // se true, prezzo è uno sconto in %
  unita: string // "al giorno", "a settimana", "una tantum"...
  stato: StatoListino
}

// ————————————————————————————————————————————————————————————
// Bar
// ————————————————————————————————————————————————————————————

export type CategoriaBar =
  | 'caffetteria'
  | 'bibite'
  | 'birre'
  | 'cocktail'
  | 'gelati'
  | 'snack'
  | 'gastronomia'

export interface ArticoloBar {
  id: string
  nome: string
  categoria: CategoriaBar
  prezzoVendita: number
  costoAcquisto: number
  giacenza: number
  sogliaRiordino: number
  unita: string
}

export interface RigaConto {
  articoloId: string
  nome: string
  quantita: number
  prezzoUnitario: number
  ora: string
}

export interface ContoOmbrellone {
  id: string
  postazioneId: string
  clienteId?: string
  aperto: boolean
  righe: RigaConto[]
  apertoIl: string
}

export interface VenditaBarGiorno {
  data: string
  incasso: number
  costoMerce: number
  numScontrini: number
  scontrinoMedio: number
  perCategoria: Record<CategoriaBar, number>
  perFascia: Record<Fascia, number>
}

// ————————————————————————————————————————————————————————————
// Ristorante
// ————————————————————————————————————————————————————————————

export type CategoriaPiatto =
  | 'antipasti'
  | 'primi'
  | 'secondi'
  | 'contorni'
  | 'pizze'
  | 'dolci'
  | 'bevande'

export type Allergene =
  | 'glutine'
  | 'crostacei'
  | 'uova'
  | 'pesce'
  | 'arachidi'
  | 'soia'
  | 'latte'
  | 'frutta_guscio'
  | 'sedano'
  | 'molluschi'

export interface Piatto {
  id: string
  nome: string
  categoria: CategoriaPiatto
  prezzo: number
  foodCost: number // € costo materia prima
  allergeni: Allergene[]
  vendutiStagione: number
}

export type Turno = 'pranzo' | 'cena'
export type StatoPrenotazione = 'confermata' | 'in_attesa' | 'annullata'

export interface Tavolo {
  id: string
  numero: number
  posti: number
  zona: 'veranda' | 'sala' | 'terrazza'
}

export interface PrenotazioneRistorante {
  id: string
  data: string
  turno: Turno
  nome: string
  coperti: number
  tavoloId?: string
  stato: StatoPrenotazione
  note?: string
}

export interface ServizioRistoranteGiorno {
  data: string
  turno: Turno
  coperti: number
  scontrinoMedio: number
  incasso: number
}

// ————————————————————————————————————————————————————————————
// Costi
// ————————————————————————————————————————————————————————————

export type CentroCosto =
  | 'spiaggia'
  | 'bar'
  | 'ristorante'
  | 'noleggi'
  | 'eventi'
  | 'struttura'

export type Ricorrenza = 'una_tantum' | 'mensile' | 'annuale' | 'stagionale'
export type TipoCosto = 'fisso' | 'variabile'
export type StatoPagamento = 'pagato' | 'da_pagare' | 'scaduto'
export type MetodoPagamento = 'bonifico' | 'rid' | 'carta' | 'contanti' | 'f24'

export interface VoceCosto {
  id: string
  categoria: string
  sottocategoria: string
  fornitore: string
  imponibile: number
  iva: number // aliquota es. 0.22
  ricorrenza: Ricorrenza
  tipo: TipoCosto
  centroCosto: CentroCosto
  data: string
  scadenza?: string
  statoPagamento: StatoPagamento
  metodo: MetodoPagamento
}

// ————————————————————————————————————————————————————————————
// Personale
// ————————————————————————————————————————————————————————————

export type RuoloDipendente =
  | 'assistente_bagnanti'
  | 'cassa_reception'
  | 'barista'
  | 'cameriere'
  | 'cuoco'
  | 'aiuto_cuoco'
  | 'pulizie'
  | 'manutentore'

export type TipoContratto =
  | 'stagionale'
  | 'tempo_determinato'
  | 'tempo_indeterminato'
  | 'extra'

export interface TurnoLavoro {
  giorno: number // 0 = lunedì ... 6 = domenica
  inizio: string
  fine: string
}

export interface Dipendente {
  id: string
  nome: string
  cognome: string
  ruolo: RuoloDipendente
  inquadramento: string
  tipoContratto: TipoContratto
  periodoDal: string
  periodoAl: string
  oreContrattoSettimana: number
  oreLavorateSettimana: number
  costoOrarioLordo: number
  costoAziendaleMensile: number
  turni: TurnoLavoro[]
}

// ————————————————————————————————————————————————————————————
// Eventi
// ————————————————————————————————————————————————————————————

export type TipoEvento =
  | 'sport'
  | 'musica'
  | 'festa'
  | 'gastronomia'
  | 'benessere'
  | 'privato'

export interface Evento {
  id: string
  nome: string
  tipo: TipoEvento
  data: string
  budget: number
  costiSostenuti: number
  ricavi: number
  partecipanti: number
  descrizione: string
}

// ————————————————————————————————————————————————————————————
// Sito
// ————————————————————————————————————————————————————————————

export interface PaginaSito {
  id: string
  slug: string
  titolo: string
  pubblicata: boolean
  aggiornata: string
}

export interface ContenutoHome {
  titolo: string
  sottotitolo: string
  testo: string
  immagine: string // etichetta descrittiva (placeholder)
}

export interface FotoGalleria {
  id: string
  titolo: string
  ordine: number
}

export interface NewsSito {
  id: string
  titolo: string
  data: string
  testo: string
  pubblicata: boolean
}

export type StatoPrenotazioneOnline = 'da_confermare' | 'confermata' | 'rifiutata'

export interface PrenotazioneOnline {
  id: string
  ricevutaIl: string
  nome: string
  email: string
  telefono: string
  dal: string
  al: string
  tipologiaPostazione: TipologiaPostazione
  persone: number
  stato: StatoPrenotazioneOnline
  messaggio?: string
}

export interface MessaggioContatto {
  id: string
  data: string
  nome: string
  email: string
  oggetto: string
  messaggio: string
  letto: boolean
}

export interface Recensione {
  id: string
  autore: string
  data: string
  voto: number // 1–5
  testo: string
  pubblicata: boolean
}

export interface StatoSito {
  pagine: PaginaSito[]
  home: ContenutoHome
  galleria: FotoGalleria[]
  news: NewsSito[]
  prenotazioni: PrenotazioneOnline[]
  messaggi: MessaggioContatto[]
  recensioni: Recensione[]
  seo: { titolo: string; descrizione: string; keyword: string[] }
  visite: { data: string; visite: number; unici: number }[]
}

// ————————————————————————————————————————————————————————————
// Viste derivate (calcolate in api.ts / lib/calcoli.ts)
// ————————————————————————————————————————————————————————————

export interface ContatoriArenile {
  totali: number
  libere: number
  occupate: number
  prenotate: number
  stagionali: number
  fuoriServizio: number
  occupazione: number // frazione
}

export interface RigaContoEconomico {
  centro: CentroCosto
  ricavi: number
  costi: number
  margine: number
}

export interface ContoEconomico {
  righe: RigaContoEconomico[]
  ricaviTotali: number
  costiTotali: number
  costiFissi: number
  costiVariabili: number
  margine: number
  breakEven: number // ricavi necessari a coprire i fissi
  indicatori: {
    costoPerOmbrelloneGiorno: number
    ricavoPerPostazione: number
    ricavoPerPresenza: number
    incidenzaPersonale: number
    incidenzaMerce: number
  }
}

export interface KpiCruscotto {
  oggi: GiornoStagione
  incassoOggi: number
  occupazioneOggi: number
  occupazioneAnnoScorso: number
  copertiPranzo: number
  copertiCena: number
  scontrinoMedioBar: number
  presenze: number
  ultimi30: GiornoStagione[]
}
