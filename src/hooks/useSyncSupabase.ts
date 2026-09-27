import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { supabase, SCHEMA } from '@/lib/supabase'

type Riga = Record<string, unknown> & { id: string }

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
}

/**
 * Sincronizza un array di stato React con una tabella Supabase:
 * lettura iniziale, scrittura delle differenze (upsert/delete) a ogni modifica locale
 * e aggiornamento dal vivo via Realtime. Senza Supabase configurato non fa nulla.
 */
export function useSyncSupabase<T extends { id: string }>({ tabella, righe, setRighe, aRiga, daRiga, ordina, semina }: Opzioni<T>) {
  const pronto = useRef(false)
  const foto = useRef(new Map<string, string>()) // id → JSON dell'ultima riga nota al DB
  const opz = useRef({ aRiga, daRiga, ordina })
  opz.current = { aRiga, daRiga, ordina }
  const righeRef = useRef(righe)
  righeRef.current = righe

  // Lettura iniziale + Realtime
  useEffect(() => {
    if (!supabase) return
    const db = supabase
    let attivo = true
    const applica = (lista: Riga[]) => {
      const oggetti = [...lista].sort(opz.current.ordina).map(opz.current.daRiga)
      // la "foto" è normalizzata come la scriverebbe l'app, così i confronti non generano scritture inutili
      foto.current = new Map(oggetti.map((o, i) => [o.id, JSON.stringify(opz.current.aRiga(o, i))]))
      setRighe(oggetti)
    }
    ;(async () => {
      const { data, error } = await db.from(tabella).select('*')
      if (!attivo) return
      if (error) { console.error(`[supabase] ${tabella}:`, error.message); return }
      if (!data.length && semina && righeRef.current.length) {
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
      const { data } = await db.from(tabella).select('*')
      if (attivo && data) applica(data as Riga[])
    }
    const canale = db
      .channel(`sync-${tabella}`)
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: tabella }, () => void ricarica())
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
  }, [tabella, semina, setRighe])

  // Scrittura delle differenze locali
  useEffect(() => {
    if (!supabase || !pronto.current) return
    const db = supabase
    const nuove = righe.map(opz.current.aRiga)
    const cambiate = nuove.filter((r) => foto.current.get(r.id) !== JSON.stringify(r))
    const ids = new Set(nuove.map((r) => r.id))
    const tolte = [...foto.current.keys()].filter((id) => !ids.has(id))
    if (!cambiate.length && !tolte.length) return
    cambiate.forEach((r) => foto.current.set(r.id, JSON.stringify(r)))
    tolte.forEach((id) => foto.current.delete(id))
    if (cambiate.length) void db.from(tabella).upsert(cambiate).then(({ error }) => error && console.error(`[supabase] ${tabella}:`, error.message))
    if (tolte.length) void db.from(tabella).delete().in('id', tolte).then(({ error }) => error && console.error(`[supabase] ${tabella}:`, error.message))
  }, [righe, tabella])
}
