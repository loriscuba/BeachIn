/**
 * Sessione dello staff (gestionale e app admin).
 * - Con Supabase: login nome utente (o email) + password (Supabase Auth); il profilo (ruolo e permessi) arriva da `beachin.mio_profilo()`.
 *   Chi ha un account Auth ma nessun profilo attivo in `beachin.utenti` non entra.
 * - Senza Supabase: utenti demo nel codice (`src/lib/adminapp.ts`): amministratore, cameriere, cucina, barista.
 * Il profilo si ricarica quando la finestra torna in primo piano e quando cambia la propria riga (Realtime):
 * un utente disattivato esce subito.
 * Si esce solo con Esci o quando il server dice che l'utente non è (più) abilitato: un errore di rete alla riapertura
 * dell'app (tipico della PWA su iPhone, rete non ancora pronta) non fa più uscire; resta l'ultimo profilo salvato.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { credenzialiValide, entraGestore, esciGestore, profiloDemo, sessioneGestore } from '@/lib/adminapp'
import { emailAccesso, livelloDi, livelloFunzioneDi, sezioneDi, type Livello, type Profilo, type Sezione } from '@/lib/permessi'
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
  /** Livello su una funzionalità `modulo.scheda` (mai più alto di quello del modulo). */
  livelloFunzione: (id: string) => Livello
}

const Ctx = createContext<Sessione | null>(null)

/** `undefined` = non si sa (errore di rete o del server), `null` = utente non abilitato. */
async function leggiProfilo(): Promise<Profilo | null | undefined> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('mio_profilo')
    if (error) { console.error('profilo', error.message); return undefined }
    return (data as Profilo | null) ?? null
  } catch { return undefined }
}

// Ultimo profilo letto, per riaprire l'app subito (e senza rete) finché la sessione Auth è salvata.
const CHIAVE_PROFILO = 'beachin.profilo'
function profiloSalvato(): Profilo | null {
  try { const v = localStorage.getItem(CHIAVE_PROFILO); return v ? (JSON.parse(v) as Profilo) : null } catch { return null }
}
function salvaProfilo(p: Profilo | null) {
  try { if (p) localStorage.setItem(CHIAVE_PROFILO, JSON.stringify(p)); else localStorage.removeItem(CHIAVE_PROFILO) } catch { /* */ }
}

export function SessioneProvider({ children }: { children: ReactNode }) {
  const [profilo, setProfilo] = useState<Profilo | null>(() => (supabase ? null : profiloDemo(sessioneGestore() ?? '')))
  const [caricamento, setCaricamento] = useState(!!supabase)

  const aggiorna = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.auth.getSession()
    if (error) { setProfilo((x) => x ?? profiloSalvato()); return } // rinnovo token non riuscito per rete: si riprova dopo
    if (!data.session) { salvaProfilo(null); setProfilo(null); return }
    const p = await leggiProfilo()
    if (p === undefined) { setProfilo((x) => x ?? profiloSalvato()); return }
    if (!p) await supabase.auth.signOut() // disattivato o senza profilo BeachIn
    salvaProfilo(p)
    setProfilo(p)
  }, [])

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    void aggiorna().finally(() => setCaricamento(false))
    const { data: sub } = db.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') { salvaProfilo(null); setProfilo(null) }
    })
    const inPrimoPiano = () => { if (document.visibilityState === 'visible') void aggiorna() }
    const ritornoRete = () => void aggiorna()
    document.addEventListener('visibilitychange', inPrimoPiano)
    window.addEventListener('online', ritornoRete)
    return () => {
      sub.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', inPrimoPiano)
      window.removeEventListener('online', ritornoRete)
    }
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
      const u = utente.trim().toLowerCase()
      entraGestore(u)
      setProfilo(profiloDemo(u))
      return null
    }
    const { error } = await supabase.auth.signInWithPassword({ email: emailAccesso(utente), password })
    if (error) return error.message.includes('banned') ? 'Utente disattivato.' : 'Utente o password non corretti.'
    const p = await leggiProfilo()
    if (p === undefined) { await supabase.auth.signOut(); return 'Connessione assente, riprova.' }
    if (!p) { await supabase.auth.signOut(); return 'Utente non abilitato al gestionale o disattivato.' }
    salvaProfilo(p)
    setProfilo(p)
    return null
  }, [])

  const esci = useCallback(async () => {
    esciGestore()
    salvaProfilo(null)
    if (supabase) await supabase.auth.signOut()
    setProfilo(null)
  }, [])

  const valore = useMemo<Sessione>(() => {
    const livello = (s: Sezione | null) => livelloDi(profilo, s)
    return {
      profilo, caricamento, accedi, esci, livello,
      puo: (m, minimo = 1) => livello(m === 'utenti' ? 'utenti' : sezioneDi(m)) >= minimo,
      livelloFunzione: (id) => livelloFunzioneDi(profilo, id),
    }
  }, [profilo, caricamento, accedi, esci])

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>
}

export function useSessione() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSessione fuori da SessioneProvider')
  return c
}
