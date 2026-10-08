import { config } from '@/data/config'
import { supabase, SCHEMA } from '@/lib/supabase'

/**
 * Parametri dello stabilimento modificabili dall'amministratore (Impostazioni).
 * Salvati in `beachin.impostazioni` (riga id='stabilimento', colonna jsonb `valori`) e applicati
 * sopra i predefiniti di `src/data/config.ts`. File, postazioni e date di stagione restano nel codice
 * perché da loro dipendono i dati generati (pianta, serie giornaliera).
 */
export type TipoCampo = 'testo' | 'numero' | 'percento' | 'ora'
export interface Campo { chiave: string; etichetta: string; tipo?: TipoCampo; aiuto?: string }
export interface Gruppo { id: string; titolo: string; campi: Campo[] }

export const GRUPPI: Gruppo[] = [
  {
    id: 'anagrafica', titolo: 'Anagrafica stabilimento', campi: [
      { chiave: 'nome', etichetta: 'Nome' },
      { chiave: 'localita', etichetta: 'Località' },
      { chiave: 'indirizzo', etichetta: 'Indirizzo' },
      { chiave: 'telefono', etichetta: 'Telefono' },
      { chiave: 'whatsapp', etichetta: 'WhatsApp', aiuto: 'Numero per il pulsante WhatsApp (vuoto = telefono)' },
      { chiave: 'email', etichetta: 'Email', aiuto: 'Vuoto = non compare' },
      { chiave: 'sito', etichetta: 'Sito web' },
      { chiave: 'partitaIva', etichetta: 'Partita IVA' },
      { chiave: 'facebook', etichetta: 'Pagina Facebook', aiuto: 'Vuoto = non compare' },
      { chiave: 'mappa', etichetta: 'Link Google Maps' },
    ],
  },
  {
    id: 'orari', titolo: 'Orari', campi: [
      { chiave: 'orari.apertura', etichetta: 'Spiaggia apertura', tipo: 'ora' },
      { chiave: 'orari.chiusura', etichetta: 'Spiaggia chiusura', tipo: 'ora' },
      { chiave: 'orari.stagioneSpiaggia', etichetta: 'Periodo spiaggia' },
      { chiave: 'orari.barApertura', etichetta: 'Bar apertura', tipo: 'ora' },
      { chiave: 'orari.barChiusura', etichetta: 'Bar chiusura', tipo: 'ora' },
      { chiave: 'orari.ristorantePranzo', etichetta: 'Pranzo' },
      { chiave: 'orari.ristoranteCena', etichetta: 'Cena' },
      { chiave: 'orari.nota', etichetta: 'Nota orari' },
    ],
  },
  {
    id: 'arenile', titolo: 'Servizi arenile', campi: [
      { chiave: 'arenile.cabine', etichetta: 'Cabine', tipo: 'numero' },
      { chiave: 'arenile.armadietti', etichetta: 'Armadietti', tipo: 'numero' },
      { chiave: 'arenile.docce', etichetta: 'Docce', tipo: 'numero' },
      { chiave: 'arenile.torrette', etichetta: 'Torrette', tipo: 'numero' },
    ],
  },
  {
    id: 'aliquote', titolo: 'Aliquote e prezzi', campi: [
      { chiave: 'aliquote.ivaOrdinaria', etichetta: 'IVA ordinaria', tipo: 'percento' },
      { chiave: 'aliquote.ivaRidotta', etichetta: 'IVA ridotta (somministrazione)', tipo: 'percento' },
      { chiave: 'aliquote.ivaSuperRidotta', etichetta: 'IVA super ridotta', tipo: 'percento' },
      { chiave: 'aliquote.impostaRegionaleConcessione', etichetta: 'Imposta reg. concessione', tipo: 'percento' },
      { chiave: 'prezzoMedioRistorante', etichetta: 'Prezzo medio ristorante (€)', tipo: 'numero' },
    ],
  },
  {
    id: 'tripadvisor', titolo: 'Tripadvisor', campi: [
      { chiave: 'tripadvisor.voto', etichetta: 'Voto', tipo: 'numero' },
      { chiave: 'tripadvisor.recensioni', etichetta: 'Recensioni', tipo: 'numero' },
      { chiave: 'tripadvisor.classifica', etichetta: 'Classifica' },
      { chiave: 'tripadvisor.url', etichetta: 'Link scheda' },
    ],
  },
]

export type Valori = Record<string, string | number>
const CHIAVI = GRUPPI.flatMap((g) => g.campi.map((c) => c.chiave))
const TIPI = new Map(GRUPPI.flatMap((g) => g.campi.map((c) => [c.chiave, c.tipo ?? 'testo'] as const)))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const radice = config as any
const leggi = (k: string) => k.split('.').reduce((o, p) => o?.[p], radice) as string | number
function scrivi(k: string, v: unknown) {
  const parti = k.split('.')
  const ultimo = parti.pop()!
  const o = parti.reduce((x, p) => x[p], radice)
  const tipo = TIPI.get(k)
  if (tipo === 'numero' || tipo === 'percento') { if (typeof v === 'number' && Number.isFinite(v)) o[ultimo] = v }
  else if (typeof v === 'string') o[ultimo] = v
}

/** Valori correnti (predefiniti + DB) in forma piatta `chiave → valore`. */
export const valoriCorrenti = (): Valori => Object.fromEntries(CHIAVI.map((k) => [k, leggi(k)]))

const ascoltatori = new Set<() => void>()
export const sottoscriviImpostazioni = (fn: () => void) => { ascoltatori.add(fn); return () => { ascoltatori.delete(fn) } }

export function applicaImpostazioni(v: Partial<Valori> | null | undefined) {
  if (!v) return
  for (const k of CHIAVI) if (k in v) scrivi(k, v[k])
  ascoltatori.forEach((fn) => fn())
}

const ID = 'stabilimento'

/** Legge le impostazioni dal DB (max ~2,5 s, poi si parte coi predefiniti) e attiva l'aggiornamento dal vivo. */
export async function caricaImpostazioni() {
  if (!supabase) return
  const db = supabase
  const lettura = async () => {
    const { data, error } = await db.from('impostazioni').select('valori').eq('id', ID).maybeSingle()
    if (error) console.error('[supabase] impostazioni:', error.message)
    else applicaImpostazioni(data?.valori as Valori | undefined)
  }
  db.channel('sync-impostazioni')
    .on('postgres_changes', { event: '*', schema: SCHEMA, table: 'impostazioni' }, () => void lettura())
    .subscribe()
  await Promise.race([lettura(), new Promise((r) => setTimeout(r, 2500))])
}

/** Salva su DB (se configurato) e applica subito in tutta l'app. */
export async function salvaImpostazioni(v: Valori): Promise<string | null> {
  if (supabase) {
    const { error } = await supabase.from('impostazioni').upsert({ id: ID, valori: v, aggiornato: new Date().toISOString() })
    if (error) return error.message
  }
  applicaImpostazioni(v)
  return null
}
