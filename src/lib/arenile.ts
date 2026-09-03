/**
 * Helper visivi dell'arenile: colori di stato, etichette, forma delle
 * postazioni. Concentriamo qui la resa "ombrellone visto dall'alto".
 */
import type { StatoPostazione, TipologiaPostazione } from '@/data/types'

export interface StileStato {
  colore: string
  testo: string // colore testo leggibile sul canopy
  label: string
}

export const stiliStato: Record<StatoPostazione, StileStato> = {
  libera: { colore: '#5FA891', testo: '#0B2C39', label: 'Libera' },
  occupata: { colore: '#E4572E', testo: '#FFFFFF', label: 'Occupata' },
  prenotata: { colore: '#F2C14E', testo: '#5A420A', label: 'Prenotata' },
  stagionale: { colore: '#2E7D9A', testo: '#FFFFFF', label: 'Stagionale' },
  fuori_servizio: { colore: '#9AA7AB', testo: '#FFFFFF', label: 'Fuori servizio' },
}

export const etichetteTipologia: Record<TipologiaPostazione, string> = {
  ombrellone_2_lettini: 'Ombrellone + 2 lettini',
  ombrellone_2_sdraio: 'Ombrellone + 2 sdraio',
  ombrellone_lettino_sdraio: 'Ombrellone + lettino e sdraio',
  gazebo: 'Gazebo',
  tenda: 'Tenda',
}

/** Scurisce un colore #rrggbb di una quota (0–1) per i segmenti del canopy. */
export function scurisci(hex: string, quota = 0.16): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - quota)))
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - quota)))
  const b = Math.max(0, Math.round((n & 255) * (1 - quota)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** Gradiente conico a spicchi: dà l'effetto delle tele dell'ombrellone. */
export function canopyGradient(stato: StatoPostazione): string {
  const c = stiliStato[stato].colore
  const d = scurisci(c, 0.14)
  return (
    `conic-gradient(from 22deg, ${c} 0 45deg, ${d} 45deg 90deg, ${c} 90deg 135deg, ` +
    `${d} 135deg 180deg, ${c} 180deg 225deg, ${d} 225deg 270deg, ` +
    `${c} 270deg 315deg, ${d} 315deg 360deg)`
  )
}
