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
  CategoriaPiatto,
  LinguaMenu,
  Cliente,
  Comanda,
  ContoOmbrellone,
  Email,
  RigaComanda,
  Evento,
  FotoGalleria,
  PaginaSito,
  Piatto,
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
} from '@/data/types'

import { postazioni as seedPostazioni } from '@/data/seed/spiaggia'
import { contiOmbrellone as seedConti, articoliBar } from '@/data/seed/bar'
import { costi as seedCosti } from '@/data/seed/costi'
import { menu as seedMenu, tavoli as seedTavoli, prenotazioniRistorante as seedPrenotazioniRist, magazzino as seedMagazzino } from '@/data/seed/ristorante'
import { traduciNome } from '@/lib/menuLingue'
import { statoSito } from '@/data/seed/sito'
import { clienti } from '@/data/seed/clienti'
import { eventi as seedEventi } from '@/data/seed/eventi'
import { config } from '@/data/config'

const clona = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))

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

interface DemoDataValue {
  postazioni: Postazione[]
  conti: ContoOmbrellone[]
  costi: VoceCosto[]
  prenotazioniOnline: PrenotazioneOnline[]
  pagine: PaginaSito[]
  listinoPubblicato: boolean
  canaliPrenotazione: CanaliPrenotazione
  impostaCanalePrenotazione: (canale: CanalePrenotazione, attivo: boolean) => void

  // Azioni arenile
  assegnaPostazione: (id: string, opz: AssegnaOpzioni) => void
  liberaPostazione: (id: string) => void
  spostaPostazione: (daId: string, aId: string) => void
  segnaFuoriServizio: (id: string, note?: string) => void
  cambiaStato: (id: string, stato: StatoPostazione) => void

  // Bar
  incassaConto: (contoId: string) => void

  // Comande dall'ombrellone (servizio in spiaggia)
  comande: Comanda[]
  inviaComanda: (ombrellone: string, righe: RigaComanda[], note?: string) => void
  avanzaComanda: (id: string) => void
  annullaComanda: (id: string) => void

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
  confermaRistorante: (id: string) => void
  rifiutaRistorante: (id: string) => void
  inviaRichiestaRistorante: (dati: DatiRichiestaRistorante) => void
  // Sito — richieste eventi
  richiesteEventi: RichiestaEvento[]
  confermaEvento: (id: string) => void
  rifiutaEvento: (id: string) => void
  inviaRichiestaEvento: (dati: DatiRichiestaEvento) => void
  aggiungiPartecipanteEvento: (dati: DatiPartecipanteEvento) => void
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
  /** Correzione manuale di una traduzione del menu pubblico. */
  impostaTraduzione: (id: string, lingua: LinguaMenu, testo: string) => void

  // Ristorante — tavoli e prenotazioni (presa a telefono + assegnazione tavolo).
  // Dati statici in memoria, pronti per il DB.
  tavoli: Tavolo[]
  aggiungiTavolo: (numero: number, posti: number, zona: Tavolo['zona']) => void
  rimuoviTavolo: (id: string) => void
  spostaTavolo: (id: string, x: number, y: number) => void
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

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [postazioni, setPostazioni] = useState<Postazione[]>(() => clona(seedPostazioni))
  const [conti, setConti] = useState<ContoOmbrellone[]>(() => clona(seedConti))
  const [costi, setCosti] = useState<VoceCosto[]>(() => clona(seedCosti))
  const [prenotazioniOnline, setPrenotazioni] = useState<PrenotazioneOnline[]>(() =>
    clona(statoSito.prenotazioni)
  )
  const [pagine, setPagine] = useState<PaginaSito[]>(() => clona(statoSito.pagine))
  const [listinoPubblicato, setListinoPubblicato] = useState(true)
  const [canaliPrenotazione, setCanaliPrenotazione] = useState<CanaliPrenotazione>({ ombrelloni: true, ristorante: true, eventi: true })
  const [clientiAggiunti, setClientiAggiunti] = useState<Cliente[]>([])
  const [richiesteRistorante, setRichiesteRistorante] = useState<RichiestaRistorante[]>([])
  const [richiesteEventi, setRichiesteEventi] = useState<RichiestaEvento[]>([])
  const [postaCliente, setPostaCliente] = useState<Email[]>([])
  const [postaAdmin, setPostaAdmin] = useState<Email[]>([])
  const [eventi, setEventi] = useState<Evento[]>(() => clona(seedEventi))
  const [menu, setMenu] = useState<Piatto[]>(() => clona(seedMenu))
  const [galleria, setGalleria] = useState<FotoGalleria[]>(() => clona(statoSito.galleria))
  const [comande, setComande] = useState<Comanda[]>([])
  const [tavoli, setTavoli] = useState<Tavolo[]>(() => clona(seedTavoli))
  const [magazzino, setMagazzino] = useState<ArticoloMagazzino[]>(() => clona(seedMagazzino))
  const [prenotazioniRistorante, setPrenotazioniRistorante] = useState<PrenotazioneRistorante[]>(() => clona(seedPrenotazioniRist))
  const seqRef = useRef(1)
  const nuovoId = (p: string) => `${p}-${Date.now().toString(36)}-${seqRef.current++}`

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

  // — Comande dall'ombrellone —
  const inviaComanda = useCallback((ombrellone: string, righe: RigaComanda[], note?: string) => {
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
    }
    setComande((prev) => [comanda, ...prev])
  }, [])
  const avanzaComanda = useCallback((id: string) => {
    setComande((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, stato: c.stato === 'in_attesa' ? 'in_preparazione' : 'consegnata' } : c
      )
    )
  }, [])
  const annullaComanda = useCallback((id: string) => {
    setComande((prev) => prev.filter((c) => c.id !== id))
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

  const gg = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '')
  const turnoLabel = (t: Turno) => (t === 'pranzo' ? 'pranzo' : 'cena')

  const pushMail = useCallback(
    (casella: Email['casella'], tipo: Email['tipo'], da: string, a: string, oggetto: string, corpo: string) => {
      const mail: Email = { id: nuovoId('MAIL'), casella, tipo, da, a, oggetto, corpo, data: config.stagione.oggi, letto: false }
      if (casella === 'cliente') setPostaCliente((p) => [mail, ...p])
      else setPostaAdmin((p) => [mail, ...p])
    },
    []
  )

  const inviaRichiestaOmbrellone = useCallback((d: DatiRichiestaOmbrellone) => {
    setPrenotazioni((prev) => [
      { id: nuovoId('PO'), ricevutaIl: config.stagione.oggi, nome: d.nome, email: d.email, telefono: d.telefono, dal: d.dal, al: d.al, tipologiaPostazione: d.tipologiaPostazione, persone: d.persone, stato: 'da_confermare', messaggio: d.messaggio },
      ...prev,
    ])
    pushMail('cliente', 'richiesta', config.nome, d.email, 'Richiesta ricevuta — ombrellone',
      `Gentile ${d.nome},\nabbiamo ricevuto la tua richiesta di ombrellone per ${d.persone} persone dal ${gg(d.dal)} al ${gg(d.al)}.\nTi confermeremo la disponibilità a breve.\n\n${config.nome}`)
    pushMail('admin', 'notifica', `${d.nome} <${d.email}>`, config.email || 'gestione', 'Nuova richiesta ombrellone dal sito',
      `Nuova richiesta dal sito:\nCliente: ${d.nome} (${d.telefono})\nOmbrellone · ${d.persone} persone · dal ${gg(d.dal)} al ${gg(d.al)}${d.messaggio ? `\nNote: ${d.messaggio}` : ''}\n\nDa confermare in gestionale.`)
  }, [pushMail])

  const inviaRichiestaRistorante = useCallback((d: DatiRichiestaRistorante) => {
    setRichiesteRistorante((prev) => [
      { id: nuovoId('RR'), ricevutaIl: config.stagione.oggi, nome: d.nome, email: d.email, telefono: d.telefono, data: d.data, turno: d.turno, coperti: d.coperti, stato: 'da_confermare', note: d.note },
      ...prev,
    ])
    pushMail('cliente', 'richiesta', config.nome, d.email, 'Richiesta ricevuta — tavolo ristorante',
      `Gentile ${d.nome},\nabbiamo ricevuto la tua richiesta di tavolo per ${d.coperti} coperti (${turnoLabel(d.turno)}) del ${gg(d.data)}.\nTi confermeremo a breve.\n\n${config.nome}`)
    pushMail('admin', 'notifica', `${d.nome} <${d.email}>`, config.email || 'gestione', 'Nuova richiesta tavolo dal sito',
      `Nuova richiesta dal sito:\nCliente: ${d.nome} (${d.telefono})\nRistorante · ${d.coperti} coperti · ${turnoLabel(d.turno)} del ${gg(d.data)}${d.note ? `\nNote: ${d.note}` : ''}\n\nDa confermare in gestionale.`)
  }, [pushMail])

  const confermaPrenotazione = useCallback((id: string) => {
    const r = prenRef.current.find((p) => p.id === id)
    setPrenotazioni((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'confermata' } : p)))
    if (r) pushMail('cliente', 'conferma', config.nome, r.email, 'Prenotazione confermata ✓',
      `Gentile ${r.nome},\nla tua prenotazione ombrellone dal ${gg(r.dal)} al ${gg(r.al)} è CONFERMATA.\nTi aspettiamo a ${config.nome}!`)
  }, [pushMail])

  const rifiutaPrenotazione = useCallback((id: string) => {
    const r = prenRef.current.find((p) => p.id === id)
    setPrenotazioni((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'rifiutata' } : p)))
    if (r) pushMail('cliente', 'rifiuto', config.nome, r.email, 'Prenotazione non disponibile',
      `Gentile ${r.nome},\nci dispiace, per le date richieste (${gg(r.dal)}–${gg(r.al)}) non abbiamo disponibilità.\nContattaci per verificare alternative.\n\n${config.nome}`)
  }, [pushMail])

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
      pushMail('cliente', 'conferma', config.nome, r.email, 'Tavolo confermato ✓',
        `Gentile ${r.nome},\nil tuo tavolo per ${r.coperti} coperti (${turnoLabel(r.turno)}) del ${gg(r.data)} è CONFERMATO.\nA presto!\n\n${config.nome}`)
    }
  }, [pushMail])

  const rifiutaRistorante = useCallback((id: string) => {
    const r = richRef.current.find((p) => p.id === id)
    setRichiesteRistorante((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'rifiutata' } : p)))
    if (r) pushMail('cliente', 'rifiuto', config.nome, r.email, 'Tavolo non disponibile',
      `Gentile ${r.nome},\nci dispiace, per ${turnoLabel(r.turno)} del ${gg(r.data)} siamo al completo.\nProva con un altro turno o data.\n\n${config.nome}`)
  }, [pushMail])

  const inviaRichiestaEvento = useCallback((d: DatiRichiestaEvento) => {
    setRichiesteEventi((prev) => [
      { id: nuovoId('RE'), ricevutaIl: config.stagione.oggi, nome: d.nome, email: d.email, telefono: d.telefono, eventoId: d.eventoId, eventoNome: d.eventoNome, eventoData: d.eventoData, persone: d.persone, stato: 'da_confermare', note: d.note, origine: 'sito' },
      ...prev,
    ])
    pushMail('cliente', 'richiesta', config.nome, d.email, `Richiesta ricevuta — ${d.eventoNome}`,
      `Gentile ${d.nome},\nabbiamo ricevuto la tua richiesta di partecipazione a “${d.eventoNome}” del ${gg(d.eventoData)} per ${d.persone} persone.\nTi confermeremo a breve.\n\n${config.nome}`)
    pushMail('admin', 'notifica', `${d.nome} <${d.email}>`, config.email || 'gestione', `Nuova richiesta evento: ${d.eventoNome}`,
      `Nuova richiesta dal sito:\nCliente: ${d.nome} (${d.telefono})\nEvento: ${d.eventoNome} del ${gg(d.eventoData)} · ${d.persone} persone${d.note ? `\nNote: ${d.note}` : ''}\n\nDa confermare in gestionale.`)
  }, [pushMail])

  const confermaEvento = useCallback((id: string) => {
    const r = evtRef.current.find((p) => p.id === id)
    setRichiesteEventi((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'confermata' } : p)))
    if (r) pushMail('cliente', 'conferma', config.nome, r.email, `Partecipazione confermata ✓ — ${r.eventoNome}`,
      `Gentile ${r.nome},\nla tua partecipazione a “${r.eventoNome}” del ${gg(r.eventoData)} (${r.persone} persone) è CONFERMATA.\nTi aspettiamo!\n\n${config.nome}`)
  }, [pushMail])

  const rifiutaEvento = useCallback((id: string) => {
    const r = evtRef.current.find((p) => p.id === id)
    setRichiesteEventi((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'rifiutata' } : p)))
    if (r) pushMail('cliente', 'rifiuto', config.nome, r.email, `Posti esauriti — ${r.eventoNome}`,
      `Gentile ${r.nome},\nci dispiace, i posti per “${r.eventoNome}” del ${gg(r.eventoData)} sono esauriti.\n\n${config.nome}`)
  }, [pushMail])

  const aggiungiPartecipanteEvento = useCallback((d: DatiPartecipanteEvento) => {
    setRichiesteEventi((prev) => [
      { id: nuovoId('RE'), ricevutaIl: config.stagione.oggi, nome: d.nome, email: d.email ?? '', telefono: d.telefono ?? '', eventoId: d.eventoId, eventoNome: d.eventoNome, eventoData: d.eventoData, persone: d.persone, stato: 'confermata', note: d.note, origine: 'manuale' },
      ...prev,
    ])
  }, [])

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

  // — Ristorante: tavoli e prenotazioni —
  const aggiungiTavolo = useCallback((numero: number, posti: number, zona: Tavolo['zona']) => {
    setTavoli((prev) => [...prev, { id: nuovoId('TAV'), numero, posti, zona, x: 46 + (prev.length % 5) * 2, y: 40 + (prev.length % 5) * 2, forma: posti > 4 ? 'quadrato' : 'tondo' }])
  }, [])
  const spostaTavolo = useCallback((id: string, x: number, y: number) => {
    // la zona segue la posizione: veranda in alto (fronte mare), poi sala, poi terrazza
    setTavoli((prev) => prev.map((t) => (t.id === id ? { ...t, x, y, zona: y < 36 ? 'veranda' : y < 70 ? 'sala' : 'terrazza' } : t)))
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
  const rimuoviTavolo = useCallback((id: string) => {
    setTavoli((prev) => prev.filter((t) => t.id !== id))
    // il tavolo eliminato non deve restare assegnato a una prenotazione
    setPrenotazioniRistorante((prev) => prev.map((p) => (p.tavoloId === id ? { ...p, tavoloId: undefined } : p)))
  }, [])
  const creaPrenotazioneRistorante = useCallback((d: DatiPrenotazioneRistorante) => {
    setPrenotazioniRistorante((prev) => [
      { id: nuovoId('PR'), data: d.data ?? config.stagione.oggi, turno: d.turno, nome: d.nome, coperti: d.coperti, tavoloId: d.tavoloId, stato: 'confermata', note: d.note, telefono: d.telefono, origine: 'manuale' },
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

  const pubblicaListino = useCallback(() => setListinoPubblicato(true), [])

  const impostaCanalePrenotazione = useCallback((canale: CanalePrenotazione, attivo: boolean) => {
    setCanaliPrenotazione((c) => ({ ...c, [canale]: attivo }))
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setPostazioni(clona(seedPostazioni))
    setConti(clona(seedConti))
    setCosti(clona(seedCosti))
    setPrenotazioni(clona(statoSito.prenotazioni))
    setPagine(clona(statoSito.pagine))
    setListinoPubblicato(true)
    setCanaliPrenotazione({ ombrelloni: true, ristorante: true, eventi: true })
    setClientiAggiunti([])
    setRichiesteRistorante([])
    setRichiesteEventi([])
    setPostaCliente([])
    setPostaAdmin([])
    setEventi(clona(seedEventi))
    setMenu(clona(seedMenu))
    setGalleria(clona(statoSito.galleria))
    setComande([])
    setTavoli(clona(seedTavoli))
    setMagazzino(clona(seedMagazzino))
    setPrenotazioniRistorante(clona(seedPrenotazioniRist))
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
      assegnaPostazione,
      liberaPostazione,
      spostaPostazione,
      segnaFuoriServizio,
      cambiaStato,
      incassaConto,
      comande,
      inviaComanda,
      avanzaComanda,
      annullaComanda,
      clientiAggiunti,
      aggiungiCliente,
      aggiungiCosto,
      confermaPrenotazione,
      rifiutaPrenotazione,
      inviaRichiestaOmbrellone,
      richiesteRistorante,
      confermaRistorante,
      rifiutaRistorante,
      inviaRichiestaRistorante,
      richiesteEventi,
      confermaEvento,
      rifiutaEvento,
      inviaRichiestaEvento,
      aggiungiPartecipanteEvento,
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
      modificaPrezzoPiatto,
      rinominaPiatto,
      impostaTraduzione,
      galleria,
      aggiungiFoto,
      rimuoviFoto,
      rinominaFoto,
      tavoli,
      aggiungiTavolo,
      rimuoviTavolo,
      spostaTavolo,
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
      assegnaPostazione,
      liberaPostazione,
      spostaPostazione,
      segnaFuoriServizio,
      cambiaStato,
      incassaConto,
      comande,
      inviaComanda,
      avanzaComanda,
      annullaComanda,
      clientiAggiunti,
      aggiungiCliente,
      aggiungiCosto,
      confermaPrenotazione,
      rifiutaPrenotazione,
      inviaRichiestaOmbrellone,
      richiesteRistorante,
      confermaRistorante,
      rifiutaRistorante,
      inviaRichiestaRistorante,
      richiesteEventi,
      confermaEvento,
      rifiutaEvento,
      inviaRichiestaEvento,
      aggiungiPartecipanteEvento,
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
      modificaPrezzoPiatto,
      rinominaPiatto,
      impostaTraduzione,
      galleria,
      aggiungiFoto,
      rimuoviFoto,
      rinominaFoto,
      tavoli,
      aggiungiTavolo,
      rimuoviTavolo,
      spostaTavolo,
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
