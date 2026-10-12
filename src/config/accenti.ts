/**
 * Palette "Riviera": un colore d'accento per area del gestionale.
 * Usato con parsimonia: icona nel menu, tessera accanto al titolo pagina, barretta dei titoli delle card.
 * Pulsanti e schede restano nel blu del marchio.
 */
export const RIVIERA = {
  sole: '#F2C14E',
  agrume: '#F29E4C',
  corallo: '#F07A5A',
  mare: '#4FB3D9',
  acqua: '#6FC2AD',
  glicine: '#A99BE0',
  bouganville: '#E57AA8',
} as const

const perPercorso: Record<string, string> = {
  '/': RIVIERA.sole,
  '/bar': RIVIERA.agrume,
  '/comande': RIVIERA.agrume,
  '/ristorante': RIVIERA.corallo,
  '/assistente-vocale': RIVIERA.corallo,
  '/cruscotto': RIVIERA.mare,
  '/arenile': RIVIERA.acqua,
  '/clienti': RIVIERA.glicine,
  '/tariffe': RIVIERA.sole,
  '/costi': RIVIERA.corallo,
  '/conto-economico': RIVIERA.mare,
  '/personale': RIVIERA.glicine,
  '/eventi': RIVIERA.bouganville,
  '/sito': RIVIERA.acqua,
  '/impostazioni': '#9FB4BC',
}

/** Colore d'accento di una voce di menu / pagina (blu cabina se non mappata). */
export function accento(percorso: string | undefined): string {
  return (percorso && perPercorso[percorso]) || '#4E97B2'
}
