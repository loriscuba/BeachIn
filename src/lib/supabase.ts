import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase (solo ComandApp/comande e menu del ristorante).
 * Configurato da VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY; se mancano l'app resta in modalità demo locale.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chiave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Schema dedicato (il progetto Supabase è condiviso tra più demo): tutte le tabelle stanno in `beachin`. */
export const SCHEMA = 'beachin'

// Sessione Auth solo per lo staff del gestionale (utenti e ruoli, migrazione 0011), in una chiave tutta sua:
// su loriscuba.github.io altre demo dello stesso progetto Supabase salvano il loro login nello stesso localStorage
// con la chiave predefinita, e supabase-js lo riusava facendo partire le richieste come `authenticated`.
// Senza login le richieste restano `anon` (sito, ComandApp, menu QR).
export const supabase = url && chiave
  ? createClient(url, chiave, {
      db: { schema: SCHEMA },
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'beachin.auth' },
    })
  : null
export const supabaseAttivo = !!supabase

// Client senza sessione per le richieste dei clienti dal sito: non aspetta il rinnovo del login dello staff salvato sullo
// stesso dominio, e con keepalive la richiesta arriva al DB anche se il telefono mette subito la pagina in background.
export const supabaseInvii = url && chiave
  ? createClient(url, chiave, {
      db: { schema: SCHEMA },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'beachin.invii' },
      global: { fetch: (input, init) => fetch(input, { ...init, keepalive: true }) },
    })
  : null
