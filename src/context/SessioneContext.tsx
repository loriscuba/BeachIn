/**
 * Sessione dello staff (gestionale e app admin).
 * - Con Supabase: login email + password (Supabase Auth); il profilo (ruolo e permessi) arriva da `beachin.mio_profilo()`.
 *   Chi ha un account Auth ma nessun profilo attivo in `beachin.utenti` non entra.
 * - Senza Supabase: credenziali demo nel codice (`src/lib/adminapp.ts`), profilo amministratore.
 * Il profilo si ricarica quando la finestra torna in primo piano e quando cambia la propria riga (Realtime):
 * un utente disattivato esce subito.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { credenzialiValide, entraGestore, esciGestore, sessioneGestore } from '@/lib/adminapp'
import { PROFILO_DEMO, livelloDi, sezioneDi, type Livello, type Profilo, type Sezione } from '@/lib/permessi'
import type { ModuloId } from '@/config/moduli'

interface Sessione {
  profilo: Profilo | null
  /** true finché non si sa se c'è una sessione salvata. */
  caricamento: boolean
  /** Restituisce un messaggio d'errore, oppure null se l'accesso è riuscito. */
  accedi: (utente: string, password: string) => Promise<string | null>
  esci: () => Promise<void>
  livello: (sezione: Sezione | null) => Livello
  /** Permesso su un modulo del menu (Panoramica sempre). */
  puo: (modulo: ModuloId | 'utenti', minimo?: Livello) => boolean
}

const Ctx = createContext<Sessione | null>(null)

async function leggiProfilo(): Promise<Profilo | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('mio_profilo')
  if (error) { console.error('profilo', error.message); return null }
  return (data as Profilo | null) ?? null
}

export function SessioneProvider({ children }: { children: ReactNode }) {
  const [profilo, setProfilo] = useState<Profilo | null>(() => (!supabase && sessioneGestore() ? PROFILO_DEMO : null))
  const [caricamento, setCaricamento] = useState(!!supabase)

  const aggiorna = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    if (!data.session) { setProfilo(null); return }
    const p = await leggiProfilo()
    if (!p) await supabase.auth.signOut() // disattivato o senza profilo BeachIn
    setProfilo(p)
  }, [])

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    void aggiorna().finally(() => setCaricamento(false))
    const { data: sub } = db.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') setProfilo(null)
    })
    const inPrimoPiano = () => { if (document.visibilityState === 'visible') void aggiorna() }
    document.addEventListener('visibilitychange', inPrimoPiano)
    return () => { sub.subscription.unsubscribe(); document.removeEventListener('visibilitychange', inPrimoPiano) }
  }, [aggiorna])

  // Modifiche alla propria riga (ruolo cambiato, disattivazione) → ricarico il profilo.
  const idUtente = profilo?.id
  useEffect(() => {
    if (!supabase || !idUtente) return
    const db = supabase
    const canale = db
      .channel(`utente-${idUtente}`)
      .on('postgres_changes', { event: '*', schema: 'beachin', table: 'utenti', filter: `id=eq.${idUtente}` }, () => { void aggiorna() })
      .subscribe()
    return () => { void db.removeChannel(canale) }
  }, [idUtente, aggiorna])

  const accedi = useCallback(async (utente: string, password: string) => {
    if (!supabase) {
      if (!credenzialiValide(utente, password)) return 'Utente o password non corretti.'
      entraGestore()
      setProfilo(PROFILO_DEMO)
      return null
    }
    const { error } = await supabase.auth.signInWithPassword({ email: utente.trim().toLowerCase(), password })
    if (error) return error.message.includes('banned') ? 'Utente disattivato.' : 'Email o password non corretti.'
    const p = await leggiProfilo()
    if (!p) { await supabase.auth.signOut(); return 'Utente non abilitato al gestionale o disattivato.' }
    setProfilo(p)
    return null
  }, [])

  const esci = useCallback(async () => {
    esciGestore()
    if (supabase) await supabase.auth.signOut()
    setProfilo(null)
  }, [])

  const valore = useMemo<Sessione>(() => {
    const livello = (s: Sezione | null) => livelloDi(profilo, s)
    return {
      profilo, caricamento, accedi, esci, livello,
      puo: (m, minimo = 1) => livello(m === 'utenti' ? 'utenti' : sezioneDi(m)) >= minimo,
    }
  }, [profilo, caricamento, accedi, esci])

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>
}

export function useSessione() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSessione fuori da SessioneProvider')
  return c
}
