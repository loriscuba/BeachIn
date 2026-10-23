/** Comande del ristorante (sala → cucina): etichette, colori e foto di riserva per il tablet self. */
import type { ComandaSala, RigaComandaSala, StatoComandaSala, StatoRigaSala } from '@/data/types'

export const etichettaStatoSala: Record<StatoComandaSala, string> = {
  inviata: 'Inviata', in_preparazione: 'In preparazione', pronta: 'Pronta', servita: 'Servita',
}
export const tonoStatoSala: Record<StatoComandaSala, 'rosso' | 'giallo' | 'verde' | 'spento'> = {
  inviata: 'rosso', in_preparazione: 'giallo', pronta: 'verde', servita: 'spento',
}
/** Testo del bottone della comanda (in preparazione si segnano i singoli piatti). */
export const azioneStatoSala: Partial<Record<StatoComandaSala, string>> = {
  inviata: 'Inizia preparazione', pronta: 'Servito tutto il pronto',
}

/** Comande ancora "aperte" di un tavolo (non servite), dalla più vecchia. */
export const aperteDelTavolo = (comande: ComandaSala[], tavolo: number) =>
  comande.filter((c) => c.tavolo === tavolo && c.stato !== 'servita').sort((a, b) => a.ts - b.ts)

/** Minuti trascorsi dall'invio. */
export const minutiDa = (ts: number, ora = Date.now()) => Math.max(0, Math.floor((ora - ts) / 60000))

/**
 * Foto d'atmosfera (Unsplash, licenza libera) per la copertina del tablet. Non è un piatto del locale:
 * le foto vere dei piatti si caricano da Ristorante → Menu e compaiono nelle schede.
 */
export const fotoCopertinaSala = 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=1200&q=70'

// — Uscite (bevande subito, poi 1ª, 2ª… uscita) —
export const USCITE = [0, 1, 2, 3]
export const nomeUscita = (n: number) => (n === 0 ? 'Subito' : `${n}ª uscita`)
/** Uscita proposta per una sezione del menu: il cameriere la cambia trascinando il piatto. */
export function uscitaPredefinita(sezioneId: string): number {
  const s = sezioneId.toLowerCase()
  if (/bevand|vin|bibit|cantina/.test(s)) return 0
  if (/second|grigl|pesce|carne|contorn/.test(s)) return 2
  if (/dolc|dessert|frutta|gelat/.test(s)) return 3
  return 1
}

export const uscitaDi = (r: RigaComandaSala) => r.uscita ?? 1
/** Uscita chiamata ("via"): la cucina la può preparare. Le comande vecchie non hanno il campo: tutte chiamate. */
export const uscitaChiamata = (c: ComandaSala, n: number) => n <= (c.uscitaVia ?? 99)
/** Stato del piatto; le comande vecchie (senza stato per riga) lo ricavano da quello della comanda. */
export const statoRiga = (c: ComandaSala, r: RigaComandaSala): StatoRigaSala =>
  r.stato ?? (c.stato === 'servita' ? 'servita' : c.stato === 'pronta' ? 'pronta' : 'attesa')

/** Uscite presenti nella comanda, in ordine, con i loro piatti (indice originale per le azioni). */
export function usciteDi(c: ComandaSala) {
  const mappa = new Map<number, { r: RigaComandaSala; i: number }[]>()
  c.righe.forEach((r, i) => { const n = uscitaDi(r); mappa.set(n, [...(mappa.get(n) ?? []), { r, i }]) })
  return [...mappa.entries()].sort((a, b) => a[0] - b[0]).map(([n, righe]) => {
    const stati = righe.map(({ r }) => statoRiga(c, r))
    const stato: StatoRigaSala = stati.every((x) => x === 'servita') ? 'servita' : stati.every((x) => x !== 'attesa') ? 'pronta' : 'attesa'
    return { n, righe, stato, chiamata: uscitaChiamata(c, n) }
  })
}

/**
 * Stato della comanda ricavato dai piatti: servita se tutto è servito; pronta se c'è qualcosa
 * di pronto da portare e niente di chiamato ancora da cucinare; altrimenti resta inviata finché la cucina non inizia.
 */
export function ricalcolaStato(c: ComandaSala): ComandaSala {
  const stati = c.righe.map((r) => statoRiga(c, r))
  const daFare = c.righe.some((r, i) => stati[i] === 'attesa' && uscitaChiamata(c, uscitaDi(r)))
  const stato: StatoComandaSala = stati.every((x) => x === 'servita') ? 'servita'
    : !daFare && stati.some((x) => x === 'pronta') ? 'pronta'
    : c.stato === 'inviata' && stati.every((x) => x === 'attesa') ? 'inviata'
    : 'in_preparazione'
  return { ...c, stato }
}
