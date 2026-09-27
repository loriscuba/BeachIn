/** Credenziali DEMO (finte) dell'app del gestore. Domani = Supabase Auth con ruolo "gestore". */
export const UTENTI_ADMIN = [{ utente: 'admin', password: 'lido', nome: 'Gestione Lido' }]

/** Link pubblico dell'app admin (da aprire sul telefono del gestore). */
export function urlAdminApp(): string {
  if (import.meta.env.VITE_ROUTER === 'hash') return `${window.location.href.split('#')[0]}#/adminapp`
  return `${window.location.origin}${import.meta.env.BASE_URL}adminapp`
}
