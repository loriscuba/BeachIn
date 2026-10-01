/**
 * Piano B dell'assistente vocale: se il parser a regole (`comandiMenu.ts`) non capisce la frase,
 * la fa interpretare a un LLM su Groq tramite la Edge Function `beachin-interpreta`.
 * Restituisce la stessa struttura `ComandoMenu`, validata qui: la pagina non cambia.
 */
import { supabase } from '@/lib/supabase'
import type { ComandoMenu } from '@/lib/comandiMenu'

export const interpretazioneDisponibile = () => !!supabase

const testo = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const numero = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) : NaN
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

function valida(x: unknown): ComandoMenu | null {
  if (!x || typeof x !== 'object') return null
  const c = x as Record<string, unknown>
  const nome = testo(c.nome)
  switch (c.azione) {
    case 'aggiungi': return nome ? { azione: 'aggiungi', nome, prezzo: numero(c.prezzo), categoria: testo(c.categoria) || 'primi' } : null
    case 'rimuovi': return nome ? { azione: 'rimuovi', nome } : null
    case 'prezzo': { const p = numero(c.prezzo); return nome && p !== null ? { azione: 'prezzo', nome, prezzo: p } : null }
    case 'rinomina': { const n = testo(c.nuovoNome); return nome && n ? { azione: 'rinomina', nome, nuovoNome: n } : null }
    case 'leggi': case 'svuota': case 'aiuto': return { azione: c.azione }
    default: return null
  }
}

/** Comandi interpretati dall'LLM; [] se non capisce o se il servizio non risponde. */
export async function interpretaConAI(frase: string, piatti: string[], sezioni: { id: string; nome: string }[]): Promise<ComandoMenu[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.functions.invoke('beachin-interpreta', { body: { testo: frase, piatti, sezioni } })
    if (error || !Array.isArray(data?.comandi)) return []
    return (data.comandi as unknown[]).map(valida).filter((c): c is ComandoMenu => c !== null)
  } catch {
    return []
  }
}
