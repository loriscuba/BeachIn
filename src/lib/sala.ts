/** Comande del ristorante (sala → cucina): etichette, colori e foto di riserva per il tablet self. */
import type { ComandaSala, StatoComandaSala } from '@/data/types'

export const etichettaStatoSala: Record<StatoComandaSala, string> = {
  inviata: 'Inviata', in_preparazione: 'In preparazione', pronta: 'Pronta', servita: 'Servita',
}
export const tonoStatoSala: Record<StatoComandaSala, 'rosso' | 'giallo' | 'verde' | 'spento'> = {
  inviata: 'rosso', in_preparazione: 'giallo', pronta: 'verde', servita: 'spento',
}
/** Testo del bottone che porta allo stato successivo. */
export const azioneStatoSala: Partial<Record<StatoComandaSala, string>> = {
  inviata: 'Inizia preparazione', in_preparazione: 'Pronta', pronta: 'Servita',
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
