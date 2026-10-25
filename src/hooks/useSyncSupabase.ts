import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { supabase, SCHEMA } from '@/lib/supabase'

type Riga = Record<string, unknown> & { id: string }
type Filtro = { or: () => string; tieni: (r: Riga) => boolean }

/**
 * Cosa fa una pagina con una tabella (le pagine dei clienti non scaricano quello che non usano):
 * `completo` legge e scrive; `lettura` solo legge; `nuove` legge e salva solo le righe nuove (es. una comanda o una richiesta,
 * mai modifiche né cancellazioni); `scrittura` non legge e salva solo le righe nuove; `spento` niente.
 */
export type ModoSync = 'completo' | 'lettura' | 'nuove' | 'scrittura' | 'spento'
export interface AccessoSync {
  modo: ModoSync
  /** Colonne da leggere (es. senza nomi e telefoni); con meno colonne la pagina non deve poter modificare le righe lette. */
  colonne?: string
  /** Filtro della pagina, al posto di quello della tabella. */
  filtro?: Filtro
}

interface Opzioni<T extends { id: string }> {
  tabella: string
  righe: T[]
  setRighe: Dispatch<SetStateAction<T[]>>
  /** Oggetto app → riga DB (l'indice serve per salvare l'ordine). */
  aRiga: (x: T, indice: number) => Riga
  daRiga: (r: Riga) => T
  /** Ordinamento delle righe lette dal DB. */
  ordina: (a: Riga, b: Riga) => number
  /** Se la tabella è vuota al primo avvio, la popola con i dati iniziali locali. */
  semina?: boolean
  /**
   * Solo le righe che servono (es. comande non pagate o di oggi): `or` è il filtro della lettura (sintassi PostgREST),
   * `tieni` la stessa regola per le modifiche dal vivo. Le righe escluse restano nel DB e non vengono mai cancellate.
   */
  filtro?: Filtro
  /**
   * Le modifiche dal vivo aggiornano solo la riga cambiata invece di rileggere la tabella.
   * Solo per tabelle che non salvano l'ordine (`aRiga` non usa l'indice).
   */
  perRiga?: boolean
  /** Righe nuove scritte con «inserisci se manca»: se un altro dispositivo l'ha creata prima, vince la sua (e si rilegge). */
  nuoveSenzaSovrascrivere?: boolean
  /** Cosa fa con la tabella la pagina aperta (assente = completo). */
  accesso?: AccessoSync
}

/**
 * Sincronizza un array di stato React con una tabella Supabase:
 * lettura iniziale, scrittura delle differenze (upsert/delete) a ogni modifica locale
 * e aggiornamento dal vivo via Realtime. Senza Supabase configurato non fa nulla.
 */
export function useSyncSupabase<T extends { id: string }>({ tabella, righe, setRighe, aRiga, daRiga, ordina, semina, nuoveSenzaSovrascrivere, filtro: filtroTabella, perRiga, accesso }: Opzioni<T>) {
  const modo = accesso?.modo ?? 'completo'
  const filtro = accesso?.filtro ?? filtroTabella
  const colonne = accesso?.colonne ?? '*'
  const pronto = useRef(false)
  const foto = useRef(new Map<string, string>()) // id → JSON dell'ultima riga nota al DB
  const opz = useRef({ aRiga, daRiga, ordina, filtro })
  opz.current = { aRiga, daRiga, ordina, filtro }
  const righeRef = useRef(righe)
  righeRef.current = righe
  const ricaricaRef = useRef(async () => {})

  // Lettura iniziale + Realtime
  useEffect(() => {
    if (!supabase || modo === 'spento') return
    // solo scrittura: niente da leggere, si salvano le righe nuove
    if (modo === 'scrittura') { pronto.current = true; return }
    const db = supabase
    let attivo = true
    const applica = (lista: Riga[]) => {
      const oggetti = [...lista].sort(opz.current.ordina).map(opz.current.daRiga)
      // la "foto" è normalizzata come la scriverebbe l'app, così i confronti non generano scritture inutili
      foto.current = new Map(oggetti.map((o, i) => [o.id, JSON.stringify(opz.current.aRiga(o, i))]))
      setRighe(oggetti)
    }
    const leggi = () => {
      const q = db.from(tabella).select<string, Riga>(colonne)
      return opz.current.filtro ? q.or(opz.current.filtro.or()) : q
    }
    ;(async () => {
      const { data, error } = await leggi()
      if (!attivo) return
      if (error) { console.error(`[supabase] ${tabella}:`, error.message); return }
      if (!data.length && semina && modo === 'completo' && righeRef.current.length) {
        const iniziali = righeRef.current.map(opz.current.aRiga)
        const { error: e } = await db.from(tabella).upsert(iniziali)
        if (e) console.error(`[supabase] semina ${tabella}:`, e.message)
        foto.current = new Map(iniziali.map((r) => [r.id, JSON.stringify(r)]))
      } else {
        applica(data as Riga[])
      }
      pronto.current = true
    })()
    // ricarica la tabella: semplice e sempre coerente (tabelle piccole)
    const ricarica = async () => {
      if (!pronto.current) return
      const { data } = await leggi()
      if (attivo && data) applica(data as Riga[])
    }
    ricaricaRef.current = ricarica
    const canale = db
      .channel(`sync-${tabella}`)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: tabella }, (p) => {
        if (!perRiga || !pronto.current) return void ricarica()
        // solo la riga cambiata: niente download della tabella intera a ogni tocco
        const nuova = p.eventType === 'DELETE' ? null : (p.new as Riga)
        const id = String((nuova ?? (p.old as Riga)).id)
        const { aRiga: aR, daRiga: daR, ordina: ord, filtro: f } = opz.current
        const tenuta = nuova && (!f || f.tieni(nuova)) ? daR(nuova) : null
        // la foto segue: una riga uscita dal filtro sparisce da qui senza essere cancellata dal DB
        if (tenuta) foto.current.set(id, JSON.stringify(aR(tenuta, 0)))
        else foto.current.delete(id)
        setRighe((prev) => {
          const senza = prev.filter((x) => x.id !== id)
          return tenuta ? [...senza, tenuta].sort((a, b) => ord(aR(a, 0), aR(b, 0))) : senza
        })
      })
      // (ri)connessione del canale live: recupera quanto perso mentre era giù
      .subscribe((stato) => { if (stato === 'SUBSCRIBED') void ricarica() })
    // Su telefono l'app in background viene sospesa e il canale live cade:
    // quando torna in primo piano (es. tocco su una notifica) o torna la rete, rileggo i dati.
    const suVisibile = () => { if (document.visibilityState === 'visible') void ricarica() }
    document.addEventListener('visibilitychange', suVisibile)
    window.addEventListener('online', suVisibile)
    window.addEventListener('pageshow', suVisibile)
    return () => {
      attivo = false
      void db.removeChannel(canale)
      document.removeEventListener('visibilitychange', suVisibile)
      window.removeEventListener('online', suVisibile)
      window.removeEventListener('pageshow', suVisibile)
    }
  }, [tabella, semina, setRighe, perRiga, modo, colonne])

  // Scrittura delle differenze locali
  useEffect(() => {
    if (!supabase || !pronto.current || modo === 'lettura' || modo === 'spento') return
    const db = supabase
    const nuove = righe.map(opz.current.aRiga)
    // pagine dei clienti: solo righe nuove, mai modifiche o cancellazioni di quelle lette
    const soloNuove = modo === 'nuove' || modo === 'scrittura'
    const cambiate = nuove.filter((r) => (soloNuove ? !foto.current.has(r.id) : foto.current.get(r.id) !== JSON.stringify(r)))
    const ids = new Set(nuove.map((r) => r.id))
    const tolte = soloNuove ? [] : [...foto.current.keys()].filter((id) => !ids.has(id))
    if (!cambiate.length && !tolte.length) return
    const daCreare = nuoveSenzaSovrascrivere ? cambiate.filter((r) => !foto.current.has(r.id)) : []
    const aggiornate = cambiate.filter((r) => !daCreare.includes(r))
    cambiate.forEach((r) => foto.current.set(r.id, JSON.stringify(r)))
    tolte.forEach((id) => foto.current.delete(id))
    // scrittura rifiutata dal DB (es. comanda su un conto già chiuso): si torna a quello che c'è nel DB
    if (aggiornate.length) void db.from(tabella).upsert(aggiornate).then(({ error }) => {
      if (!error) return
      console.error(`[supabase] ${tabella}:`, error.message)
      void ricaricaRef.current()
    })
    if (daCreare.length) void db.from(tabella).upsert(daCreare, { ignoreDuplicates: true }).then(({ error }) => {
      if (error) console.error(`[supabase] ${tabella}:`, error.message)
      void ricaricaRef.current()
    })
    if (tolte.length) void db.from(tabella).delete().in('id', tolte).then(({ error }) => error && console.error(`[supabase] ${tabella}:`, error.message))
  }, [righe, tabella, nuoveSenzaSovrascrivere, modo])

  // funzioni stabili (si possono usare nelle azioni con useCallback)
  const api = useRef({
    /** Rilegge la tabella dal DB. */
    ricarica: () => ricaricaRef.current(),
    /** La riga è già stata salvata per altra via (es. una funzione del DB): la scrittura automatica la salta. */
    allinea: (x: T) => { foto.current.set(x.id, JSON.stringify(opz.current.aRiga(x, 0))) },
  })
  return api.current
}
