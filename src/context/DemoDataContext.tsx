/**
 * DemoDataContext — stato mutabile "in memoria" per la demo.
 * Contiene i domini su cui si clicca durante la presentazione (postazioni,
 * conti bar, costi, prenotazioni dal sito, pagine pubblicate) e le relative
 * azioni. Al refresh tutto torna allo stato iniziale dei seed: è voluto.
 *
 * Le pagine importano questo context (non i seed) per leggere/mutare lo stato
 * dal vivo; per i dati in sola lettura usano invece api.ts.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  ArticoloMagazzino,
  GiornoChiuso,
  CategoriaPiatto,
  LinguaMenu,
  Cliente,
  Comanda,
  ComandaSala,
  RigaComandaSala,
  StatoComandaSala,
  StatoRigaSala,
  TavoloQr,
  ContoOmbrellone,
  ArticoloBar,
  SezioneBar,
  Email,
  RigaComanda,
  StatoComanda,
  Evento,
  FotoGalleria,
  ContenutoHome,
  PaginaSito,
  Piatto,
  SezioneMenu,
  Postazione,
  PrenotazioneOnline,
  PrenotazioneRistorante,
  RichiestaEvento,
  RichiestaRistorante,
  RigaConto,
  StatoPostazione,
  StatoPrenotazione,
  Tavolo,
  TipologiaPostazione,
  Turno,
  VoceCosto,
  Notizia,
  VoceLavagnetta,
} from '@/data/types'

import { postazioni as seedPostazioni } from '@/data/seed/spiaggia'
import { articoliBar, sezioniBar as seedSezioniBar } from '@/data/seed/bar'
import { costi as seedCosti } from '@/data/seed/costi'
import { menu as seedMenu, sezioniMenu as seedSezioni, tavoli as seedTavoli, prenotazioniRistorante as seedPrenotazioniRist, magazzino as seedMagazzino } from '@/data/seed/ristorante'
import { traduciNome } from '@/lib/menuLingue'
import { supabase, supabaseAttivo } from '@/lib/supabase'
import { rifFoto, fotoDaRif } from '@/assets/sito'
import { useSyncSupabase, type AccessoSync } from '@/hooks/useSyncSupabase'
import { ricalcolaStato, statoRiga, uscitaChiamata, uscitaDi } from '@/lib/sala'

const CHIAVE_COMANDE = 'beachin.comande.v1'
const SUCCESSIVO: Record<StatoComanda, StatoComanda> = {
  in_attesa: 'presa_in_carico', presa_in_carico: 'in_preparazione', in_preparazione: 'pronta', pronta: 'pronta',
}
const CHIAVE_COMANDE_SALA = 'beachin.comandesala.v1'
const CHIAVE_TAVOLI_QR = 'beachin.tavoliqr.v1'
/** Codice del QR del tavolo: 10 caratteri casuali (il link non si indovina dal numero del tavolo). */
/** Comande da tenere sui dispositivi: non pagate o di oggi (le altre restano nel DB, lette su richiesta). */
const inizioOggi = () => new Date().setHours(0, 0, 0, 0)
const FILTRO_COMANDE = {
  or: () => `pagata.eq.false,ts.gte.${inizioOggi()}`,
  tieni: (r: Record<string, unknown>) => !r.pagata || Number(r.ts) >= inizioOggi(),
}
/**
 * Pagine dei clienti (fuori dal gestionale): ogni pagina scarica solo le tabelle che usa, e di prenotazioni e richieste
 * solo le colonne che servono a calcolare la disponibilità (niente nomi, telefoni, email). Le tabelle non elencate restano
 * spente. Il gestionale, l'app admin e l'app di sala restano completi. Non è una protezione: la fa il DB con le policy.
 */
const LETTURA: AccessoSync = { modo: 'lettura' }
const MENU = { menu_piatti: LETTURA, menu_sezioni: LETTURA }
const LISTINI = { ...MENU, articoli_bar: LETTURA, bar_sezioni: LETTURA, lavagnetta: LETTURA }
const SITO: Record<string, AccessoSync> = {
  ...MENU, tavoli: LETTURA, tavoli_giorno: LETTURA, giorni_chiusi: LETTURA,
  prenotazioni_ristorante: { modo: 'lettura', colonne: 'id,data,turno,ora,coperti,tavolo_id,stato' },
  richieste_ristorante: { modo: 'nuove', colonne: 'id,ricevuta_il,data,turno,ora,coperti,stato,ts' },
  richieste_eventi: { modo: 'scrittura' },
  eventi: LETTURA, galleria_sito: LETTURA, sito_contenuti: LETTURA,
}
export const PAGINE_CLIENTI: Record<string, (cerca: URLSearchParams) => Record<string, AccessoSync>> = {
  '/tavolo': () => ({ ...LISTINI, tavoli_qr: { modo: 'nuove' }, comande_sala: { modo: 'nuove' } }),
  '/menu': () => MENU,
  '/sito/anteprima': () => SITO,
  '/comandapp': () => ({
    ...SITO, ...LISTINI, notizie: LETTURA,
    comande: { modo: 'nuove', colonne: 'id,ombrellone,righe,totale,stato,ora,note,origine,ts,pagata' },
  }),
  // l'invito legge solo la sua richiesta (codice nel link)
  '/invito': (cerca) => {
    const codice = codiceDaTesto(cerca.get('c') ?? '').replace(/[^A-Z0-9]/g, '') || '-'
    return { richieste_eventi: { modo: 'lettura', filtro: { or: () => `codice.eq.${codice}`, tieni: (r) => r.codice === codice } } }
  },
}
const SPENTO: AccessoSync = { modo: 'spento' }

const codiceQr = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
import { statoSito } from '@/data/seed/sito'
import { clienti } from '@/data/seed/clienti'
import { eventi as seedEventi } from '@/data/seed/eventi'
import { notizie as seedNotizie, lavagnetta as seedLavagnetta } from '@/data/seed/app'
import { config } from '@/data/config'
import { posInZona, zonaDaPos } from '@/lib/zoneTavoli'
import { codiceDaTesto, nuovoCodiceInvito, urlInvito } from '@/lib/invitiEventi'

const clona = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))

/** Riga di `beachin.sito_contenuti`: `canali`, `home`, `listino`. */
interface ContenutoSito { id: string; valore: unknown }
const CANALI_INIZIALI = { ombrelloni: true, ristorante: true, eventi: true }
const contenutiIniziali = (): ContenutoSito[] => [
  { id: 'canali', valore: { ...CANALI_INIZIALI } },
  { id: 'home', valore: clona(statoSito.home) },
  { id: 'listino', valore: { prezzi: {} } },
]

export interface AssegnaOpzioni {
  clienteId?: string
  periodoDal?: string
  periodoAl?: string
  tariffaApplicata?: number
  stagionale?: boolean
}

export type TipoAttivita = 'postazione' | 'bar' | 'sito' | 'info'
export interface AttivitaDemo {
  id: number
  tipo: TipoAttivita
  testo: string
}

/** Dati per una richiesta ombrellone inviata dal sito pubblico. */
export interface DatiRichiestaOmbrellone {
  nome: string
  email: string
  telefono: string
  dal: string
  al: string
  tipologiaPostazione: TipologiaPostazione
  persone: number
  messaggio?: string
}

/** Dati per una richiesta tavolo al ristorante inviata dal sito pubblico. */
export interface DatiRichiestaRistorante {
  nome: string
  email: string
  telefono: string
  data: string
  turno: Turno
  ora?: string
  coperti: number
  note?: string
}

/** Dati per una richiesta di partecipazione a un evento inviata dal sito. */
export interface DatiRichiestaEvento {
  nome: string
  email: string
  telefono: string
  eventoId: string
  eventoNome: string
  eventoData: string
  persone: number
  note?: string
}

/** Dati per una prenotazione ristorante presa a mano (telefono / in loco). */
export interface DatiPrenotazioneRistorante {
  nome: string
  coperti: number
  turno: Turno
  ora?: string
  data?: string
  telefono?: string
  note?: string
  tavoloId?: string
}

export type CanalePrenotazione = 'ombrelloni' | 'ristorante' | 'eventi'
export type CanaliPrenotazione = Record<CanalePrenotazione, boolean>

export interface DatiPartecipanteEvento {
  nome: string
  eventoId: string
  eventoNome: string
  eventoData: string
  persone: number
  email?: string
  telefono?: string
  note?: string
}

/** Messaggio WhatsApp simulato inviato al cliente (anteprima a video + link wa.me). */
export interface MessaggioWhatsApp {
  id: string
  nome: string
  telefono: string
  testo: string
  esito: 'richiesta' | 'conferma' | 'rifiuto'
}

interface DemoDataValue {
  postazioni: Postazione[]
  conti: ContoOmbrellone[]
  costi: VoceCosto[]
  prenotazioniOnline: PrenotazioneOnline[]
  pagine: PaginaSito[]
  listinoPubblicato: boolean
  canaliPrenotazione: CanaliPrenotazione
  impostaCanalePrenotazione: (canale: CanalePrenotazione, attivo: boolean) => void
  /** Titolo, sottotitolo, testo e foto di apertura del sito (Sito → Contenuti). */
  homeSito: ContenutoHome
  salvaHomeSito: (home: ContenutoHome) => void
  /** Prezzi del listino ombrelloni pubblicati sul sito (id voce → prezzo), sopra quelli iniziali. */
  prezziListino: Record<string, number>
  /** Prezzi cambiati in Tariffe e non ancora pubblicati. `null` toglie la modifica. */
  bozzaListino: Record<string, number>
  modificaPrezzoListino: (id: string, prezzo: number | null) => void

  // Azioni arenile
  assegnaPostazione: (id: string, opz: AssegnaOpzioni) => void
  liberaPostazione: (id: string) => void
  spostaPostazione: (daId: string, aId: string) => void
  segnaFuoriServizio: (id: string, note?: string) => void
  cambiaStato: (id: string, stato: StatoPostazione) => void

  // Bar
  incassaConto: (contoId: string) => void
  /** Listino bar condiviso (gestionale, ComandApp, Comande): categorie + articoli modificabili. */
  sezioniBar: SezioneBar[]
  articoliBar: ArticoloBar[]
  aggiungiSezioneBar: (nome: string) => SezioneBar
  rinominaSezioneBar: (id: string, nome: string) => void
  spostaSezioneBar: (id: string, verso: -1 | 1) => void
  /** Elimina la categoria (solo se vuota). */
  rimuoviSezioneBar: (id: string) => void
  aggiungiArticoloBar: (dati: Omit<ArticoloBar, 'id'>) => ArticoloBar
  modificaArticoloBar: (id: string, patch: Partial<Omit<ArticoloBar, 'id'>>) => void
  rimuoviArticoloBar: (id: string) => void
  /** Conto dell'ombrellone = comande non ancora pagate: le segna tutte pagate. */
  incassaOmbrellone: (ombrellone: string) => void

  // Comande dall'ombrellone (servizio in spiaggia)
  comande: Comanda[]
  inviaComanda: (ombrellone: string, righe: RigaComanda[], note?: string, extra?: Pick<Comanda, 'origine' | 'cliente'>) => Comanda
  avanzaComanda: (id: string) => void
  annullaComanda: (id: string) => void

  // Comande del ristorante: dal cameriere o dal tablet al tavolo → cucina
  comandeSala: ComandaSala[]
  /** Con `extra.seduta` (telefono col QR) la comanda è rifiutata (null) se nel frattempo il conto del tavolo è cambiato. */
  inviaComandaSala: (tavolo: number, righe: RigaComandaSala[], extra: Pick<ComandaSala, 'origine'> & Partial<Pick<ComandaSala, 'cameriere' | 'coperti' | 'note' | 'seduta'>>) => ComandaSala | null
  /** Inviata → inizia la preparazione; pronta → i piatti pronti diventano serviti. */
  avanzaComandaSala: (id: string) => void
  /** Segna dei piatti (indici in `righe`) come in attesa, pronti o serviti; lo stato della comanda si ricalcola. */
  segnaRigheSala: (id: string, indici: number[], stato: StatoRigaSala) => void
  /** Il cameriere dà il via all'uscita `n` (e alle precedenti). */
  chiamaUscitaSala: (id: string, n: number) => void
  annullaComandaSala: (id: string) => void
  /** QR fissi dei tavoli (codice, menu, aperto). */
  tavoliQr: TavoloQr[]
  /** Crea (se mancano) le righe QR dei tavoli e le restituisce, nell'ordine dei numeri. */
  assicuraTavoliQr: (numeri: number[]) => TavoloQr[]
  /** Cambia menu o apertura del QR di un tavolo (crea la riga se manca). */
  impostaTavoloQr: (numero: number, patch: Partial<Pick<TavoloQr, 'menu' | 'aperto'>>) => void
  /** Chiude il conto del tavolo (comande pagate e servite), prepara un conto nuovo vuoto e chiude il tavolo ai QR. */
  chiudiContoTavolo: (numero: number) => void
  /** Comande dagli ombrelloni di un giorno passato, lette dal DB (null senza Supabase: sono tutte già in `comande`). */
  leggiComandeGiorno: (giorno: string) => Promise<Comanda[] | null>
  /** Orari (ts) delle comande salvate, per l'elenco dei giorni (null senza Supabase). */
  giorniComande: () => Promise<number[] | null>
  /** Il conto del tavolo è ancora quello (e il tavolo aperto)? Con Supabase lo chiede al DB, non alla copia locale. */
  verificaContoTavolo: (numero: number, seduta: string) => Promise<boolean>

  // Clienti aggiunti in demo (si affiancano a quelli caricati da api)
  clientiAggiunti: Cliente[]
  aggiungiCliente: (cliente: Cliente) => void

  // Costi
  aggiungiCosto: (voce: VoceCosto) => void

  // Sito — prenotazioni ombrellone
  confermaPrenotazione: (id: string) => void
  rifiutaPrenotazione: (id: string) => void
  inviaRichiestaOmbrellone: (dati: DatiRichiestaOmbrellone) => void
  // Sito — prenotazioni ristorante
  richiesteRistorante: RichiestaRistorante[]
  /** Giorni di chiusura del ristorante (condivisi via Supabase): il sito non accetta richieste. */
  giorniChiusi: GiornoChiuso[]
  /** Chiude uno o più giorni consecutivi (dal–al inclusi). */
  chiudiGiorni: (dal: string, al: string, nota?: string) => void
  riapriGiorno: (data: string) => void
  confermaRistorante: (id: string) => void
  rifiutaRistorante: (id: string) => void
  inviaRichiestaRistorante: (dati: DatiRichiestaRistorante) => void
  // Sito — richieste eventi
  richiesteEventi: RichiestaEvento[]
  confermaEvento: (id: string) => void
  rifiutaEvento: (id: string) => void
  inviaRichiestaEvento: (dati: DatiRichiestaEvento) => void
  aggiungiPartecipanteEvento: (dati: DatiPartecipanteEvento) => void
  /** Ingresso all'evento: quante persone dell'invito sono entrate (0 = annulla). */
  segnaArrivoEvento: (id: string, arrivati: number) => void
  /** Rimanda al cliente la mail con l'invito e il QR (solo prenotazioni confermate). */
  reinviaInvito: (id: string) => void
  // Risposta WhatsApp simulata all'ultima prenotazione confermata/rifiutata
  whatsapp: MessaggioWhatsApp | null
  chiudiWhatsapp: () => void
  rimuoviPartecipanteEvento: (id: string) => void
  pubblicaPagina: (id: string) => void
  pubblicaListino: () => void

  // Posta (simulazione conferme)
  postaCliente: Email[]
  postaAdmin: Email[]
  segnaEmailLetta: (id: string) => void

  // Eventi (CRUD)
  eventi: Evento[]
  aggiungiEvento: (evento: Evento) => void
  modificaEvento: (evento: Evento) => void
  eliminaEvento: (id: string) => void
  // Album foto di un evento (es. foto di un torneo concluso)
  aggiungiFotoEvento: (id: string, immagine: string) => void
  rimuoviFotoEvento: (id: string, indice: number) => void

  // Ristorante — menu modificabile (anche a voce). Dati statici in memoria,
  // stessa forma dell'API: in futuro le mutazioni chiameranno il DB (Supabase).
  menu: Piatto[]
  aggiungiPiatto: (nome: string, prezzo: number | null, categoria: CategoriaPiatto) => Piatto
  rimuoviPiatto: (id: string) => void
  modificaPrezzoPiatto: (id: string, prezzo: number) => void
  rinominaPiatto: (id: string, nome: string) => void
  /** Modifica libera di un piatto (sezione, foto…); per il nome usare `rinominaPiatto` (ritraduce). */
  modificaPiatto: (id: string, dati: Partial<Pick<Piatto, 'categoria' | 'foto' | 'prezzo' | 'descrizione'>>) => void
  sezioniMenu: SezioneMenu[]
  aggiungiSezione: (nome: string) => void
  rinominaSezione: (id: string, nome: string) => void
  /** Elimina la sezione e i suoi piatti. */
  rimuoviSezione: (id: string) => void
  spostaSezione: (id: string, direzione: -1 | 1) => void
  /** Correzione manuale di una traduzione del menu pubblico. */
  impostaTraduzione: (id: string, lingua: LinguaMenu, testo: string) => void

  // Ristorante — tavoli e prenotazioni (presa a telefono + assegnazione tavolo).
  // Dati statici in memoria, pronti per il DB.
  /** Disposizione standard (modello) della sala. */
  tavoli: Tavolo[]
  /** Disposizioni personalizzate per giorno (ISO): se manca, il giorno usa lo standard. */
  tavoliGiorno: Record<string, Tavolo[]>
  /** Tavoli di un giorno: la sua disposizione personalizzata oppure lo standard. */
  tavoliDelGiorno: (giorno: string) => Tavolo[]
  // Senza `giorno` le azioni modificano lo standard; con `giorno` solo quel giorno
  // (alla prima modifica il giorno riceve una copia dello standard).
  aggiungiTavolo: (numero: number, posti: number, zona: Tavolo['zona'], giorno?: string) => void
  rimuoviTavolo: (id: string, giorno?: string) => void
  spostaTavolo: (id: string, x: number, y: number, giorno?: string) => void
  modificaTavolo: (id: string, dati: { numero?: number; posti?: number; zona?: Tavolo['zona'] }, giorno?: string) => void
  /** Il giorno torna alla disposizione standard (le prenotazioni su tavoli non più presenti restano da assegnare). */
  ripristinaDisposizione: (giorno: string) => void
  /** La disposizione del giorno diventa il nuovo standard. */
  salvaComeStandard: (giorno: string) => void
  // Ristorante — magazzino cucina
  magazzino: ArticoloMagazzino[]
  movimentaArticolo: (id: string, delta: number) => void
  aggiungiArticolo: (a: Omit<ArticoloMagazzino, 'id'>) => void
  rimuoviArticolo: (id: string) => void
  prenotazioniRistorante: PrenotazioneRistorante[]
  creaPrenotazioneRistorante: (dati: DatiPrenotazioneRistorante) => void
  assegnaTavolo: (prenotazioneId: string, tavoloId?: string) => void
  impostaStatoPrenotazione: (id: string, stato: StatoPrenotazione) => void
  rimuoviPrenotazioneRistorante: (id: string) => void

  // Sito — galleria foto (caricabili). Data URI in memoria, pronta per il DB.
  galleria: FotoGalleria[]
  aggiungiFoto: (immagine: string, titolo?: string) => void
  rimuoviFoto: (id: string) => void
  rinominaFoto: (id: string, titolo: string) => void

  // App clienti (/comandapp): news del gestore e lavagnetta del giorno
  notizie: Notizia[]
  pubblicaNotizia: (dati: Pick<Notizia, 'titolo' | 'testo' | 'foto' | 'fissata'>) => void
  modificaNotizia: (id: string, patch: Partial<Omit<Notizia, 'id'>>) => void
  eliminaNotizia: (id: string) => void
  lavagnetta: VoceLavagnetta[]
  aggiungiVoceLavagnetta: (dati: Omit<VoceLavagnetta, 'id'>) => void
  modificaVoceLavagnetta: (id: string, patch: Partial<Omit<VoceLavagnetta, 'id'>>) => void
  rimuoviVoceLavagnetta: (id: string) => void
  spostaVoceLavagnetta: (id: string, verso: -1 | 1) => void

  // Demo guidata
  incassoDemo: number
  demoInCorso: boolean
  demoProgresso: number // 0–1
  attivita: AttivitaDemo[]
  avviaDemo: () => void
  fermaDemo: () => void

  reset: () => void
}

const DemoDataContext = createContext<DemoDataValue | null>(null)

const comandaDaRiga = (r: Record<string, unknown> & { id: string }): Comanda => ({
  id: r.id, ombrellone: r.ombrellone as string, righe: r.righe as Comanda['righe'], totale: Number(r.totale),
  stato: r.stato as StatoComanda, ora: r.ora as string, note: (r.note as string) ?? undefined,
  origine: (r.origine as Comanda['origine']) ?? undefined, cliente: (r.cliente as string) ?? undefined, ts: Number(r.ts),
  pagata: !!r.pagata,
})

/** `pagina`: percorso aperto (es. `/tavolo`) e sua query: decide quali tabelle scaricare (vedi `PAGINE_CLIENTI`). */
export function DemoDataProvider({ children, pagina }: { children: ReactNode; pagina?: { percorso: string; cerca: string } }) {
  const tabellePagina = useMemo(() => {
    const f = pagina && PAGINE_CLIENTI[pagina.percorso]
    return f ? f(new URLSearchParams(pagina.cerca)) : null
  }, [pagina])
  const accessoDi = (tabella: string): AccessoSync | undefined => (tabellePagina ? tabellePagina[tabella] ?? SPENTO : undefined)
  const [postazioni, setPostazioni] = useState<Postazione[]>(() => clona(seedPostazioni))
  const [conti, setConti] = useState<ContoOmbrellone[]>([])
  const [sezioniBar, setSezioniBar] = useState<SezioneBar[]>(() => clona(seedSezioniBar))
  const [articoliBarStato, setArticoliBar] = useState<ArticoloBar[]>(() => clona(articoliBar))
  useSyncSupabase({
    tabella: 'bar_sezioni', accesso: accessoDi('bar_sezioni'), righe: sezioniBar, setRighe: setSezioniBar, semina: true,
    aRiga: (s, i) => ({ id: s.id, nome: s.nome, ordine: i }),
    daRiga: (r) => ({ id: r.id, nome: r.nome as string }),
    ordina: (a, b) => (a.ordine as number) - (b.ordine as number),
  })
  useSyncSupabase({
    tabella: 'articoli_bar', accesso: accessoDi('articoli_bar'), righe: articoliBarStato, setRighe: setArticoliBar, semina: true,
    aRiga: (a, i) => ({
      id: a.id, nome: a.nome, categoria: a.categoria, prezzo_vendita: a.prezzoVendita, costo_acquisto: a.costoAcquisto,
      giacenza: a.giacenza, soglia_riordino: a.sogliaRiordino, unita: a.unita, disponibile: a.disponibile !== false, foto: a.foto ?? null, ordine: i,
    }),
    daRiga: (r) => ({
      id: r.id, nome: r.nome as string, categoria: r.categoria as string, prezzoVendita: Number(r.prezzo_vendita), costoAcquisto: Number(r.costo_acquisto),
      giacenza: Number(r.giacenza), sogliaRiordino: Number(r.soglia_riordino), unita: r.unita as string, disponibile: r.disponibile !== false, foto: (r.foto as string | null) ?? undefined,
    }),
    ordina: (a, b) => (a.ordine as number) - (b.ordine as number),
  })
  const [costi, setCosti] = useState<VoceCosto[]>(() => clona(seedCosti))
  const [prenotazioniOnline, setPrenotazioni] = useState<PrenotazioneOnline[]>(() =>
    clona(statoSito.prenotazioni)
  )
  const [pagine, setPagine] = useState<PaginaSito[]>(() => clona(statoSito.pagine))
  // Contenuti del sito su Supabase (`sito_contenuti`, una riga per voce): canali di prenotazione, homepage, prezzi del listino.
  const [contenutiSito, setContenutiSito] = useState<ContenutoSito[]>(contenutiIniziali)
  useSyncSupabase({
    tabella: 'sito_contenuti', accesso: accessoDi('sito_contenuti'), righe: contenutiSito, setRighe: setContenutiSito, semina: true,
    aRiga: (c) => ({ id: c.id, valore: c.id === 'home' ? { ...(c.valore as ContenutoHome), immagine: rifFoto((c.valore as ContenutoHome).immagine) ?? '' } : c.valore }),
    daRiga: (r) => ({ id: r.id, valore: r.id === 'home' ? { ...(r.valore as ContenutoHome), immagine: fotoDaRif((r.valore as ContenutoHome).immagine) ?? '' } : r.valore }),
    ordina: (a, b) => a.id.localeCompare(b.id),
  })
  const contenuto = <T,>(id: string, base: T): T => ({ ...base, ...(contenutiSito.find((c) => c.id === id)?.valore as T | undefined) })
  const canaliPrenotazione = contenuto<CanaliPrenotazione>('canali', CANALI_INIZIALI)
  const homeSito = contenuto<ContenutoHome>('home', statoSito.home)
  const prezziListino = contenuto<{ prezzi: Record<string, number> }>('listino', { prezzi: {} }).prezzi ?? {}
  const scriviContenuto = useCallback((id: string, valore: (prima: unknown) => unknown) => {
    setContenutiSito((prev) => {
      const prima = prev.find((c) => c.id === id)
      return prima ? prev.map((c) => (c.id === id ? { id, valore: valore(c.valore) } : c)) : [...prev, { id, valore: valore(undefined) }]
    })
  }, [])
  const [bozzaListino, setBozzaListino] = useState<Record<string, number>>({})
  const listinoPubblicato = Object.keys(bozzaListino).length === 0
  const bozzaRef = useRef(bozzaListino)
  bozzaRef.current = bozzaListino
  const [clientiAggiunti, setClientiAggiunti] = useState<Cliente[]>([])
  const [richiesteRistorante, setRichiesteRistorante] = useState<RichiestaRistorante[]>([])
  const [giorniChiusi, setGiorniChiusi] = useState<GiornoChiuso[]>([])
  const [richiesteEventi, setRichiesteEventi] = useState<RichiestaEvento[]>([])
  const [postaCliente, setPostaCliente] = useState<Email[]>([])
  const [postaAdmin, setPostaAdmin] = useState<Email[]>([])
  const [eventi, setEventi] = useState<Evento[]>(() => clona(seedEventi))
  useSyncSupabase({
    tabella: 'eventi', accesso: accessoDi('eventi'), righe: eventi, setRighe: setEventi, semina: true,
    aRiga: (e) => ({
      id: e.id, nome: e.nome, tipo: e.tipo, data: e.data, budget: e.budget, costi_sostenuti: e.costiSostenuti, ricavi: e.ricavi,
      partecipanti: e.partecipanti, descrizione: e.descrizione, foto: rifFoto(e.foto), prezzo: e.prezzo ?? null,
      galleria: (e.galleria ?? []).map((f) => rifFoto(f)),
    }),
    daRiga: (r) => ({
      id: r.id, nome: r.nome as string, tipo: r.tipo as Evento['tipo'], data: r.data as string, budget: Number(r.budget),
      costiSostenuti: Number(r.costi_sostenuti), ricavi: Number(r.ricavi), partecipanti: Number(r.partecipanti),
      descrizione: (r.descrizione as string) ?? '',
      ...(fotoDaRif(r.foto) ? { foto: fotoDaRif(r.foto) } : {}),
      ...(r.prezzo != null ? { prezzo: Number(r.prezzo) } : {}),
      ...((r.galleria as unknown[] | null)?.length ? { galleria: (r.galleria as unknown[]).map(fotoDaRif).filter((f): f is string => !!f) } : {}),
    }),
    ordina: (a, b) => String(a.data).localeCompare(String(b.data)),
  })
  const [menu, setMenu] = useState<Piatto[]>(() => clona(seedMenu))
  const [sezioniMenu, setSezioniMenu] = useState<SezioneMenu[]>(() => clona(seedSezioni))
  // Sync Supabase (se configurato): menu + sezioni (editor/assistente vocale) e comande (ComandApp ↔ bar)
  useSyncSupabase({
    tabella: 'menu_sezioni', accesso: accessoDi('menu_sezioni'), righe: sezioniMenu, setRighe: setSezioniMenu, semina: true,
    aRiga: (s, i) => ({ id: s.id, nome: s.nome, traduzioni: s.traduzioni ?? null, ordine: i }),
    daRiga: (r) => ({ id: r.id, nome: r.nome as string, traduzioni: (r.traduzioni as SezioneMenu['traduzioni']) ?? undefined }),
    ordina: (a, b) => (a.ordine as number) - (b.ordine as number),
  })
  useSyncSupabase({
    tabella: 'menu_piatti', accesso: accessoDi('menu_piatti'), righe: menu, setRighe: setMenu, semina: true,
    aRiga: (p, i) => ({
      id: p.id, nome: p.nome, categoria: p.categoria, prezzo: p.prezzo, food_cost: p.foodCost, allergeni: p.allergeni,
      venduti_stagione: p.vendutiStagione, traduzioni: p.traduzioni ?? null, foto: p.foto ?? null, descrizione: p.descrizione ?? null, ordine: i,
    }),
    daRiga: (r) => ({
      id: r.id, nome: r.nome as string, categoria: r.categoria as string, prezzo: Number(r.prezzo), foodCost: Number(r.food_cost),
      allergeni: (r.allergeni as Piatto['allergeni']) ?? [], vendutiStagione: Number(r.venduti_stagione),
      traduzioni: (r.traduzioni as Piatto['traduzioni']) ?? undefined, foto: (r.foto as string) ?? undefined,
      descrizione: (r.descrizione as string) ?? undefined,
    }),
    ordina: (a, b) => (a.ordine as number) - (b.ordine as number),
  })
  const [galleria, setGalleria] = useState<FotoGalleria[]>(() => clona(statoSito.galleria))
  useSyncSupabase({
    tabella: 'galleria_sito', accesso: accessoDi('galleria_sito'), righe: galleria, setRighe: setGalleria, semina: true,
    aRiga: (f, i) => ({ id: f.id, titolo: f.titolo, immagine: rifFoto(f.immagine), ordine: i }),
    daRiga: (r) => ({ id: r.id, titolo: (r.titolo as string) ?? '', ordine: Number(r.ordine), ...(fotoDaRif(r.immagine) ? { immagine: fotoDaRif(r.immagine) } : {}) }),
    ordina: (a, b) => (a.ordine as number) - (b.ordine as number),
  })
  // App clienti: news e lavagnetta, condivise via Supabase (il gestore pubblica, i telefoni dei clienti leggono)
  const [notizie, setNotizie] = useState<Notizia[]>(() => clona(seedNotizie))
  const [lavagnetta, setLavagnetta] = useState<VoceLavagnetta[]>(() => clona(seedLavagnetta))
  useSyncSupabase({
    tabella: 'notizie', accesso: accessoDi('notizie'), righe: notizie, setRighe: setNotizie, semina: true,
    aRiga: (n) => ({ id: n.id, titolo: n.titolo, testo: n.testo, data: n.data, ts: n.ts, foto: n.foto ?? null, fissata: !!n.fissata }),
    daRiga: (r) => ({
      id: r.id, titolo: r.titolo as string, testo: r.testo as string, data: r.data as string, ts: Number(r.ts),
      foto: (r.foto as string) ?? undefined, fissata: !!r.fissata,
    }),
    ordina: (a, b) => Number(b.ts) - Number(a.ts),
  })
  useSyncSupabase({
    tabella: 'lavagnetta', accesso: accessoDi('lavagnetta'), righe: lavagnetta, setRighe: setLavagnetta, semina: true,
    aRiga: (v, i) => ({ id: v.id, nome: v.nome, descrizione: v.descrizione ?? null, prezzo: v.prezzo, reparto: v.reparto ?? 'cucina', ordine: i }),
    daRiga: (r) => ({ id: r.id, nome: r.nome as string, descrizione: (r.descrizione as string) ?? undefined, prezzo: r.prezzo == null ? null : Number(r.prezzo), reparto: r.reparto === 'bar' ? 'bar' as const : 'cucina' as const }),
    ordina: (a, b) => (a.ordine as number) - (b.ordine as number),
  })
  // Comande condivise tra le schede dello stesso browser (ComandApp ↔ cruscotto bar) via localStorage.
  // Con Supabase configurato le comande vivono nel DB (condivise tra dispositivi, vedi useSyncSupabase più sotto).
  const [comande, setComande] = useState<Comanda[]>(() => {
    if (supabaseAttivo) return []
    try { return JSON.parse(localStorage.getItem(CHIAVE_COMANDE) ?? '[]') as Comanda[] } catch { return [] }
  })
  useEffect(() => {
    if (supabaseAttivo) return
    try { localStorage.setItem(CHIAVE_COMANDE, JSON.stringify(comande)) } catch { /* storage non disponibile */ }
  }, [comande])
  useEffect(() => {
    if (supabaseAttivo) return
    const suCambio = (e: StorageEvent) => {
      if (e.key !== CHIAVE_COMANDE) return
      try { setComande(JSON.parse(e.newValue ?? '[]') as Comanda[]) } catch { /* ignora */ }
    }
    window.addEventListener('storage', suCambio)
    return () => window.removeEventListener('storage', suCambio)
  }, [])
  useSyncSupabase({
    tabella: 'comande', accesso: accessoDi('comande'), righe: comande, setRighe: setComande, filtro: FILTRO_COMANDE, perRiga: true,
    aRiga: (c) => ({
      id: c.id, ombrellone: c.ombrellone, righe: c.righe, totale: c.totale, stato: c.stato, ora: c.ora,
      note: c.note ?? null, origine: c.origine ?? null, cliente: c.cliente ?? null, ts: c.ts ?? 0, pagata: !!c.pagata,
    }),
    daRiga: comandaDaRiga,
    ordina: (a, b) => Number(b.ts) - Number(a.ts),
  })
  // Giorni passati (pagina Bar → Dettaglio del giorno): letti dal DB solo quando servono
  const leggiComandeGiorno = useCallback(async (giorno: string): Promise<Comanda[] | null> => {
    if (!supabase) return null
    const da = new Date(`${giorno}T00:00`).getTime()
    const { data } = await supabase.from('comande').select('*').gte('ts', da).lt('ts', da + 86400000)
    return (data ?? []).map((r) => comandaDaRiga(r as Record<string, unknown> & { id: string }))
  }, [])
  const giorniComande = useCallback(async (): Promise<number[] | null> => {
    if (!supabase) return null
    const { data } = await supabase.from('comande').select('ts').order('ts', { ascending: false }).limit(5000)
    return (data ?? []).map((r) => Number(r.ts))
  }, [])
  // Comande del ristorante (sala → cucina): come le comande del bar, localStorage tra schede o Supabase tra dispositivi.
  const [comandeSala, setComandeSala] = useState<ComandaSala[]>(() => {
    if (supabaseAttivo) return []
    try { return JSON.parse(localStorage.getItem(CHIAVE_COMANDE_SALA) ?? '[]') as ComandaSala[] } catch { return [] }
  })
  useEffect(() => {
    if (supabaseAttivo) return
    try { localStorage.setItem(CHIAVE_COMANDE_SALA, JSON.stringify(comandeSala)) } catch { /* storage non disponibile */ }
  }, [comandeSala])
  useEffect(() => {
    if (supabaseAttivo) return
    const suCambio = (e: StorageEvent) => {
      if (e.key !== CHIAVE_COMANDE_SALA) return
      try { setComandeSala(JSON.parse(e.newValue ?? '[]') as ComandaSala[]) } catch { /* ignora */ }
    }
    window.addEventListener('storage', suCambio)
    return () => window.removeEventListener('storage', suCambio)
  }, [])
  const comandeSalaRef = useRef(comandeSala)
  useEffect(() => { comandeSalaRef.current = comandeSala }, [comandeSala])
  const syncSala = useSyncSupabase({
    tabella: 'comande_sala', accesso: accessoDi('comande_sala'), righe: comandeSala, setRighe: setComandeSala, filtro: FILTRO_COMANDE, perRiga: true,
    aRiga: (c) => ({
      id: c.id, tavolo: c.tavolo, righe: c.righe, totale: c.totale, stato: c.stato, ora: c.ora, ts: c.ts, origine: c.origine,
      cameriere: c.cameriere ?? null, coperti: c.coperti ?? null, note: c.note ?? null, uscita_via: c.uscitaVia ?? null,
      seduta: c.seduta ?? null, pagata: !!c.pagata,
    }),
    daRiga: (r) => ({
      id: r.id, tavolo: Number(r.tavolo), righe: (r.righe as RigaComandaSala[]) ?? [], totale: Number(r.totale),
      stato: r.stato as StatoComandaSala, ora: r.ora as string, ts: Number(r.ts), origine: r.origine as ComandaSala['origine'],
      cameriere: (r.cameriere as string) ?? undefined, coperti: r.coperti == null ? undefined : Number(r.coperti),
      note: (r.note as string) ?? undefined, uscitaVia: r.uscita_via == null ? undefined : Number(r.uscita_via),
      seduta: (r.seduta as string) ?? undefined, pagata: !!r.pagata,
    }),
    ordina: (a, b) => Number(b.ts) - Number(a.ts),
  })
  // QR fissi dei tavoli: senza Supabase restano in questo browser (localStorage)
  const [tavoliQr, setTavoliQr] = useState<TavoloQr[]>(() => {
    if (supabaseAttivo) return []
    try { return JSON.parse(localStorage.getItem(CHIAVE_TAVOLI_QR) ?? '[]') as TavoloQr[] } catch { return [] }
  })
  const tavoliQrRef = useRef(tavoliQr)
  useEffect(() => {
    tavoliQrRef.current = tavoliQr
    if (!supabaseAttivo) try { localStorage.setItem(CHIAVE_TAVOLI_QR, JSON.stringify(tavoliQr)) } catch { /* storage non disponibile */ }
  }, [tavoliQr])
  // tavolo nuovo creato da due dispositivi insieme: resta il primo (il codice del QR stampato non cambia)
  const syncQr = useSyncSupabase({
    tabella: 'tavoli_qr', accesso: accessoDi('tavoli_qr'), righe: tavoliQr, setRighe: setTavoliQr, nuoveSenzaSovrascrivere: true,
    aRiga: (q) => ({ id: q.id, numero: q.numero, codice: q.codice, menu: q.menu, aperto: q.aperto, seduta: q.seduta ?? null }),
    daRiga: (r) => ({ id: r.id, numero: Number(r.numero), codice: r.codice as string, menu: r.menu as TavoloQr['menu'], aperto: !!r.aperto, seduta: (r.seduta as string) ?? undefined }),
    ordina: (a, b) => Number(a.numero) - Number(b.numero),
  })
  const assicuraTavoliQr = useCallback((numeri: number[]) => {
    const esistenti = new Map(tavoliQrRef.current.map((q) => [q.numero, q]))
    const nuovi = numeri.filter((n) => !esistenti.has(n)).map((n): TavoloQr => ({ id: String(n), numero: n, codice: codiceQr(), menu: 'ristorante', aperto: false, seduta: codiceQr() }))
    // righe create prima del conto per tavolo: ricevono il loro conto
    const senza = numeri.filter((n) => esistenti.get(n) && !esistenti.get(n)!.seduta)
    if (nuovi.length || senza.length) {
      tavoliQrRef.current = [...tavoliQrRef.current.map((q) => (senza.includes(q.numero) ? { ...q, seduta: codiceQr() } : q)), ...nuovi]
      setTavoliQr(tavoliQrRef.current)
      tavoliQrRef.current.forEach((q) => esistenti.set(q.numero, q))
    }
    return numeri.map((n) => esistenti.get(n)!)
  }, [])
  const impostaTavoloQr = useCallback((numero: number, patch: Partial<Pick<TavoloQr, 'menu' | 'aperto'>>) => {
    assicuraTavoliQr([numero])
    tavoliQrRef.current = tavoliQrRef.current.map((q) => (q.numero === numero ? { ...q, ...patch } : q))
    setTavoliQr(tavoliQrRef.current)
  }, [assicuraTavoliQr])
  const [tavoli, setTavoli] = useState<Tavolo[]>(() => clona(seedTavoli))
  // Disposizioni per giorno: lista { id = data, tavoli } (così si sincronizza come le altre tabelle)
  const [disposizioni, setDisposizioni] = useState<{ id: string; tavoli: Tavolo[] }[]>([])
  const tavoliGiorno = useMemo(() => Object.fromEntries(disposizioni.map((d) => [d.id, d.tavoli])) as Record<string, Tavolo[]>, [disposizioni])
  // Con Supabase la sala (tavoli, disposizioni per giorno, prenotazioni) è condivisa tra gestionale, app admin e sito.
  useSyncSupabase({
    tabella: 'tavoli', accesso: accessoDi('tavoli'), righe: tavoli, setRighe: setTavoli, semina: true,
    aRiga: (t, i) => ({ id: t.id, numero: t.numero, posti: t.posti, zona: t.zona, x: t.x ?? null, y: t.y ?? null, forma: t.forma ?? null, ordine: i }),
    daRiga: (r) => ({
      id: r.id, numero: Number(r.numero), posti: Number(r.posti), zona: r.zona as Tavolo['zona'],
      x: r.x == null ? undefined : Number(r.x), y: r.y == null ? undefined : Number(r.y), forma: (r.forma as Tavolo['forma']) ?? undefined,
    }),
    ordina: (a, b) => (a.ordine as number) - (b.ordine as number),
  })
  useSyncSupabase({
    tabella: 'tavoli_giorno', accesso: accessoDi('tavoli_giorno'), righe: disposizioni, setRighe: setDisposizioni,
    aRiga: (d) => ({ id: d.id, tavoli: d.tavoli }),
    daRiga: (r) => ({ id: r.id, tavoli: (r.tavoli as Tavolo[]) ?? [] }),
    ordina: (a, b) => String(a.id).localeCompare(String(b.id)),
  })
  const [magazzino, setMagazzino] = useState<ArticoloMagazzino[]>(() => clona(seedMagazzino))
  const [prenotazioniRistorante, setPrenotazioniRistorante] = useState<PrenotazioneRistorante[]>(() => clona(seedPrenotazioniRist))
  useSyncSupabase({
    tabella: 'prenotazioni_ristorante', accesso: accessoDi('prenotazioni_ristorante'), righe: prenotazioniRistorante, setRighe: setPrenotazioniRistorante, semina: true,
    aRiga: (p) => ({
      id: p.id, data: p.data, turno: p.turno, ora: p.ora ?? null, nome: p.nome, coperti: p.coperti, tavolo_id: p.tavoloId ?? null, stato: p.stato,
      note: p.note ?? null, telefono: p.telefono ?? null, origine: p.origine ?? null,
    }),
    daRiga: (r) => ({
      id: r.id, data: r.data as string, turno: r.turno as Turno, ora: (r.ora as string) ?? undefined, nome: r.nome as string, coperti: Number(r.coperti),
      tavoloId: (r.tavolo_id as string) ?? undefined, stato: r.stato as StatoPrenotazione, note: (r.note as string) ?? undefined,
      telefono: (r.telefono as string) ?? undefined, origine: (r.origine as PrenotazioneRistorante['origine']) ?? undefined,
    }),
    ordina: (a, b) => String(a.data).localeCompare(String(b.data)) || String(a.id).localeCompare(String(b.id)),
  })
  // Richieste tavolo dal sito: su Supabase (arrivano dal telefono del cliente, si confermano dall'app admin).
  useSyncSupabase({
    tabella: 'richieste_ristorante', accesso: accessoDi('richieste_ristorante'), righe: richiesteRistorante, setRighe: setRichiesteRistorante,
    aRiga: (r) => ({
      id: r.id, ricevuta_il: r.ricevutaIl, nome: r.nome, email: r.email, telefono: r.telefono, data: r.data,
      turno: r.turno, ora: r.ora ?? null, coperti: r.coperti, stato: r.stato, note: r.note ?? null, ts: r.ts ?? 0,
    }),
    daRiga: (r) => ({
      id: r.id, ricevutaIl: r.ricevuta_il as string, nome: r.nome as string, email: r.email as string, telefono: r.telefono as string,
      data: r.data as string, turno: r.turno as Turno, ora: (r.ora as string) ?? undefined, coperti: Number(r.coperti), stato: r.stato as RichiestaRistorante['stato'],
      note: (r.note as string) ?? undefined, ts: Number(r.ts),
    }),
    ordina: (a, b) => Number(b.ts) - Number(a.ts),
  })
  // Richieste eventi dal sito: su Supabase (i trigger mandano le mail al cliente via Brevo).
  useSyncSupabase({
    tabella: 'richieste_eventi', accesso: accessoDi('richieste_eventi'), righe: richiesteEventi, setRighe: setRichiesteEventi,
    aRiga: (r) => ({
      id: r.id, ricevuta_il: r.ricevutaIl, nome: r.nome, email: r.email, telefono: r.telefono, evento_id: r.eventoId,
      evento_nome: r.eventoNome, evento_data: r.eventoData, evento_foto: r.eventoFoto ?? null, persone: r.persone, stato: r.stato, note: r.note ?? null, origine: r.origine ?? null,
      // senza codice lo genera il DB (default della colonna): non sovrascrivere con null
      ...(r.codice ? { codice: r.codice } : {}), arrivati: r.arrivati ?? 0, arrivo_ts: r.arrivoTs ?? null, invio_ts: r.invioTs ?? null,
    }),
    daRiga: (r) => ({
      id: r.id, ricevutaIl: r.ricevuta_il as string, nome: r.nome as string, email: r.email as string, telefono: r.telefono as string,
      eventoId: r.evento_id as string, eventoNome: r.evento_nome as string, eventoData: r.evento_data as string, eventoFoto: (r.evento_foto as string) ?? undefined, persone: Number(r.persone),
      stato: r.stato as RichiestaEvento['stato'], note: (r.note as string) ?? undefined, origine: (r.origine as RichiestaEvento['origine']) ?? undefined,
      codice: (r.codice as string) ?? undefined, arrivati: Number(r.arrivati ?? 0), arrivoTs: r.arrivo_ts != null ? Number(r.arrivo_ts) : undefined,
      invioTs: r.invio_ts != null ? Number(r.invio_ts) : undefined,
    }),
    ordina: (a, b) => Number(b.ts) - Number(a.ts),
  })
  useSyncSupabase({
    tabella: 'giorni_chiusi', accesso: accessoDi('giorni_chiusi'), righe: giorniChiusi, setRighe: setGiorniChiusi,
    aRiga: (g) => ({ id: g.id, data: g.data, nota: g.nota ?? null }),
    daRiga: (r) => ({ id: r.id, data: r.data as string, nota: (r.nota as string) ?? undefined }),
    ordina: (a, b) => String(a.data).localeCompare(String(b.data)),
  })
  const chiudiGiorni = useCallback((dal: string, al: string, nota?: string) => {
    const [da, a] = dal <= al ? [dal, al] : [al, dal]
    const nuovi: GiornoChiuso[] = []
    for (let d = new Date(`${da}T12:00:00`); ; d.setDate(d.getDate() + 1)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (iso > a || nuovi.length > 366) break
      nuovi.push({ id: iso, data: iso, nota })
    }
    setGiorniChiusi((prev) => {
      const date = new Set(nuovi.map((g) => g.data))
      return [...prev.filter((g) => !date.has(g.data)), ...nuovi].sort((x, y) => x.data.localeCompare(y.data))
    })
  }, [])
  const riapriGiorno = useCallback((data: string) => {
    setGiorniChiusi((prev) => prev.filter((g) => g.data !== data))
  }, [])
  // Ogni richiesta confermata (anche da un altro dispositivo) entra tra le prenotazioni del ristorante.
  // Con Supabase le prenotazioni sono già condivise: le crea `confermaRistorante` sul dispositivo che
  // conferma. Ricrearle qui le farebbe riapparire dopo un'eliminazione (o perdere al caricamento dal DB).
  useEffect(() => {
    if (supabaseAttivo) return
    const conf = richiesteRistorante.filter((r) => r.stato === 'confermata')
    if (!conf.length) return
    setPrenotazioniRistorante((prev) => {
      const nuove = conf.filter((r) => !prev.some((p) => p.id === `PR-${r.id}`))
      return nuove.length
        ? [...nuove.map((r): PrenotazioneRistorante => ({ id: `PR-${r.id}`, data: r.data, turno: r.turno, ora: r.ora, nome: r.nome, coperti: r.coperti, stato: 'confermata', note: r.note, telefono: r.telefono, origine: 'sito' })), ...prev]
        : prev
    })
  }, [richiesteRistorante])
  const seqRef = useRef(1)
  const nuovoId = (p: string) => `${p}-${Date.now().toString(36)}-${seqRef.current++}${Math.random().toString(36).slice(2, 6)}`

  // — Demo guidata —
  const [incassoDemo, setIncassoDemo] = useState(0)
  const [demoInCorso, setDemoInCorso] = useState(false)
  const [demoProgresso, setDemoProgresso] = useState(0)
  const [attivita, setAttivita] = useState<AttivitaDemo[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const passoRef = useRef(0)
  const postazioniRef = useRef(postazioni)
  useEffect(() => {
    postazioniRef.current = postazioni
  }, [postazioni])

  const patchPost = useCallback((id: string, patch: Partial<Postazione>) => {
    setPostazioni((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }, [])

  const assegnaPostazione = useCallback(
    (id: string, opz: AssegnaOpzioni) => {
      patchPost(id, {
        stato: opz.stagionale ? 'stagionale' : 'occupata',
        clienteId: opz.clienteId,
        periodoDal: opz.periodoDal,
        periodoAl: opz.periodoAl,
        tariffaApplicata: opz.tariffaApplicata,
        note: undefined,
      })
    },
    [patchPost]
  )

  const liberaPostazione = useCallback(
    (id: string) => {
      patchPost(id, {
        stato: 'libera',
        clienteId: undefined,
        periodoDal: undefined,
        periodoAl: undefined,
        contoBarId: undefined,
        note: undefined,
      })
    },
    [patchPost]
  )

  const spostaPostazione = useCallback((daId: string, aId: string) => {
    setPostazioni((prev) => {
      const da = prev.find((p) => p.id === daId)
      if (!da) return prev
      return prev.map((p) => {
        if (p.id === aId)
          return {
            ...p,
            stato: da.stato,
            clienteId: da.clienteId,
            periodoDal: da.periodoDal,
            periodoAl: da.periodoAl,
            tariffaApplicata: da.tariffaApplicata,
          }
        if (p.id === daId)
          return {
            ...p,
            stato: 'libera' as StatoPostazione,
            clienteId: undefined,
            periodoDal: undefined,
            periodoAl: undefined,
            contoBarId: undefined,
          }
        return p
      })
    })
  }, [])

  const segnaFuoriServizio = useCallback(
    (id: string, note?: string) => {
      patchPost(id, { stato: 'fuori_servizio', clienteId: undefined, note })
    },
    [patchPost]
  )

  const cambiaStato = useCallback(
    (id: string, stato: StatoPostazione) => patchPost(id, { stato }),
    [patchPost]
  )

  const incassaConto = useCallback((contoId: string) => {
    setConti((prev) => prev.map((c) => (c.id === contoId ? { ...c, aperto: false } : c)))
  }, [])

  // — Listino bar —
  const aggiungiSezioneBar = useCallback((nome: string) => {
    const sez: SezioneBar = { id: nuovoId('SB'), nome: nome.trim() }
    setSezioniBar((prev) => [...prev, sez])
    return sez
  }, [])
  const rinominaSezioneBar = useCallback((id: string, nome: string) => {
    setSezioniBar((prev) => prev.map((s) => (s.id === id ? { ...s, nome: nome.trim() } : s)))
  }, [])
  const spostaSezioneBar = useCallback((id: string, verso: -1 | 1) => {
    setSezioniBar((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      const j = i + verso
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const n = [...prev]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }, [])
  const rimuoviSezioneBar = useCallback((id: string) => {
    setSezioniBar((prev) => prev.filter((s) => s.id !== id))
  }, [])
  const aggiungiArticoloBar = useCallback((dati: Omit<ArticoloBar, 'id'>) => {
    const art: ArticoloBar = { ...dati, id: nuovoId('B') }
    setArticoliBar((prev) => [...prev, art])
    return art
  }, [])
  const modificaArticoloBar = useCallback((id: string, patch: Partial<Omit<ArticoloBar, 'id'>>) => {
    setArticoliBar((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [])
  const rimuoviArticoloBar = useCallback((id: string) => {
    setArticoliBar((prev) => prev.filter((a) => a.id !== id))
  }, [])
  const incassaOmbrellone = useCallback((ombrellone: string) => {
    setComande((prev) => prev.map((c) => (c.ombrellone === ombrellone && !c.pagata ? { ...c, pagata: true } : c)))
  }, [])

  // — Comande dall'ombrellone —
  const inviaComanda = useCallback((ombrellone: string, righe: RigaComanda[], note?: string, extra?: Pick<Comanda, 'origine' | 'cliente'>) => {
    const totale = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)
    const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    const comanda: Comanda = {
      id: nuovoId('CMD'),
      ombrellone: ombrellone.trim(),
      righe,
      totale,
      stato: 'in_attesa',
      ora,
      note: note?.trim() || undefined,
      origine: extra?.origine ?? 'bar',
      cliente: extra?.cliente,
      ts: Date.now(),
    }
    setComande((prev) => [comanda, ...prev])
    return comanda
  }, [])
  const avanzaComanda = useCallback((id: string) => {
    setComande((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, stato: SUCCESSIVO[c.stato] } : c
      )
    )
  }, [])
  const annullaComanda = useCallback((id: string) => {
    setComande((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // — Comande del ristorante (sala → cucina) —
  const inviaComandaSala = useCallback((tavolo: number, righe: RigaComandaSala[], extra: Pick<ComandaSala, 'origine'> & Partial<Pick<ComandaSala, 'cameriere' | 'coperti' | 'note' | 'seduta'>>) => {
    const { seduta } = assicuraTavoliQr([tavolo])[0]
    // pagina del telefono rimasta aperta da un conto già chiuso: non finisce sul conto dei nuovi clienti
    if (extra.seduta && extra.seduta !== seduta) return null
    const comanda: ComandaSala = {
      seduta,
      id: nuovoId('CS'),
      tavolo,
      righe: righe.map((r) => ({ ...r, uscita: r.uscita ?? 1, stato: 'attesa' as const })),
      uscitaVia: 1,
      totale: righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0),
      stato: 'inviata',
      ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      ts: Date.now(),
      origine: extra.origine,
      cameriere: extra.cameriere,
      coperti: extra.coperti,
      note: extra.note?.trim() || undefined,
    }
    setComandeSala((prev) => [comanda, ...prev])
    return comanda
  }, [assicuraTavoliQr])
  // Con Supabase si mandano solo i piatti cambiati (funzione del DB): cucina, bar e sala che toccano la stessa
  // comanda nello stesso momento non si cancellano a vicenda il lavoro, come succedeva riscrivendo la riga intera.
  const cambiaComandaSala = useCallback((id: string, fn: (c: ComandaSala) => ComandaSala) => {
    const prima = comandeSalaRef.current.find((c) => c.id === id)
    if (!prima) return
    const dopo = ricalcolaStato(fn(prima))
    comandeSalaRef.current = comandeSalaRef.current.map((c) => (c.id === id ? dopo : c))
    setComandeSala((prev) => prev.map((c) => (c.id === id ? dopo : c)))
    if (!supabase) return
    const stati: Record<string, StatoRigaSala> = {}
    dopo.righe.forEach((r, i) => { if (r.stato && r.stato !== prima.righe[i]?.stato) stati[i] = r.stato })
    syncSala.allinea(dopo)
    void supabase.rpc('aggiorna_righe_sala', { p_id: id, p_stati: stati, p_uscita_via: dopo.uscitaVia ?? null })
      .then(({ error }) => { if (error) { console.error('[supabase] comande_sala:', error.message); void syncSala.ricarica() } })
  }, [syncSala])
  const verificaContoTavolo = useCallback(async (numero: number, seduta: string) => {
    if (!supabase) return tavoliQrRef.current.some((q) => q.numero === numero && q.aperto && q.seduta === seduta)
    const { data } = await supabase.from('tavoli_qr').select('aperto, seduta').eq('numero', numero).maybeSingle()
    const ok = !data || (!!data.aperto && data.seduta === seduta)
    if (!ok) void syncQr.ricarica()
    return ok
  }, [syncQr])
  const chiudiContoTavolo = useCallback((numero: number) => {
    const { seduta } = assicuraTavoliQr([numero])[0]
    // del conto: le comande del tavolo non pagate di questo conto (o vecchie, senza conto)
    setComandeSala((prev) => prev.map((c) => (c.tavolo === numero && !c.pagata && (!c.seduta || c.seduta === seduta)
      ? { ...c, pagata: true, stato: 'servita', righe: c.righe.map((r) => ({ ...r, stato: 'servita' })) } : c)))
    tavoliQrRef.current = tavoliQrRef.current.map((q) => (q.numero === numero ? { ...q, seduta: codiceQr(), aperto: false } : q))
    setTavoliQr(tavoliQrRef.current)
  }, [assicuraTavoliQr])
  const avanzaComandaSala = useCallback((id: string) => {
    // inviata: i piatti chiamati passano in lavorazione; poi si serve tutto il pronto
    cambiaComandaSala(id, (c) => ({ ...c, righe: c.righe.map((r) => {
      const st = statoRiga(c, r)
      if (c.stato === 'inviata') return st === 'attesa' && uscitaChiamata(c, uscitaDi(r)) ? { ...r, stato: 'preparazione' } : r
      return st === 'pronta' ? { ...r, stato: 'servita' } : r
    }) }))
  }, [cambiaComandaSala])
  const segnaRigheSala = useCallback((id: string, indici: number[], stato: StatoRigaSala) => {
    // le righe senza stato (comande vecchie) partono dallo stato della comanda
    cambiaComandaSala(id, (c) => ({
      ...c,
      righe: c.righe.map((r, i) => ({ ...r, stato: indici.includes(i) ? stato : statoRiga(c, r) })),
    }))
  }, [cambiaComandaSala])
  const chiamaUscitaSala = useCallback((id: string, n: number) => {
    cambiaComandaSala(id, (c) => ({ ...c, uscitaVia: Math.max(c.uscitaVia ?? 1, n) }))
  }, [cambiaComandaSala])
  const annullaComandaSala = useCallback((id: string) => {
    setComandeSala((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const aggiungiCosto = useCallback((voce: VoceCosto) => {
    setCosti((prev) => [voce, ...prev])
  }, [])

  const aggiungiCliente = useCallback((cliente: Cliente) => {
    setClientiAggiunti((prev) => [cliente, ...prev])
  }, [])

  // — Posta / prenotazioni dal sito —
  const prenRef = useRef(prenotazioniOnline)
  const richRef = useRef(richiesteRistorante)
  const evtRef = useRef(richiesteEventi)
  useEffect(() => { prenRef.current = prenotazioniOnline }, [prenotazioniOnline])
  useEffect(() => { richRef.current = richiesteRistorante }, [richiesteRistorante])
  useEffect(() => { evtRef.current = richiesteEventi }, [richiesteEventi])
  const eventiRef = useRef(eventi)
  useEffect(() => { eventiRef.current = eventi }, [eventi])
  /** URL assoluto della foto dell'evento per la mail (le foto in data URI non si vedono nei client di posta). */
  const fotoEvento = (eventoId: string) => {
    const f = eventiRef.current.find((e) => e.id === eventoId)?.foto
    return f && !f.startsWith('data:') ? new URL(f, window.location.href).href : undefined
  }

  const gg = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '')
  const turnoLabel = (t: Turno) => (t === 'pranzo' ? 'pranzo' : 'cena')
  /** "cena alle 20:30" oppure solo "cena". */
  const quandoTurno = (t: Turno, ora?: string) => `${turnoLabel(t)}${ora ? ` alle ${ora}` : ''}`

  const pushMail = useCallback(
    (casella: Email['casella'], tipo: Email['tipo'], da: string, a: string, oggetto: string, corpo: string) => {
      if (casella === 'cliente' && !a?.includes('@')) return // niente email: niente mail al cliente
      const mail: Email = { id: nuovoId('MAIL'), casella, tipo, da, a, oggetto, corpo, data: config.oggi, letto: false }
      if (casella === 'cliente') setPostaCliente((p) => [mail, ...p])
      else setPostaAdmin((p) => [mail, ...p])
    },
    []
  )

  const [whatsapp, setWhatsapp] = useState<MessaggioWhatsApp | null>(null)
  const pushWa = useCallback((esito: MessaggioWhatsApp['esito'], nome: string, telefono: string, testo: string) => {
    if ((telefono ?? '').replace(/\D/g, '').length < 9) return // niente cellulare: niente WhatsApp
    setWhatsapp({ id: nuovoId('WA'), nome, telefono, testo, esito })
  }, [])
  const chiudiWhatsapp = useCallback(() => setWhatsapp(null), [])
  const nomeBreve = (n: string) => n.trim().split(/\s+/)[0]

  const inviaRichiestaOmbrellone = useCallback((d: DatiRichiestaOmbrellone) => {
    setPrenotazioni((prev) => [
      { id: nuovoId('PO'), ricevutaIl: config.oggi, nome: d.nome, email: d.email, telefono: d.telefono, dal: d.dal, al: d.al, tipologiaPostazione: d.tipologiaPostazione, persone: d.persone, stato: 'da_confermare', messaggio: d.messaggio },
      ...prev,
    ])
    pushMail('cliente', 'richiesta', config.nome, d.email, 'Richiesta ricevuta — ombrellone',
      `Gentile ${d.nome},\nabbiamo ricevuto la tua richiesta di ombrellone per ${d.persone} persone dal ${gg(d.dal)} al ${gg(d.al)}.\nTi confermeremo la disponibilità a breve.\n\n${config.nome}`)
    pushMail('admin', 'notifica', `${d.nome} <${d.email || d.telefono}>`, config.email || 'gestione', 'Nuova richiesta ombrellone dal sito',
      `Nuova richiesta dal sito:\nCliente: ${d.nome} (${d.telefono})\nOmbrellone · ${d.persone} persone · dal ${gg(d.dal)} al ${gg(d.al)}${d.messaggio ? `\nNote: ${d.messaggio}` : ''}\n\nDa confermare in gestionale.`)
    pushWa('richiesta', d.nome, d.telefono, `Ciao ${nomeBreve(d.nome)} 👋\nabbiamo ricevuto la tua richiesta di ombrellone dal *${gg(d.dal)}* al *${gg(d.al)}* (${d.persone} persone).\nTi confermiamo a breve qui su WhatsApp ⏳\n${config.nome}`)
  }, [pushMail, pushWa])

  const inviaRichiestaRistorante = useCallback((d: DatiRichiestaRistorante) => {
    setRichiesteRistorante((prev) => [
      { id: nuovoId('RR'), ricevutaIl: config.oggi, nome: d.nome, email: d.email, telefono: d.telefono, data: d.data, turno: d.turno, ora: d.ora, coperti: d.coperti, stato: 'da_confermare', note: d.note, ts: Date.now() },
      ...prev,
    ])
    pushMail('cliente', 'richiesta', config.nome, d.email, 'Richiesta ricevuta — tavolo ristorante',
      `Gentile ${d.nome},\nabbiamo ricevuto la tua richiesta di tavolo per ${d.coperti} coperti (${quandoTurno(d.turno, d.ora)}) del ${gg(d.data)}.\nTi confermeremo a breve.\n\n${config.nome}`)
    pushMail('admin', 'notifica', `${d.nome} <${d.email || d.telefono}>`, config.email || 'gestione', 'Nuova richiesta tavolo dal sito',
      `Nuova richiesta dal sito:\nCliente: ${d.nome} (${d.telefono})\nRistorante · ${d.coperti} coperti · ${quandoTurno(d.turno, d.ora)} del ${gg(d.data)}${d.note ? `\nNote: ${d.note}` : ''}\n\nDa confermare in gestionale.`)
    pushWa('richiesta', d.nome, d.telefono, `Ciao ${nomeBreve(d.nome)} 👋\nabbiamo ricevuto la tua richiesta di tavolo per *${d.coperti}* a *${quandoTurno(d.turno, d.ora)}* del *${gg(d.data)}*.\nTi confermiamo a breve qui su WhatsApp ⏳\n${config.nome}`)
  }, [pushMail, pushWa])

  const confermaPrenotazione = useCallback((id: string) => {
    const r = prenRef.current.find((p) => p.id === id)
    setPrenotazioni((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'confermata' } : p)))
    if (r) pushMail('cliente', 'conferma', config.nome, r.email, 'Prenotazione confermata ✓',
      `Gentile ${r.nome},\nla tua prenotazione ombrellone dal ${gg(r.dal)} al ${gg(r.al)} è CONFERMATA.\nTi aspettiamo a ${config.nome}!`)
    if (r) pushWa('conferma', r.nome, r.telefono, `Ciao ${nomeBreve(r.nome)} 👋\nla tua prenotazione ombrellone dal *${gg(r.dal)}* al *${gg(r.al)}* (${r.persone} persone) è *confermata* ✅\nTi aspettiamo al ${config.nome}! 🏖️`)
  }, [pushMail, pushWa])

  const rifiutaPrenotazione = useCallback((id: string) => {
    const r = prenRef.current.find((p) => p.id === id)
    setPrenotazioni((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'rifiutata' } : p)))
    if (r) pushMail('cliente', 'rifiuto', config.nome, r.email, 'Prenotazione non disponibile',
      `Gentile ${r.nome},\nci dispiace, per le date richieste (${gg(r.dal)}–${gg(r.al)}) non abbiamo disponibilità.\nContattaci per verificare alternative.\n\n${config.nome}`)
    if (r) pushWa('rifiuto', r.nome, r.telefono, `Ciao ${nomeBreve(r.nome)},\nci dispiace 😔 dal ${gg(r.dal)} al ${gg(r.al)} non abbiamo ombrelloni liberi.\nScrivici qui se vuoi provare altre date!\n${config.nome}`)
  }, [pushMail, pushWa])

  const confermaRistorante = useCallback((id: string) => {
    const r = richRef.current.find((p) => p.id === id)
    setRichiesteRistorante((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'confermata' } : p)))
    // La richiesta confermata entra tra le prenotazioni del ristorante, così può
    // essere assegnata a un tavolo dalla pagina Ristorante (se non già presente).
    if (r) {
      setPrenotazioniRistorante((prev) =>
        prev.some((p) => p.id === `PR-${r.id}`)
          ? prev
          : [{ id: `PR-${r.id}`, data: r.data, turno: r.turno, nome: r.nome, coperti: r.coperti, stato: 'confermata', note: r.note, telefono: r.telefono, origine: 'sito' }, ...prev]
      )
      pushMail('cliente', 'conferma', config.nome, r.email,
        `Tavolo confermato per ${new Date(`${r.data}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} ${r.ora ? `alle ${r.ora}` : `a ${turnoLabel(r.turno)}`}`,
        `Gentile ${r.nome},\nil tuo tavolo per ${r.coperti} coperti (${quandoTurno(r.turno, r.ora)}) del ${gg(r.data)} è CONFERMATO.\nA presto!\n\n${config.nome}`)
    }
    if (r) pushWa('conferma', r.nome, r.telefono, `Ciao ${nomeBreve(r.nome)} 👋\nil tuo tavolo per *${r.coperti}* a *${quandoTurno(r.turno, r.ora)}* del *${gg(r.data)}* è *confermato* ✅\nA presto al ${config.nome}! 🍽️🌊`)
  }, [pushMail, pushWa])

  const rifiutaRistorante = useCallback((id: string) => {
    const r = richRef.current.find((p) => p.id === id)
    setRichiesteRistorante((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'rifiutata' } : p)))
    if (r) pushMail('cliente', 'rifiuto', config.nome, r.email, 'Tavolo non disponibile',
      `Gentile ${r.nome},\nci dispiace, per ${quandoTurno(r.turno, r.ora)} del ${gg(r.data)} siamo al completo.\nProva con un altro turno o data.\n\n${config.nome}`)
    if (r) pushWa('rifiuto', r.nome, r.telefono, `Ciao ${nomeBreve(r.nome)},\nci dispiace 😔 a ${quandoTurno(r.turno, r.ora)} del ${gg(r.data)} siamo al completo.\nVuoi provare un altro turno o un'altra data?\n${config.nome}`)
  }, [pushMail, pushWa])

  const inviaRichiestaEvento = useCallback((d: DatiRichiestaEvento) => {
    setRichiesteEventi((prev) => [
      { id: nuovoId('RE'), ricevutaIl: config.oggi, nome: d.nome, email: d.email, telefono: d.telefono, eventoId: d.eventoId, eventoNome: d.eventoNome, eventoData: d.eventoData, eventoFoto: fotoEvento(d.eventoId), persone: d.persone, stato: 'da_confermare', note: d.note, origine: 'sito', codice: nuovoCodiceInvito() },
      ...prev,
    ])
    pushMail('cliente', 'richiesta', config.nome, d.email, `Richiesta ricevuta — ${d.eventoNome}`,
      `Gentile ${d.nome},\nabbiamo ricevuto la tua richiesta di partecipazione a “${d.eventoNome}” del ${gg(d.eventoData)} per ${d.persone} persone.\nTi confermeremo a breve.\n\n${config.nome}`)
    pushMail('admin', 'notifica', `${d.nome} <${d.email || d.telefono}>`, config.email || 'gestione', `Nuova richiesta evento: ${d.eventoNome}`,
      `Nuova richiesta dal sito:\nCliente: ${d.nome} (${d.telefono})\nEvento: ${d.eventoNome} del ${gg(d.eventoData)} · ${d.persone} persone${d.note ? `\nNote: ${d.note}` : ''}\n\nDa confermare in gestionale.`)
    pushWa('richiesta', d.nome, d.telefono, `Ciao ${nomeBreve(d.nome)} 👋\nabbiamo ricevuto la tua richiesta per *${d.eventoNome}* del *${gg(d.eventoData)}* (${d.persone} persone).\nTi confermiamo a breve qui su WhatsApp ⏳\n${config.nome}`)
  }, [pushMail, pushWa])

  const confermaEvento = useCallback((id: string) => {
    const r = evtRef.current.find((p) => p.id === id)
    // il codice dell'invito deve esserci già alla conferma: il trigger della mail lo legge dalla stessa riga
    const codice = r?.codice ?? nuovoCodiceInvito()
    setRichiesteEventi((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'confermata', codice } : p)))
    if (r) pushMail('cliente', 'conferma', config.nome, r.email, `Partecipazione confermata ✓ — ${r.eventoNome}`,
      `Gentile ${r.nome},\nla tua partecipazione a “${r.eventoNome}” del ${gg(r.eventoData)} (${r.persone} persone) è CONFERMATA.\nAll'ingresso mostra il QR del tuo invito:\n${urlInvito(codice)}\nCodice: ${codice}\n\nTi aspettiamo!\n${config.nome}`)
    if (r) pushWa('conferma', r.nome, r.telefono, `Ciao ${nomeBreve(r.nome)} 👋\nla tua partecipazione a *${r.eventoNome}* del *${gg(r.eventoData)}* (${r.persone} persone) è *confermata* ✅\nIl tuo invito con QR: ${urlInvito(codice)}\nCi vediamo lì! 🎉`)
  }, [pushMail, pushWa])

  const rifiutaEvento = useCallback((id: string) => {
    const r = evtRef.current.find((p) => p.id === id)
    setRichiesteEventi((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'rifiutata' } : p)))
    if (r) pushMail('cliente', 'rifiuto', config.nome, r.email, `Posti esauriti — ${r.eventoNome}`,
      `Gentile ${r.nome},\nci dispiace, i posti per “${r.eventoNome}” del ${gg(r.eventoData)} sono esauriti.\n\n${config.nome}`)
    if (r) pushWa('rifiuto', r.nome, r.telefono, `Ciao ${nomeBreve(r.nome)},\nci dispiace 😔 i posti per ${r.eventoNome} del ${gg(r.eventoData)} sono esauriti.\nTi avvisiamo per il prossimo evento!\n${config.nome}`)
  }, [pushMail, pushWa])

  const aggiungiPartecipanteEvento = useCallback((d: DatiPartecipanteEvento) => {
    setRichiesteEventi((prev) => [
      { id: nuovoId('RE'), ricevutaIl: config.oggi, nome: d.nome, email: d.email ?? '', telefono: d.telefono ?? '', eventoId: d.eventoId, eventoNome: d.eventoNome, eventoData: d.eventoData, eventoFoto: fotoEvento(d.eventoId), persone: d.persone, stato: 'confermata', note: d.note, origine: 'manuale', codice: nuovoCodiceInvito() },
      ...prev,
    ])
  }, [])

  const segnaArrivoEvento = useCallback((id: string, arrivati: number) => {
    setRichiesteEventi((prev) => prev.map((p) => (p.id === id
      ? { ...p, arrivati: Math.max(0, Math.min(p.persone, arrivati)), arrivoTs: arrivati > 0 ? p.arrivoTs ?? Date.now() : undefined }
      : p)))
  }, [])

  const reinviaInvito = useCallback((id: string) => {
    const r = evtRef.current.find((p) => p.id === id)
    if (!r || r.stato !== 'confermata') return
    const codice = r.codice ?? nuovoCodiceInvito()
    setRichiesteEventi((prev) => prev.map((p) => (p.id === id ? { ...p, codice, invioTs: Date.now() } : p)))
    pushMail('cliente', 'conferma', config.nome, r.email, `Il tuo invito — ${r.eventoNome}`,
      `Gentile ${r.nome},\necco il tuo invito per “${r.eventoNome}” del ${gg(r.eventoData)} (${r.persone} persone).\nAll'ingresso mostra il QR:\n${urlInvito(codice)}\nCodice: ${codice}\n\nTi aspettiamo!\n${config.nome}`)
  }, [pushMail])

  const rimuoviPartecipanteEvento = useCallback((id: string) => {
    setRichiesteEventi((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const segnaEmailLetta = useCallback((id: string) => {
    setPostaCliente((p) => p.map((m) => (m.id === id ? { ...m, letto: true } : m)))
    setPostaAdmin((p) => p.map((m) => (m.id === id ? { ...m, letto: true } : m)))
  }, [])

  // — Eventi (CRUD) —
  const aggiungiEvento = useCallback((e: Evento) => {
    setEventi((prev) => [...prev, e].sort((a, b) => a.data.localeCompare(b.data)))
  }, [])
  const modificaEvento = useCallback((e: Evento) => {
    setEventi((prev) => prev.map((x) => (x.id === e.id ? e : x)).sort((a, b) => a.data.localeCompare(b.data)))
  }, [])
  const eliminaEvento = useCallback((id: string) => {
    setEventi((prev) => prev.filter((x) => x.id !== id))
  }, [])
  const aggiungiFotoEvento = useCallback((id: string, immagine: string) => {
    setEventi((prev) => prev.map((e) => (e.id === id ? { ...e, galleria: [...(e.galleria ?? []), immagine] } : e)))
  }, [])
  const rimuoviFotoEvento = useCallback((id: string, indice: number) => {
    setEventi((prev) => prev.map((e) => (e.id === id ? { ...e, galleria: (e.galleria ?? []).filter((_, i) => i !== indice) } : e)))
  }, [])

  // — Menu ristorante (modificabile a voce) —
  // Ogni nome nuovo/rinominato viene tradotto in tutte le lingue del menu pubblico.
  // `traduzioni: {}` = traduzione in corso; si applica solo se il nome non è cambiato nel frattempo.
  const traduci = useCallback((id: string, nome: string) => {
    traduciNome(nome).then((t) => setMenu((prev) => prev.map((p) => (p.id === id && p.nome === nome ? { ...p, traduzioni: t } : p))))
  }, [])
  const impostaTraduzione = useCallback((id: string, lingua: LinguaMenu, testo: string) => {
    setMenu((prev) => prev.map((p) => (p.id === id ? { ...p, traduzioni: { ...p.traduzioni, [lingua]: testo } } : p)))
  }, [])
  const aggiungiPiatto = useCallback((nome: string, prezzo: number | null, categoria: CategoriaPiatto): Piatto => {
    const piatto: Piatto = {
      id: nuovoId('P'),
      nome: nome.trim(),
      categoria,
      prezzo: prezzo ?? 0,
      foodCost: 0,
      allergeni: [],
      vendutiStagione: 0,
      traduzioni: {},
    }
    setMenu((prev) => [...prev, piatto])
    traduci(piatto.id, piatto.nome)
    return piatto
  }, [traduci])
  const rimuoviPiatto = useCallback((id: string) => {
    setMenu((prev) => prev.filter((p) => p.id !== id))
  }, [])
  const modificaPrezzoPiatto = useCallback((id: string, prezzo: number) => {
    setMenu((prev) => prev.map((p) => (p.id === id ? { ...p, prezzo } : p)))
  }, [])
  const rinominaPiatto = useCallback((id: string, nome: string) => {
    setMenu((prev) => prev.map((p) => (p.id === id ? { ...p, nome: nome.trim(), traduzioni: {} } : p)))
    traduci(id, nome.trim())
  }, [traduci])
  const modificaPiatto = useCallback((id: string, dati: Partial<Pick<Piatto, 'categoria' | 'foto' | 'prezzo' | 'descrizione'>>) => {
    setMenu((prev) => prev.map((p) => (p.id === id ? { ...p, ...dati } : p)))
  }, [])
  // — Sezioni del menu —
  const traduciSezione = useCallback((id: string, nome: string) => {
    traduciNome(nome).then((t) => setSezioniMenu((prev) => prev.map((s) => (s.id === id && s.nome === nome ? { ...s, traduzioni: t } : s))))
  }, [])
  const aggiungiSezione = useCallback((nome: string) => {
    const id = nuovoId('SEZ')
    setSezioniMenu((prev) => [...prev, { id, nome: nome.trim(), traduzioni: {} }])
    traduciSezione(id, nome.trim())
  }, [traduciSezione])
  const rinominaSezione = useCallback((id: string, nome: string) => {
    setSezioniMenu((prev) => prev.map((s) => (s.id === id ? { ...s, nome: nome.trim(), traduzioni: {} } : s)))
    traduciSezione(id, nome.trim())
  }, [traduciSezione])
  const rimuoviSezione = useCallback((id: string) => {
    setSezioniMenu((prev) => prev.filter((s) => s.id !== id))
    setMenu((prev) => prev.filter((p) => p.categoria !== id))
  }, [])
  const spostaSezione = useCallback((id: string, direzione: -1 | 1) => {
    setSezioniMenu((prev) => {
      const i = prev.findIndex((s) => s.id === id), j = i + direzione
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const a = [...prev]; [a[i], a[j]] = [a[j], a[i]]
      return a
    })
  }, [])

  // — Galleria foto del sito —
  const aggiungiFoto = useCallback((immagine: string, titolo?: string) => {
    setGalleria((prev) => [
      ...prev,
      { id: nuovoId('FG'), titolo: (titolo || 'Foto').trim(), ordine: prev.length + 1, immagine },
    ])
  }, [])
  const rimuoviFoto = useCallback((id: string) => {
    setGalleria((prev) => prev.filter((f) => f.id !== id))
  }, [])
  const rinominaFoto = useCallback((id: string, titolo: string) => {
    setGalleria((prev) => prev.map((f) => (f.id === id ? { ...f, titolo } : f)))
  }, [])

  // — App clienti: news e lavagnetta —
  const pubblicaNotizia = useCallback((d: Pick<Notizia, 'titolo' | 'testo' | 'foto' | 'fissata'>) => {
    setNotizie((prev) => [{ id: nuovoId('NW'), data: config.oggi, ts: Date.now(), ...d }, ...prev])
  }, [])
  const modificaNotizia = useCallback((id: string, patch: Partial<Omit<Notizia, 'id'>>) => {
    setNotizie((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }, [])
  const eliminaNotizia = useCallback((id: string) => {
    setNotizie((prev) => prev.filter((n) => n.id !== id))
  }, [])
  const aggiungiVoceLavagnetta = useCallback((d: Omit<VoceLavagnetta, 'id'>) => {
    setLavagnetta((prev) => [...prev, { id: nuovoId('LV'), ...d }])
  }, [])
  const modificaVoceLavagnetta = useCallback((id: string, patch: Partial<Omit<VoceLavagnetta, 'id'>>) => {
    setLavagnetta((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }, [])
  const rimuoviVoceLavagnetta = useCallback((id: string) => {
    setLavagnetta((prev) => prev.filter((v) => v.id !== id))
  }, [])
  const spostaVoceLavagnetta = useCallback((id: string, verso: -1 | 1) => {
    setLavagnetta((prev) => {
      const i = prev.findIndex((v) => v.id === id)
      const j = i + verso
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const n = [...prev]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }, [])

  // — Ristorante: tavoli e prenotazioni —
  // Standard = `tavoli`; un giorno modificato ha la sua copia in `tavoliGiorno` (stessi id,
  // così le prenotazioni restano sui loro tavoli).
  const tavoliRef = useRef(tavoli)
  const tavoliGiornoRef = useRef(tavoliGiorno)
  useEffect(() => { tavoliRef.current = tavoli }, [tavoli])
  useEffect(() => { tavoliGiornoRef.current = tavoliGiorno }, [tavoliGiorno])
  const tavoliDelGiorno = useCallback((giorno: string) => tavoliGiorno[giorno] ?? tavoli, [tavoli, tavoliGiorno])
  const cambiaTavoli = useCallback((giorno: string | undefined, fn: (prev: Tavolo[]) => Tavolo[]) => {
    if (!giorno) { setTavoli(fn); return }
    const base = tavoliGiornoRef.current[giorno] ?? tavoliRef.current
    setDisposizioni((prev) => {
      const esistente = prev.find((d) => d.id === giorno)
      return esistente
        ? prev.map((d) => (d.id === giorno ? { ...d, tavoli: fn(d.tavoli) } : d))
        : [...prev, { id: giorno, tavoli: fn(base) }]
    })
  }, [])
  const aggiungiTavolo = useCallback((numero: number, posti: number, zona: Tavolo['zona'], giorno?: string) => {
    cambiaTavoli(giorno, (prev) => [...prev, { id: nuovoId('TAV'), numero, posti, zona, ...posInZona(zona, prev.length), forma: posti > 4 ? 'quadrato' : 'tondo' }])
  }, [cambiaTavoli])
  const spostaTavolo = useCallback((id: string, x: number, y: number, giorno?: string) => {
    // la zona segue la posizione sulla pianta (Veranda/Interno a sx, Ciringuito a dx)
    cambiaTavoli(giorno, (prev) => prev.map((t) => (t.id === id ? { ...t, x, y, zona: zonaDaPos(x, y) } : t)))
  }, [cambiaTavoli])
  const modificaTavolo = useCallback((id: string, dati: { numero?: number; posti?: number; zona?: Tavolo['zona'] }, giorno?: string) => {
    cambiaTavoli(giorno, (prev) => prev.map((t, i) => {
      if (t.id !== id) return t
      const nuovo = { ...t, ...dati }
      if (dati.posti) nuovo.forma = dati.posti > 4 ? 'quadrato' : 'tondo'
      // cambio zona dal pannello → il tavolo si sposta dentro la nuova zona
      return dati.zona && dati.zona !== t.zona ? { ...nuovo, ...posInZona(dati.zona, i) } : nuovo
    }))
  }, [cambiaTavoli])
  const ripristinaDisposizione = useCallback((giorno: string) => {
    const standard = new Set(tavoliRef.current.map((t) => t.id))
    setDisposizioni((prev) => prev.filter((d) => d.id !== giorno))
    // i tavoli aggiunti solo per quel giorno spariscono: le loro prenotazioni tornano da assegnare
    setPrenotazioniRistorante((prev) => prev.map((p) => (p.data === giorno && p.tavoloId && !standard.has(p.tavoloId) ? { ...p, tavoloId: undefined } : p)))
  }, [])
  const salvaComeStandard = useCallback((giorno: string) => {
    const del = tavoliGiornoRef.current[giorno]
    if (!del) return
    const nuovi = new Set(del.map((t) => t.id))
    setTavoli(clona(del))
    setDisposizioni((prev) => prev.filter((d) => d.id !== giorno))
    // gli altri giorni senza disposizione propria seguono il nuovo standard
    const personalizzati = tavoliGiornoRef.current
    setPrenotazioniRistorante((prev) => prev.map((p) => (p.tavoloId && !personalizzati[p.data] && !nuovi.has(p.tavoloId) ? { ...p, tavoloId: undefined } : p)))
  }, [])
  // — Ristorante: magazzino cucina —
  const movimentaArticolo = useCallback((id: string, delta: number) => {
    setMagazzino((prev) => prev.map((a) => (a.id === id ? { ...a, quantita: Math.max(0, Math.round((a.quantita + delta) * 100) / 100) } : a)))
  }, [])
  const aggiungiArticolo = useCallback((a: Omit<ArticoloMagazzino, 'id'>) => {
    setMagazzino((prev) => [...prev, { ...a, id: nuovoId('MAG') }])
  }, [])
  const rimuoviArticolo = useCallback((id: string) => {
    setMagazzino((prev) => prev.filter((a) => a.id !== id))
  }, [])
  const rimuoviTavolo = useCallback((id: string, giorno?: string) => {
    cambiaTavoli(giorno, (prev) => prev.filter((t) => t.id !== id))
    // il tavolo eliminato non deve restare assegnato a una prenotazione: solo quel giorno,
    // oppure (standard) nei giorni che seguono lo standard
    const personalizzati = tavoliGiornoRef.current
    const tocca = (data: string) => (giorno ? data === giorno : !personalizzati[data])
    setPrenotazioniRistorante((prev) => prev.map((p) => (p.tavoloId === id && tocca(p.data) ? { ...p, tavoloId: undefined } : p)))
  }, [cambiaTavoli])
  const creaPrenotazioneRistorante = useCallback((d: DatiPrenotazioneRistorante) => {
    setPrenotazioniRistorante((prev) => [
      { id: nuovoId('PR'), data: d.data ?? config.oggi, turno: d.turno, ora: d.ora, nome: d.nome, coperti: d.coperti, tavoloId: d.tavoloId, stato: 'confermata', note: d.note, telefono: d.telefono, origine: 'manuale' },
      ...prev,
    ])
  }, [])
  const assegnaTavolo = useCallback((prenotazioneId: string, tavoloId?: string) => {
    setPrenotazioniRistorante((prev) => prev.map((p) => (p.id === prenotazioneId ? { ...p, tavoloId } : p)))
  }, [])
  const impostaStatoPrenotazione = useCallback((id: string, stato: StatoPrenotazione) => {
    setPrenotazioniRistorante((prev) => prev.map((p) => (p.id === id ? { ...p, stato } : p)))
  }, [])
  const rimuoviPrenotazioneRistorante = useCallback((id: string) => {
    setPrenotazioniRistorante((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const pubblicaPagina = useCallback((id: string) => {
    setPagine((prev) => prev.map((p) => (p.id === id ? { ...p, pubblicata: true } : p)))
  }, [])

  const modificaPrezzoListino = useCallback((id: string, prezzo: number | null) => {
    setBozzaListino((b) => {
      const n = { ...b }
      if (prezzo === null || !Number.isFinite(prezzo)) delete n[id]
      else n[id] = prezzo
      return n
    })
  }, [])
  const pubblicaListino = useCallback(() => {
    const bozza = bozzaRef.current
    scriviContenuto('listino', (v) => ({ prezzi: { ...((v as { prezzi?: Record<string, number> } | undefined)?.prezzi ?? {}), ...bozza } }))
    setBozzaListino({})
  }, [scriviContenuto])

  const impostaCanalePrenotazione = useCallback((canale: CanalePrenotazione, attivo: boolean) => {
    scriviContenuto('canali', (v) => ({ ...CANALI_INIZIALI, ...(v as CanaliPrenotazione | undefined), [canale]: attivo }))
  }, [scriviContenuto])
  const salvaHomeSito = useCallback((home: ContenutoHome) => {
    scriviContenuto('home', () => home)
  }, [scriviContenuto])

  const reset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setPostazioni(clona(seedPostazioni))
    setConti([])
    setCosti(clona(seedCosti))
    setPrenotazioni(clona(statoSito.prenotazioni))
    setPagine(clona(statoSito.pagine))
    setBozzaListino({})
    // con Supabase canali, homepage, listino, eventi e galleria sono contenuti reali del gestore: il reset demo non li tocca
    if (!supabaseAttivo) setContenutiSito(contenutiIniziali())
    setClientiAggiunti([])
    if (!supabaseAttivo) setRichiesteRistorante([])
    setRichiesteEventi([])
    setPostaCliente([])
    setPostaAdmin([])
    if (!supabaseAttivo) setEventi(clona(seedEventi))
    // con Supabase menu e sezioni sono dati reali condivisi: il reset demo non li tocca
    if (!supabaseAttivo) { setMenu(clona(seedMenu)); setSezioniMenu(clona(seedSezioni)) }
    if (!supabaseAttivo) setGalleria(clona(statoSito.galleria))
    // con Supabase news e lavagnetta sono contenuti reali del gestore: il reset demo non li tocca
    if (!supabaseAttivo) { setNotizie(clona(seedNotizie)); setLavagnetta(clona(seedLavagnetta)) }
    if (!supabaseAttivo) { setComande([]); setComandeSala([]) }
    // con Supabase la sala è un dato reale condiviso: il reset demo non la tocca
    if (!supabaseAttivo) {
      setTavoli(clona(seedTavoli))
      setDisposizioni([])
    }
    setMagazzino(clona(seedMagazzino))
    if (!supabaseAttivo) setPrenotazioniRistorante(clona(seedPrenotazioniRist))
    if (!supabaseAttivo) setGiorniChiusi([])
    setDemoInCorso(false)
    setIncassoDemo(0)
    setDemoProgresso(0)
    setAttivita([])
    passoRef.current = 0
  }, [])

  // —— Demo guidata: simula una giornata tipo in ~90 secondi ——
  const oggi = config.stagione.oggi
  const TOTALE_PASSI = 60
  const nomiSito = ['Fam. Ricci', 'Sig. Bruno', 'Gruppo Neri', 'Elena P.', 'Fam. Gallo', 'Marco V.', 'Chiara L.', 'Fam. Costa']
  const clientiVolanti = useMemo(
    () => clienti.filter((c) => !c.postazioneId && c.tipologia !== 'occasionale'),
    []
  )

  const spingiAttivita = useCallback((tipo: TipoAttivita, testo: string) => {
    setAttivita((prev) => [{ id: passoRef.current * 10 + prev.length, tipo, testo }, ...prev].slice(0, 6))
  }, [])

  const fermaDemo = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setDemoInCorso(false)
  }, [])

  const eseguiPasso = useCallback(() => {
    const passo = passoRef.current + 1
    passoRef.current = passo
    setDemoProgresso(Math.min(1, passo / TOTALE_PASSI))
    const post = postazioniRef.current
    const azione = passo % 6 === 0 ? 'sito' : passo % 3 === 0 ? 'bar' : 'postazione'

    if (azione === 'postazione') {
      const libera = post.find((p) => p.stato === 'libera')
      if (libera) {
        const cli = clientiVolanti[passo % clientiVolanti.length]
        const tariffa = libera.tariffaApplicata ?? 30
        setPostazioni((prev) => prev.map((p) => (p.id === libera.id ? { ...p, stato: 'occupata', clienteId: cli?.id, periodoDal: oggi, periodoAl: oggi } : p)))
        setIncassoDemo((v) => v + tariffa)
        spingiAttivita('postazione', `Ombrellone ${libera.id} assegnato a ${cli ? `${cli.nome} ${cli.cognome}` : 'un cliente'} · ${tariffa} €`)
      }
    } else if (azione === 'bar') {
      const occ = post.filter((p) => p.stato === 'occupata')
      const target = occ[passo % Math.max(1, occ.length)]
      if (target) {
        const a1 = articoliBar[passo % articoliBar.length]
        const a2 = articoliBar[(passo * 3) % articoliBar.length]
        const righe: RigaConto[] = [
          { articoloId: a1.id, nome: a1.nome, quantita: 2, prezzoUnitario: a1.prezzoVendita, ora: '12:30' },
          { articoloId: a2.id, nome: a2.nome, quantita: 1, prezzoUnitario: a2.prezzoVendita, ora: '12:35' },
        ]
        const tot = 2 * a1.prezzoVendita + a2.prezzoVendita
        setConti((prev) => [{ id: `CO-DEMO-${passo}`, postazioneId: target.id, clienteId: target.clienteId, aperto: true, apertoIl: oggi, righe }, ...prev])
        setIncassoDemo((v) => v + tot)
        spingiAttivita('bar', `Ordine al bar sull'ombrellone ${target.id}: 2× ${a1.nome} · ${Math.round(tot)} €`)
      }
    } else {
      const nome = nomiSito[passo % nomiSito.length]
      setPrenotazioni((prev) => [{ id: `PO-DEMO-${passo}`, ricevutaIl: oggi, nome, email: 'ospite@example.it', telefono: '340 0000000', dal: oggi, al: oggi, tipologiaPostazione: 'ombrellone_2_lettini', persone: 2 + (passo % 3), stato: 'da_confermare', messaggio: 'Richiesta arrivata dal sito' }, ...prev])
      spingiAttivita('sito', `Nuova prenotazione dal sito: ${nome}`)
    }

    if (passo >= TOTALE_PASSI) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setDemoInCorso(false)
      setDemoProgresso(1)
      spingiAttivita('info', 'Giornata completata. Con “Ripristina” si riparte da capo.')
    }
  }, [clientiVolanti, oggi, spingiAttivita])

  const avviaDemo = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    // Stato "del mattino": solo gli stagionali occupati, tutto il resto libero
    const mattino = clona(seedPostazioni).map((p) =>
      p.stato === 'occupata' || p.stato === 'prenotata'
        ? { ...p, stato: 'libera' as StatoPostazione, clienteId: undefined, periodoDal: undefined, periodoAl: undefined, contoBarId: undefined }
        : p
    )
    postazioniRef.current = mattino
    setPostazioni(mattino)
    setConti([])
    setPrenotazioni(clona(statoSito.prenotazioni))
    setIncassoDemo(0)
    setDemoProgresso(0)
    passoRef.current = 0
    setAttivita([{ id: 0, tipo: 'info', testo: 'Buongiorno! Lo stabilimento apre: arrivano i primi clienti…' }])
    setDemoInCorso(true)
    timerRef.current = setInterval(eseguiPasso, 1400)
  }, [eseguiPasso])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const value = useMemo<DemoDataValue>(
    () => ({
      postazioni,
      conti,
      costi,
      prenotazioniOnline,
      pagine,
      listinoPubblicato,
      canaliPrenotazione,
      impostaCanalePrenotazione,
      homeSito,
      salvaHomeSito,
      prezziListino,
      bozzaListino,
      modificaPrezzoListino,
      assegnaPostazione,
      liberaPostazione,
      spostaPostazione,
      segnaFuoriServizio,
      cambiaStato,
      incassaConto,
      sezioniBar,
      articoliBar: articoliBarStato,
      aggiungiSezioneBar,
      rinominaSezioneBar,
      spostaSezioneBar,
      rimuoviSezioneBar,
      aggiungiArticoloBar,
      modificaArticoloBar,
      rimuoviArticoloBar,
      incassaOmbrellone,
      comande,
      inviaComanda,
      avanzaComanda,
      annullaComanda,
      comandeSala,
      inviaComandaSala,
      avanzaComandaSala,
      segnaRigheSala,
      chiamaUscitaSala,
      annullaComandaSala,
      tavoliQr,
      assicuraTavoliQr,
      impostaTavoloQr,
      chiudiContoTavolo,
      verificaContoTavolo,
      leggiComandeGiorno,
      giorniComande,
      clientiAggiunti,
      aggiungiCliente,
      aggiungiCosto,
      confermaPrenotazione,
      rifiutaPrenotazione,
      inviaRichiestaOmbrellone,
      richiesteRistorante,
      giorniChiusi,
      chiudiGiorni,
      riapriGiorno,
      confermaRistorante,
      rifiutaRistorante,
      inviaRichiestaRistorante,
      richiesteEventi,
      confermaEvento,
      rifiutaEvento,
      inviaRichiestaEvento,
      aggiungiPartecipanteEvento,
      segnaArrivoEvento,
      reinviaInvito,
      whatsapp,
      chiudiWhatsapp,
      rimuoviPartecipanteEvento,
      pubblicaPagina,
      pubblicaListino,
      postaCliente,
      postaAdmin,
      segnaEmailLetta,
      eventi,
      aggiungiEvento,
      modificaEvento,
      eliminaEvento,
      aggiungiFotoEvento,
      rimuoviFotoEvento,
      menu,
      aggiungiPiatto,
      rimuoviPiatto,
      modificaPiatto, sezioniMenu, aggiungiSezione, rinominaSezione, rimuoviSezione, spostaSezione,
      modificaPrezzoPiatto,
      rinominaPiatto,
      impostaTraduzione,
      galleria,
      aggiungiFoto,
      rimuoviFoto,
      rinominaFoto,
      notizie, pubblicaNotizia, modificaNotizia, eliminaNotizia,
      lavagnetta, aggiungiVoceLavagnetta, modificaVoceLavagnetta, rimuoviVoceLavagnetta, spostaVoceLavagnetta,
      tavoli,
      tavoliGiorno,
      tavoliDelGiorno,
      aggiungiTavolo,
      rimuoviTavolo,
      spostaTavolo,
      modificaTavolo,
      ripristinaDisposizione,
      salvaComeStandard,
      magazzino,
      movimentaArticolo,
      aggiungiArticolo,
      rimuoviArticolo,
      prenotazioniRistorante,
      creaPrenotazioneRistorante,
      assegnaTavolo,
      impostaStatoPrenotazione,
      rimuoviPrenotazioneRistorante,
      incassoDemo,
      demoInCorso,
      demoProgresso,
      attivita,
      avviaDemo,
      fermaDemo,
      reset,
    }),
    [
      postazioni,
      conti,
      costi,
      prenotazioniOnline,
      pagine,
      listinoPubblicato,
      canaliPrenotazione,
      impostaCanalePrenotazione,
      homeSito,
      salvaHomeSito,
      prezziListino,
      bozzaListino,
      modificaPrezzoListino,
      assegnaPostazione,
      liberaPostazione,
      spostaPostazione,
      segnaFuoriServizio,
      cambiaStato,
      incassaConto,
      sezioniBar,
      articoliBarStato,
      aggiungiSezioneBar,
      rinominaSezioneBar,
      spostaSezioneBar,
      rimuoviSezioneBar,
      aggiungiArticoloBar,
      modificaArticoloBar,
      rimuoviArticoloBar,
      incassaOmbrellone,
      comande,
      inviaComanda,
      avanzaComanda,
      annullaComanda,
      comandeSala,
      inviaComandaSala,
      avanzaComandaSala,
      segnaRigheSala,
      chiamaUscitaSala,
      annullaComandaSala,
      tavoliQr,
      assicuraTavoliQr,
      impostaTavoloQr,
      chiudiContoTavolo,
      verificaContoTavolo,
      leggiComandeGiorno,
      giorniComande,
      clientiAggiunti,
      aggiungiCliente,
      aggiungiCosto,
      confermaPrenotazione,
      rifiutaPrenotazione,
      inviaRichiestaOmbrellone,
      richiesteRistorante,
      giorniChiusi,
      chiudiGiorni,
      riapriGiorno,
      confermaRistorante,
      rifiutaRistorante,
      inviaRichiestaRistorante,
      richiesteEventi,
      confermaEvento,
      rifiutaEvento,
      inviaRichiestaEvento,
      aggiungiPartecipanteEvento,
      segnaArrivoEvento,
      reinviaInvito,
      whatsapp,
      chiudiWhatsapp,
      rimuoviPartecipanteEvento,
      pubblicaPagina,
      pubblicaListino,
      postaCliente,
      postaAdmin,
      segnaEmailLetta,
      eventi,
      aggiungiEvento,
      modificaEvento,
      eliminaEvento,
      aggiungiFotoEvento,
      rimuoviFotoEvento,
      menu,
      aggiungiPiatto,
      rimuoviPiatto,
      modificaPiatto, sezioniMenu, aggiungiSezione, rinominaSezione, rimuoviSezione, spostaSezione,
      modificaPrezzoPiatto,
      rinominaPiatto,
      impostaTraduzione,
      galleria,
      aggiungiFoto,
      rimuoviFoto,
      rinominaFoto,
      notizie, pubblicaNotizia, modificaNotizia, eliminaNotizia,
      lavagnetta, aggiungiVoceLavagnetta, modificaVoceLavagnetta, rimuoviVoceLavagnetta, spostaVoceLavagnetta,
      tavoli,
      tavoliGiorno,
      tavoliDelGiorno,
      aggiungiTavolo,
      rimuoviTavolo,
      spostaTavolo,
      modificaTavolo,
      ripristinaDisposizione,
      salvaComeStandard,
      magazzino,
      movimentaArticolo,
      aggiungiArticolo,
      rimuoviArticolo,
      prenotazioniRistorante,
      creaPrenotazioneRistorante,
      assegnaTavolo,
      impostaStatoPrenotazione,
      rimuoviPrenotazioneRistorante,
      incassoDemo,
      demoInCorso,
      demoProgresso,
      attivita,
      avviaDemo,
      fermaDemo,
      reset,
    ]
  )

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>
}

export function useDemoData(): DemoDataValue {
  const ctx = useContext(DemoDataContext)
  if (!ctx) throw new Error('useDemoData deve stare dentro <DemoDataProvider>')
  return ctx
}
