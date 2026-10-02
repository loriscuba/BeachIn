/** Credenziali DEMO (finte) dell'app del gestore. Domani = Supabase Auth con ruolo "gestore". */
import { urlPubblico } from '@/lib/urlPubblico'
export const UTENTI_ADMIN = [{ utente: 'admin', password: 'lido', nome: 'Gestione Lido' }]

/** Link pubblico dell'app admin (da aprire sul telefono del gestore). */
export function urlAdminApp(): string {
  return urlPubblico('adminapp')
}
