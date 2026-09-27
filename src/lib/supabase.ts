import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase (solo ComandApp/comande e menu del ristorante).
 * Configurato da VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY; se mancano l'app resta in modalità demo locale.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chiave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = url && chiave ? createClient(url, chiave) : null
export const supabaseAttivo = !!supabase
