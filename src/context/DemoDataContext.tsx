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
  Cliente,
  ContoOmbrellone,
  PaginaSito,
  Postazione,
  PrenotazioneOnline,
  RigaConto,
  StatoPostazione,
  VoceCosto,
} from '@/data/types'

import { postazioni as seedPostazioni } from '@/data/seed/spiaggia'
import { contiOmbrellone as seedConti, articoliBar } from '@/data/seed/bar'
import { costi as seedCosti } from '@/data/seed/costi'
import { statoSito } from '@/data/seed/sito'
import { clienti } from '@/data/seed/clienti'
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

interface DemoDataValue {
  postazioni: Postazione[]
  conti: ContoOmbrellone[]
  costi: VoceCosto[]
  prenotazioniOnline: PrenotazioneOnline[]
  pagine: PaginaSito[]
  listinoPubblicato: boolean

  // Azioni arenile
  assegnaPostazione: (id: string, opz: AssegnaOpzioni) => void
  liberaPostazione: (id: string) => void
  spostaPostazione: (daId: string, aId: string) => void
  segnaFuoriServizio: (id: string, note?: string) => void
  cambiaStato: (id: string, stato: StatoPostazione) => void

  // Bar
  incassaConto: (contoId: string) => void

  // Clienti aggiunti in demo (si affiancano a quelli caricati da api)
  clientiAggiunti: Cliente[]
  aggiungiCliente: (cliente: Cliente) => void

  // Costi
  aggiungiCosto: (voce: VoceCosto) => void

  // Sito
  confermaPrenotazione: (id: string) => void
  rifiutaPrenotazione: (id: string) => void
  pubblicaPagina: (id: string) => void
  pubblicaListino: () => void

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
  const [clientiAggiunti, setClientiAggiunti] = useState<Cliente[]>([])

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

  const aggiungiCosto = useCallback((voce: VoceCosto) => {
    setCosti((prev) => [voce, ...prev])
  }, [])

  const aggiungiCliente = useCallback((cliente: Cliente) => {
    setClientiAggiunti((prev) => [cliente, ...prev])
  }, [])

  const confermaPrenotazione = useCallback((id: string) => {
    setPrenotazioni((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stato: 'confermata' } : p))
    )
  }, [])

  const rifiutaPrenotazione = useCallback((id: string) => {
    setPrenotazioni((prev) => prev.map((p) => (p.id === id ? { ...p, stato: 'rifiutata' } : p)))
  }, [])

  const pubblicaPagina = useCallback((id: string) => {
    setPagine((prev) => prev.map((p) => (p.id === id ? { ...p, pubblicata: true } : p)))
  }, [])

  const pubblicaListino = useCallback(() => setListinoPubblicato(true), [])

  const reset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setPostazioni(clona(seedPostazioni))
    setConti(clona(seedConti))
    setCosti(clona(seedCosti))
    setPrenotazioni(clona(statoSito.prenotazioni))
    setPagine(clona(statoSito.pagine))
    setListinoPubblicato(true)
    setClientiAggiunti([])
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
      assegnaPostazione,
      liberaPostazione,
      spostaPostazione,
      segnaFuoriServizio,
      cambiaStato,
      incassaConto,
      clientiAggiunti,
      aggiungiCliente,
      aggiungiCosto,
      confermaPrenotazione,
      rifiutaPrenotazione,
      pubblicaPagina,
      pubblicaListino,
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
      assegnaPostazione,
      liberaPostazione,
      spostaPostazione,
      segnaFuoriServizio,
      cambiaStato,
      incassaConto,
      clientiAggiunti,
      aggiungiCliente,
      aggiungiCosto,
      confermaPrenotazione,
      rifiutaPrenotazione,
      pubblicaPagina,
      pubblicaListino,
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
