/**
 * Gestione utenti e ruoli (Impostazioni → Utenti e ruoli).
 * Ruoli: lettura/scrittura diretta su `beachin.ruoli` (le policy richiedono il permesso "utenti").
 * Account: Edge Function `beachin-utenti` (serve la service role per creare/bloccare gli account Auth).
 */
import { supabase } from '@/lib/supabase'
import type { Permessi, Ruolo, Utente } from '@/lib/permessi'

export async function leggiUtentiRuoli(): Promise<{ utenti: Utente[]; ruoli: Ruolo[] }> {
  if (!supabase) return { utenti: [], ruoli: [] }
  const [u, r] = await Promise.all([
    supabase.from('utenti').select('*').order('nome'),
    supabase.from('ruoli').select('*').order('creato_il'),
  ])
  return { utenti: (u.data ?? []) as Utente[], ruoli: (r.data ?? []) as Ruolo[] }
}

/** Chiamata alla Edge Function; restituisce il messaggio d'errore o null. */
async function funzione(corpo: Record<string, unknown>): Promise<string | null> {
  if (!supabase) return 'Serve il database (Supabase) per gestire gli utenti.'
  const { data, error } = await supabase.functions.invoke('beachin-utenti', { body: corpo })
  if (error) {
    // con status ≠ 2xx il messaggio vero è nel corpo della risposta
    const ctx = (error as { context?: Response }).context
    try { const j = await ctx?.json(); if (j?.errore) return j.errore } catch { /* corpo non JSON */ }
    return error.message
  }
  return (data as { errore?: string } | null)?.errore ?? null
}

export const creaUtente = (u: { email: string; nome: string; ruolo_id: string; password: string }) => funzione({ azione: 'crea', ...u })
export const aggiornaUtente = (id: string, m: { nome?: string; ruolo_id?: string; attivo?: boolean }) => funzione({ azione: 'aggiorna', id, ...m })
export const cambiaPassword = (id: string, password: string) => funzione({ azione: 'password', id, password })
export const eliminaUtente = (id: string) => funzione({ azione: 'elimina', id })

const msg = (e: { message: string } | null) =>
  !e ? null : /amministratore/.test(e.message) ? 'Serve almeno un amministratore attivo' : e.message

export async function salvaRuolo(r: { id: string; nome: string; descrizione: string | null; permessi: Permessi }, nuovo: boolean) {
  if (!supabase) return 'Serve il database (Supabase).'
  const { error } = nuovo
    ? await supabase.from('ruoli').insert(r)
    : await supabase.from('ruoli').update({ nome: r.nome, descrizione: r.descrizione, permessi: r.permessi }).eq('id', r.id)
  return msg(error)
}

export async function eliminaRuolo(id: string) {
  if (!supabase) return 'Serve il database (Supabase).'
  const { error, count } = await supabase.from('ruoli').delete({ count: 'exact' }).eq('id', id)
  if (error) return msg(error)
  return count === 0 ? 'Ruolo di sistema o ancora assegnato a qualche utente' : null
}

/** id leggibile da un nome ("Capo sala" → "capo-sala"). */
export const idDaNome = (nome: string) =>
  nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `ruolo-${Date.now()}`
