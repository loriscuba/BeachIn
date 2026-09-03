/**
 * DemoDataContext — stato mutabile "in memoria" per la demo.
 * Contiene i domini su cui si clicca durante la presentazione (postazioni,
 * conti bar, costi, prenotazioni dal sito, pagine pubblicate) e le relative
 * azioni. Al refresh tutto torna allo stato iniziale dei seed: è voluto.
 *
 * Le pagine importano questo context (non i seed) per leggere/mutare lo stato
 * dal vivo; per i dati in sola lettura usano invece api.ts.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  ContoOmbrellone,
  PaginaSito,
  Postazione,
  PrenotazioneOnline,
  StatoPostazione,
  VoceCosto,
} from '@/data/types'

import { postazioni as seedPostazioni } from '@/data/seed/spiaggia'
import { contiOmbrellone as seedConti } from '@/data/seed/bar'
import { costi as seedCosti } from '@/data/seed/costi'
import { statoSito } from '@/data/seed/sito'

const clona = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))

export interface AssegnaOpzioni {
  clienteId?: string
  periodoDal?: string
  periodoAl?: string
  tariffaApplicata?: number
  stagionale?: boolean
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

  // Costi
  aggiungiCosto: (voce: VoceCosto) => void

  // Sito
  confermaPrenotazione: (id: string) => void
  rifiutaPrenotazione: (id: string) => void
  pubblicaPagina: (id: string) => void
  pubblicaListino: () => void

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
    setPostazioni(clona(seedPostazioni))
    setConti(clona(seedConti))
    setCosti(clona(seedCosti))
    setPrenotazioni(clona(statoSito.prenotazioni))
    setPagine(clona(statoSito.pagine))
    setListinoPubblicato(true)
  }, [])

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
      aggiungiCosto,
      confermaPrenotazione,
      rifiutaPrenotazione,
      pubblicaPagina,
      pubblicaListino,
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
      aggiungiCosto,
      confermaPrenotazione,
      rifiutaPrenotazione,
      pubblicaPagina,
      pubblicaListino,
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
