/** Credenziali DEMO (finte), usate solo senza Supabase. Con Supabase: utenti e ruoli veri (`SessioneContext`). */
import { urlPubblico } from '@/lib/urlPubblico'
export const UTENTI_ADMIN = [{ utente: 'admin', password: 'lido', nome: 'Gestione Lido' }]

// Sessione demo locale (senza Supabase), condivisa tra gestionale e app admin.
const CHIAVE_SESSIONE = 'adminapp.sessione.v1'
export const sessioneGestore = () => { try { return localStorage.getItem(CHIAVE_SESSIONE) === '1' } catch { return false } }
export const entraGestore = () => { try { localStorage.setItem(CHIAVE_SESSIONE, '1') } catch { /* */ } }
export const esciGestore = () => { try { localStorage.removeItem(CHIAVE_SESSIONE) } catch { /* */ } }
export const credenzialiValide = (utente: string, password: string) =>
  UTENTI_ADMIN.some((u) => u.utente === utente.trim().toLowerCase() && u.password === password)

/** Link pubblico dell'app admin (da aprire sul telefono del gestore). */
export function urlAdminApp(): string {
  return urlPubblico('adminapp')
}
