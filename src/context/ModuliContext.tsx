/**
 * ModuliContext — quali moduli e quali funzionalità (schede dei moduli) sono attivi per il cliente corrente.
 *
 * Stato in localStorage e, con Supabase, nella riga `moduli` di `beachin.impostazioni`
 * (`valori = { attivi, spente }`, aggiornata dal vivo su tutti i dispositivi). Se la riga non c'è
 * vale lo stato locale finché l'amministratore non cambia qualcosa.
 *
 * I moduli CORE sono sempre attivi. Gli altri si attivano/disattivano dal vivo
 * (utile per mostrare l'upsell al cliente) o applicando un piano. Le funzionalità nascono
 * attive: si salvano solo quelle spente (`spente`, id `modulo.scheda`).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FUNZIONI, MODULI_CORE, PIANI, PIANO_DEFAULT, type ModuloId } from '@/config/moduli'
import { SCHEMA, supabase } from '@/lib/supabase'

const CHIAVE = 'beachin.moduli.v1'
const CHIAVE_SALA = 'beachin.moduli.sala'
const CHIAVE_BAR_TAVOLO = 'beachin.moduli.bartavolo'
const CHIAVE_SPENTE = 'beachin.funzioni.spente'
const ID_DB = 'moduli'

function caricaSpente(): string[] {
  try {
    const arr = JSON.parse(localStorage.getItem(CHIAVE_SPENTE) ?? '[]')
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string')
  } catch { /* no-op */ }
  return []
}

function carica(): ModuloId[] {
  try {
    const raw = localStorage.getItem(CHIAVE)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        // Comande ristorante (ott 2026) è nato dopo: chi aveva già il Ristorante lo trova attivo una volta, poi decide lui
        if (!localStorage.getItem(CHIAVE_SALA)) {
          localStorage.setItem(CHIAVE_SALA, '1')
          if (arr.includes('ristorante') && !arr.includes('sala')) arr.push('sala')
        }
        // Bar al tavolo (ott 2026): attivo una volta per chi ha già Comande ristorante e Bar
        if (!localStorage.getItem(CHIAVE_BAR_TAVOLO)) {
          localStorage.setItem(CHIAVE_BAR_TAVOLO, '1')
          if (arr.includes('sala') && arr.includes('bar') && !arr.includes('bar-tavolo')) arr.push('bar-tavolo')
        }
        return arr as ModuloId[]
      }
    }
  } catch {
    /* localStorage non disponibile: si parte dal piano di default */
  }
  return PIANI[PIANO_DEFAULT].moduli
}

/**
 * Unisce i moduli richiesti con i core (sempre attivi), senza duplicati.
 * Comande usa il listino del Bar: con Comande attivo, il Bar resta attivo
 * (altrimenti dal menu sparivano Listino e Conti lasciando solo Comande).
 * Allo stesso modo Comande ristorante usa il menu del Ristorante, e Bar al tavolo usa entrambi.
 */
function conCore(moduli: ModuloId[]): ModuloId[] {
  const dip: ModuloId[] = [
    ...(moduli.includes('comande') ? ['bar' as const] : []),
    ...(moduli.includes('sala') ? ['ristorante' as const] : []),
    ...(moduli.includes('bar-tavolo') ? ['sala' as const, 'ristorante' as const, 'bar' as const] : []),
  ]
  return Array.from(new Set<ModuloId>([...MODULI_CORE, ...moduli, ...dip]))
}

interface ModuliValue {
  attivi: ModuloId[]
  pianoCorrente: string | null
  moduloAttivo: (id: ModuloId) => boolean
  attiva: (id: ModuloId) => void
  disattiva: (id: ModuloId) => void
  toggle: (id: ModuloId) => void
  applicaPiano: (pianoId: string) => void
  /** Funzionalità `modulo.scheda` attiva: modulo attivo e funzionalità non spenta. Id sconosciuti = il modulo. */
  funzioneAttiva: (id: string) => boolean
  toggleFunzione: (id: string) => void
}

const ModuliContext = createContext<ModuliValue | null>(null)

export function ModuliProvider({ children }: { children: ReactNode }) {
  const [attivi, setAttivi] = useState<ModuloId[]>(() => conCore(carica()))
  const [spente, setSpente] = useState<string[]>(caricaSpente)

  const applica = useCallback((a: ModuloId[], sp: string[]) => {
    setAttivi(a)
    setSpente(sp)
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(a))
      localStorage.setItem(CHIAVE_SPENTE, JSON.stringify(sp))
    } catch { /* no-op */ }
  }, [])

  const salva = useCallback((next: ModuloId[], sp: string[] = spente) => {
    const v = conCore(next)
    applica(v, sp)
    if (supabase) void supabase.from('impostazioni').upsert({ id: ID_DB, valori: { attivi: v, spente: sp }, aggiornato: new Date().toISOString() })
      .then(({ error }) => error && console.error('[supabase] moduli:', error.message))
  }, [spente, applica])

  // Stato del cliente dal database, aggiornato dal vivo
  useEffect(() => {
    if (!supabase) return
    const db = supabase
    const lettura = async () => {
      const { data, error } = await db.from('impostazioni').select('valori').eq('id', ID_DB).maybeSingle()
      if (error) { console.error('[supabase] moduli:', error.message); return }
      const v = data?.valori as { attivi?: unknown; spente?: unknown } | undefined
      if (!v || !Array.isArray(v.attivi)) return
      applica(conCore(v.attivi as ModuloId[]), Array.isArray(v.spente) ? (v.spente as string[]) : [])
    }
    void lettura()
    const ch = db.channel('sync-moduli')
      .on('postgres_changes', { event: '*', schema: SCHEMA, table: 'impostazioni', filter: `id=eq.${ID_DB}` }, () => void lettura())
      .subscribe()
    return () => { void db.removeChannel(ch) }
  }, [applica])

  const moduloAttivo = useCallback((id: ModuloId) => attivi.includes(id), [attivi])

  const attiva = useCallback((id: ModuloId) => salva([...attivi, id]), [attivi, salva])
  const disattiva = useCallback(
    // spegnere il Bar spegne anche Comande, che ne usa il listino
    (id: ModuloId) => salva(attivi.filter((m) => m !== id && !(id === 'bar' && m === 'comande') && !(id === 'ristorante' && m === 'sala')
      && !(['bar', 'sala', 'ristorante'].includes(id) && m === 'bar-tavolo'))),
    [attivi, salva]
  )
  const toggle = useCallback(
    (id: ModuloId) => (attivi.includes(id) ? disattiva(id) : attiva(id)),
    [attivi, attiva, disattiva]
  )
  // Un piano accende tutte le funzionalità dei suoi moduli
  const applicaPiano = useCallback(
    (pianoId: string) => { const p = PIANI[pianoId]; if (p) salva(p.moduli, []) },
    [salva]
  )

  const funzioneAttiva = useCallback((id: string) => {
    const fz = FUNZIONI.find((x) => x.id === id)
    const modulo = (fz?.modulo ?? id.split('.')[0]) as ModuloId
    return attivi.includes(modulo) && !spente.includes(id)
  }, [attivi, spente])
  const toggleFunzione = useCallback(
    (id: string) => salva(attivi, spente.includes(id) ? spente.filter((x) => x !== id) : [...spente, id]),
    [attivi, spente, salva]
  )

  // Il piano corrente è quello i cui moduli coincidono esattamente con gli attivi (e nessuna funzionalità spenta).
  const pianoCorrente = useMemo(() => {
    if (spente.some((id) => FUNZIONI.some((x) => x.id === id && attivi.includes(x.modulo)))) return null
    const set = new Set(attivi)
    const match = Object.values(PIANI).find(
      (p) => {
        const pset = new Set(conCore(p.moduli))
        return pset.size === set.size && [...pset].every((m) => set.has(m))
      }
    )
    return match ? match.id : null
  }, [attivi, spente])

  const value = useMemo<ModuliValue>(
    () => ({ attivi, pianoCorrente, moduloAttivo, attiva, disattiva, toggle, applicaPiano, funzioneAttiva, toggleFunzione }),
    [attivi, pianoCorrente, moduloAttivo, attiva, disattiva, toggle, applicaPiano, funzioneAttiva, toggleFunzione]
  )

  return <ModuliContext.Provider value={value}>{children}</ModuliContext.Provider>
}

export function useModuli(): ModuliValue {
  const ctx = useContext(ModuliContext)
  if (!ctx) throw new Error('useModuli deve stare dentro <ModuliProvider>')
  return ctx
}
