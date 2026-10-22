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
  nome: string
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
  nome: string
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

/** Profilo usato senza Supabase (demo locale, credenziali nel codice): amministratore. */
export const PROFILO_DEMO: Profilo = {
  id: 'demo', email: 'admin', nome: 'Gestione Lido', ruolo_id: 'amministratore', ruolo: 'Amministratore',
  amministratore: true, permessi: {},
}
