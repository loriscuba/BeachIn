/**
 * Permessi del gestionale (RBAC). Ogni ruolo ha un livello per sezione: 0 nessuno, 1 lettura, 2 modifica.
 * Le stesse chiavi stanno in `beachin.ruoli.permessi` e nelle policy (`beachin.ha_permesso`, migrazione 0011):
 * la UI nasconde/blocca, il database fa rispettare.
 */
import type { ModuloId } from '@/config/moduli'

export type Livello = 0 | 1 | 2
/** Sezioni con permesso: i moduli (tranne Panoramica, sempre visibile) + gestione utenti. */
export type Sezione = Exclude<ModuloId, 'panoramica' | 'assistente-vocale'> | 'utenti'
export type Permessi = Partial<Record<Sezione, Livello>>

export const SEZIONI: { id: Sezione; nome: string }[] = [
  { id: 'cruscotto', nome: 'Cruscotto completo' },
  { id: 'arenile', nome: 'Arenile' },
  { id: 'clienti', nome: 'Clienti' },
  { id: 'tariffe', nome: 'Tariffe' },
  { id: 'bar', nome: 'Bar' },
  { id: 'comande', nome: 'Comande' },
  { id: 'ristorante', nome: 'Ristorante' },
  { id: 'sala', nome: 'Comande ristorante' },
  { id: 'bar-tavolo', nome: 'Bar al tavolo (coda bar)' },
  { id: 'eventi', nome: 'Eventi' },
  { id: 'sito', nome: 'Sito e app clienti' },
  { id: 'costi', nome: 'Costi' },
  { id: 'conto-economico', nome: 'Conto economico' },
  { id: 'personale', nome: 'Personale' },
  { id: 'impostazioni', nome: 'Impostazioni' },
  { id: 'utenti', nome: 'Utenti e ruoli' },
]

export const LIVELLI: { valore: Livello; nome: string }[] = [
  { valore: 0, nome: 'Nessuno' },
  { valore: 1, nome: 'Lettura' },
  { valore: 2, nome: 'Modifica' },
]

export interface Profilo {
  id: string
  email: string
  username: string | null
  nome: string
  foto?: string | null
  ruolo_id: string
  ruolo: string
  amministratore: boolean
  permessi: Permessi
}

export interface Ruolo {
  id: string
  nome: string
  descrizione: string | null
  permessi: Permessi
  amministratore: boolean
  di_sistema: boolean
}

export interface Utente {
  id: string
  email: string
  username: string | null
  nome: string
  foto: string | null
  ruolo_id: string
  attivo: boolean
  creato_il: string
  ultimo_accesso: string | null
}

/** Sezione di permesso di un modulo (Panoramica = sempre; l'assistente vocale sta nel Ristorante). */
export function sezioneDi(modulo: ModuloId): Sezione | null {
  if (modulo === 'panoramica') return null
  if (modulo === 'assistente-vocale') return 'ristorante'
  return modulo
}

export function livelloDi(p: Profilo | null, sezione: Sezione | null): Livello {
  if (!sezione) return p ? 2 : 0
  if (!p) return 0
  if (p.amministratore) return 2
  return (p.permessi[sezione] ?? 0) as Livello
}

/** Dominio delle email sintetiche di Supabase Auth per chi entra col nome utente (migrazione 0012). */
export const DOMINIO_UTENTI = 'utenti.beachin.local'
/** "lorisc" → email di accesso; chi scrive un'email vera (con @) la usa così com'è. */
export const emailAccesso = (utente: string) => {
  const u = utente.trim().toLowerCase()
  return u.includes('@') ? u : `${u}@${DOMINIO_UTENTI}`
}
/** Proposta di nome utente: nome + iniziale del cognome ("Loris Cuba" → "lorisc"). */
export function proponiUsername(nomeCompleto: string) {
  const parti = nomeCompleto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean)
  if (parti.length === 0) return ''
  return parti[0] + (parti.length > 1 ? parti[parti.length - 1][0] : '')
}
export const USERNAME_VALIDO = /^[a-z0-9._-]{3,30}$/

