import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase (solo ComandApp/comande e menu del ristorante).
 * Configurato da VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY; se mancano l'app resta in modalità demo locale.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chiave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Schema dedicato (il progetto Supabase è condiviso tra più demo): tutte le tabelle stanno in `beachin`. */
export const SCHEMA = 'beachin'

// Niente sessioni Auth: su loriscuba.github.io altre demo dello stesso progetto Supabase salvano il loro login nello
// stesso localStorage; supabase-js lo riusava e le richieste partivano come `authenticated` invece di `anon`
// (le policy demo sono solo per anon → letture vuote e scritture rifiutate, solo nel browser e non nell'app sulla Home).
export const supabase = url && chiave
  ? createClient(url, chiave, {
      db: { schema: SCHEMA },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'beachin.auth' },
    })
  : null
export const supabaseAttivo = !!supabase
