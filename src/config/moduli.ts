/**
 * Moduli commerciali di BeachIn.
 *
 * BeachIn è venduto **a moduli**: un cliente entra con un pacchetto ridotto
 * (es. Ristorante + Sito) e può attivare gli altri in seguito (upsell).
 *
 * Questo file è l'UNICA fonte di verità di "quali moduli esistono", i testi di
 * vendita per la pagina di upsell, e i piani (bundle) predefiniti. Lo stato di
 * "quali moduli sono attivi per questo cliente" vive nel `ModuliContext`
 * (oggi in memoria/localStorage; domani un campo per-cliente nel DB).
 */

export type ModuloId =
  | 'panoramica'
  | 'cruscotto'
  | 'arenile'
  | 'clienti'
  | 'tariffe'
  | 'bar'
  | 'ristorante'
  | 'assistente-vocale'
  | 'comande'
  | 'sala'
  | 'bar-tavolo'
  | 'costi'
  | 'conto-economico'
  | 'personale'
  | 'eventi'
  | 'sito'
  | 'impostazioni'

export interface InfoModulo {
  id: ModuloId
  nome: string
  /** Frase breve per la pagina di upsell. */
  sottotitolo: string
  /** Cosa ci guadagna il cliente: 2–4 punti per la vendita. */
  vantaggi: string[]
  /** Core: sempre attivo, non vendibile, senza lucchetto. */
  core?: boolean
}

export const MODULI: Record<ModuloId, InfoModulo> = {
  panoramica: {
    id: 'panoramica',
    nome: 'Panoramica',
    sottotitolo: 'La giornata in un colpo d’occhio sui moduli attivi.',
    vantaggi: [],
    core: true,
  },
  impostazioni: {
    id: 'impostazioni',
    nome: 'Impostazioni',
    sottotitolo: 'Anagrafica, parametri e gestione dei moduli.',
    vantaggi: [],
    core: true,
  },
  ristorante: {
    id: 'ristorante',
    nome: 'Ristorante',
    sottotitolo: 'Menù, prenotazioni tavoli, coperti e margini.',
    vantaggi: ['Menù con food cost e marginalità', 'Prenotazioni per turno e mappa tavoli', 'Piatti più venduti e meno redditizi'],
  },
  'assistente-vocale': {
    id: 'assistente-vocale',
    nome: 'Assistente vocale',
    sottotitolo: 'Gestisci il menù parlando: aggiungi, cambia prezzo, rinomina.',
    vantaggi: ['Modifiche al menù a voce, mani libere in cucina', 'Risposte vocali di conferma', 'Nessun hardware: usa il browser'],
  },
  comande: {
    id: 'comande',
    nome: 'Comande ombrellone',
    sottotitolo: 'Ordini al bar direttamente dall’ombrellone.',
    vantaggi: ['Ordini bar per numero di ombrellone', 'Coda comande al bar con stato (nuova → presa in carico → pronta), ComandApp per il bagnante con campanello', 'Servizio in spiaggia più rapido'],
  },
  sala: {
    id: 'sala',
    nome: 'Comande ristorante',
    sottotitolo: 'Dal tavolo alla cucina: cameriere col palmare o tablet self-service.',
    vantaggi: ['Il cameriere prende la comanda per tavolo e la manda subito in cucina', 'Tablet al tavolo: il cliente sfoglia il menu con foto e ordina da solo', 'Monitor cucina con stati (inviata → in preparazione → pronta → servita) e campanello'],
  },
  'bar-tavolo': {
    id: 'bar-tavolo',
    nome: 'Bar al tavolo',
    sottotitolo: 'Bevande del listino bar nelle comande del ristorante, con una coda unica al bar.',
    vantaggi: ['Il cameriere passa da Cucina a Bar nello stesso ordine: un solo conto per tavolo', 'La cucina vede solo i piatti, il bar solo le bevande', 'Coda unica al bar: tavoli del ristorante e ombrelloni insieme'],
  },
  sito: {
    id: 'sito',
    nome: 'Sito internet',
    sottotitolo: 'Vetrina pubblica e prenotazioni online sincronizzate.',
    vantaggi: ['Sito pubblico con listino e disponibilità reali', 'Prenotazioni online → conferma dal gestionale', 'Recensioni, contenuti e posta cliente'],
  },
  cruscotto: {
    id: 'cruscotto',
    nome: 'Cruscotto completo',
    sottotitolo: 'La regia di tutta la struttura: KPI, andamento e alert.',
    vantaggi: ['Incassi e occupazione di tutti i centri', 'Grafici degli ultimi 30 giorni e confronto anno scorso', 'Alert operativi e meteo dei prossimi giorni'],
  },
  arenile: {
    id: 'arenile',
    nome: 'Arenile',
    sottotitolo: 'La pianta interattiva dello stabilimento.',
    vantaggi: ['Pianta vista dall’alto con ogni ombrellone cliccabile', 'Assegnazione, spostamento e stati delle postazioni', 'Conti bar aperti per postazione'],
  },
  clienti: {
    id: 'clienti',
    nome: 'Clienti',
    sottotitolo: 'Anagrafiche, storico e saldi.',
    vantaggi: ['Schede cliente con tipologia e presenze', 'Valore stagione e saldi aperti', 'Postazione preferita e note'],
  },
  tariffe: {
    id: 'tariffe',
    nome: 'Tariffe',
    sottotitolo: 'Listini per periodo e fila, con simulatore.',
    vantaggi: ['Matrice prezzi per periodo, fila e tipologia', 'Simulatore preventivo immediato', 'Pubblicazione del listino sul sito'],
  },
  bar: {
    id: 'bar',
    nome: 'Bar',
    sottotitolo: 'Vendite, listino e conti ombrellone.',
    vantaggi: ['Listino con costo e giacenze', 'Scontrino medio e vendite per categoria', 'Conti aperti collegati alle postazioni'],
  },
  costi: {
    id: 'costi',
    nome: 'Costi',
    sottotitolo: 'Tutte le voci di spesa, con scadenze.',
    vantaggi: ['Costi per categoria e centro', 'Scadenze e stato dei pagamenti', 'Base per il conto economico'],
  },
  'conto-economico': {
    id: 'conto-economico',
    nome: 'Conto economico',
    sottotitolo: 'Ricavi e costi per centro, margine e break-even.',
    vantaggi: ['Margine per centro di ricavo', 'Break-even e indicatori chiave', 'Vista mensile della stagione'],
  },
  personale: {
    id: 'personale',
    nome: 'Personale',
    sottotitolo: 'Organico, turni e costo del lavoro.',
    vantaggi: ['Anagrafica dipendenti e contratti', 'Turni settimanali', 'Costo aziendale e incidenza sul lavoro'],
  },
  eventi: {
    id: 'eventi',
    nome: 'Eventi',
    sottotitolo: 'Calendario, conto e prenotazioni degli eventi.',
    vantaggi: ['Calendario eventi con budget e ricavi', 'Card con foto pubblicate sul sito', 'Prenotazioni e partecipanti confermati'],
  },
}

/** Moduli sempre attivi, in qualsiasi piano. */
export const MODULI_CORE: ModuloId[] = (Object.values(MODULI) as InfoModulo[])
  .filter((m) => m.core)
  .map((m) => m.id)

export interface Piano {
  id: string
  nome: string
  descrizione: string
  moduli: ModuloId[]
}

/** Piani/bundle commerciali. Un piano è semplicemente un insieme di moduli. */
export const PIANI: Record<string, Piano> = {
  ristorante_web: {
    id: 'ristorante_web',
    nome: 'Ristorante & Web',
    descrizione: 'Menù, prenotazioni ristorante, comande, eventi e presenza online.',
    moduli: ['panoramica', 'ristorante', 'assistente-vocale', 'bar', 'comande', 'sala', 'bar-tavolo', 'eventi', 'sito', 'impostazioni'],
  },
  completo: {
    id: 'completo',
    nome: 'Suite completa',
    descrizione: 'Tutti i moduli dello stabilimento.',
    moduli: (Object.keys(MODULI) as ModuloId[]),
  },
}

export const PIANO_DEFAULT = 'ristorante_web'

/**
 * Funzionalità dentro i moduli (le schede `?tab=` delle pagine). Secondo livello di attivazione:
 * il cliente può avere un modulo ma non tutte le sue funzionalità (es. Eventi con il Calendario ma senza Presenze),
 * e un ruolo può avere permessi diversi per funzionalità (chiave `modulo.scheda` in `ruoli.permessi`).
 * Una funzionalità nuova nasce attiva: lo stato salva solo quelle spente.
 */
export interface InfoFunzione {
  id: string
  modulo: ModuloId
  /** Valore di `?tab=` nella pagina del modulo. */
  scheda: string
  nome: string
}

const f = (modulo: ModuloId, scheda: string, nome: string): InfoFunzione => ({ id: `${modulo}.${scheda}`, modulo, scheda, nome })

export const FUNZIONI: InfoFunzione[] = [
  f('bar', 'listino', 'Listino'),
  f('bar', 'conti', 'Conti e giornata'),
  f('ristorante', 'prenotazioni', 'Prenotazioni'),
  f('ristorante', 'tavoli', 'Tavoli'),
  f('ristorante', 'menu', 'Menu'),
  f('ristorante', 'magazzino', 'Magazzino'),
  f('ristorante', 'giorni', 'Gestione giorni'),
  f('sala', 'cameriere', 'Comande cameriere'),
  f('sala', 'cucina', 'Monitor cucina'),
  f('sala', 'self', 'Tablet self-service'),
  f('sala', 'qr', 'Ordini col QR del tavolo'),
  f('eventi', 'calendario', 'Calendario'),
  f('eventi', 'presenze', 'Presenze e ingressi (scanner)'),
  f('sito', 'panoramica', 'Panoramica'),
  f('sito', 'prenotazioni', 'Prenotazioni online'),
  f('sito', 'posta', 'Posta'),
  f('sito', 'contenuti', 'Contenuti'),
  f('sito', 'interazioni', 'Recensioni e messaggi'),
  f('sito', 'marketing', 'Sito e marketing'),
  f('sito', 'app', 'App clienti'),
]

export const funzioniDi = (modulo: ModuloId) => FUNZIONI.filter((x) => x.modulo === modulo)
export const idFunzione = (modulo: ModuloId, scheda: string) => `${modulo}.${scheda}`
