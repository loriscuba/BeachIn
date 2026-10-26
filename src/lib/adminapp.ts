/** Credenziali DEMO (finte), usate solo senza Supabase. Con Supabase: utenti e ruoli veri (`SessioneContext`). */
import { urlPubblico } from '@/lib/urlPubblico'
import type { Profilo } from '@/lib/permessi'

/** Utenti demo con i ruoli di sistema (stessi permessi delle migrazioni 0011, 0015 e 0018): per provare l'app su più dispositivi. */
export const UTENTI_ADMIN: (Pick<Profilo, 'nome' | 'ruolo_id' | 'ruolo' | 'amministratore' | 'permessi'> & { utente: string; password: string })[] = [
  { utente: 'admin', password: 'lido', nome: 'Gestione Lido', ruolo_id: 'amministratore', ruolo: 'Amministratore', amministratore: true, permessi: {} },
  { utente: 'cameriere', password: 'lido', nome: 'Marco (sala)', ruolo_id: 'cameriere', ruolo: 'Cameriere', amministratore: false, permessi: { ristorante: 2, sala: 2, comande: 2, bar: 1, eventi: 1 } },
  { utente: 'cucina', password: 'lido', nome: 'Chef Anna', ruolo_id: 'cucina', ruolo: 'Cucina', amministratore: false, permessi: { sala: 2 } },
  { utente: 'barista', password: 'lido', nome: 'Luca (bar)', ruolo_id: 'barista', ruolo: 'Barista', amministratore: false, permessi: { 'bar-tavolo': 2, sala: 2, comande: 2, bar: 1 } },
]

/** Profilo demo dell'utente (null se il nome non esiste). */
export function profiloDemo(utente: string): Profilo | null {
  const u = UTENTI_ADMIN.find((x) => x.utente === utente)
  if (!u) return null
  const { password: _p, utente: nome, ...resto } = u
  void _p
  return { id: `demo-${nome}`, email: nome, username: nome, ...resto }
}

// Sessione demo locale (senza Supabase), condivisa tra le sezioni dell'app. Salvata per scheda (sessionStorage) e come
// ultima usata (localStorage): così tre schede dello stesso browser possono essere tre utenti diversi.
const CHIAVE_SESSIONE = 'adminapp.sessione.v1'
const leggi = (s: Storage) => { try { return s.getItem(CHIAVE_SESSIONE) } catch { return null } }
/** Utente demo collegato (il vecchio valore '1' = admin). */
export const sessioneGestore = (): string | null => {
  const v = leggi(sessionStorage) ?? leggi(localStorage)
  return v === '1' ? 'admin' : v
}
export const entraGestore = (utente: string) => {
  for (const s of [sessionStorage, localStorage]) { try { s.setItem(CHIAVE_SESSIONE, utente) } catch { /* */ } }
}
export const esciGestore = () => {
  for (const s of [sessionStorage, localStorage]) { try { s.removeItem(CHIAVE_SESSIONE) } catch { /* */ } }
}
export const credenzialiValide = (utente: string, password: string) =>
  UTENTI_ADMIN.some((u) => u.utente === utente.trim().toLowerCase() && u.password === password)

/** Link pubblico dell'app staff aperta sulle prenotazioni (da aprire sul telefono del gestore). */
export function urlAdminApp(): string {
  return urlPubblico('prenotazioni')
}
