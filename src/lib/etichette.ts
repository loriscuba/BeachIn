/** Etichette leggibili condivise tra le pagine. */
import type {
  CategoriaBar,
  CategoriaPiatto,
  Durata,
  Periodo,
  TipologiaCliente,
} from '@/data/types'

export const etichetteTipologiaCliente: Record<TipologiaCliente, string> = {
  stagionale: 'Stagionale',
  mensile: 'Mensile',
  quindicinale: 'Quindicinale',
  settimanale: 'Settimanale',
  giornaliero: 'Giornaliero',
  occasionale: 'Occasionale',
}

export const etichettePeriodo: Record<Periodo, string> = {
  bassa: 'Bassa',
  media: 'Media',
  alta: 'Alta',
  altissima: 'Altissima',
}

export const etichetteDurata: Record<Durata, string> = {
  giornaliera: 'Giornaliera',
  mezza_giornata: 'Mezza giornata',
  settimanale: 'Settimanale',
  quindicinale: 'Quindicinale',
  mensile: 'Mensile',
  stagionale: 'Stagionale',
}

export const etichetteCategoriaBar: Record<CategoriaBar, string> = {
  caffetteria: 'Caffetteria',
  bibite: 'Bibite',
  birre: 'Birre',
  cocktail: 'Cocktail',
  gelati: 'Gelati',
  snack: 'Snack',
  gastronomia: 'Gastronomia',
}

export const etichetteCategoriaPiatto: Record<CategoriaPiatto, string> = {
  antipasti: 'Antipasti',
  primi: 'Primi',
  secondi: 'Secondi',
  contorni: 'Contorni',
  pizze: 'Pizze',
  dolci: 'Dolci',
  bevande: 'Bevande',
}

export const etichetteStatoPagamento: Record<string, string> = {
  pagato: 'Pagato',
  da_pagare: 'Da pagare',
  scaduto: 'Scaduto',
}

export const etichetteRicorrenza: Record<string, string> = {
  una_tantum: 'Una tantum',
  mensile: 'Mensile',
  annuale: 'Annuale',
  stagionale: 'Stagionale',
}

export const etichetteMetodo: Record<string, string> = {
  bonifico: 'Bonifico',
  rid: 'RID',
  carta: 'Carta',
  contanti: 'Contanti',
  f24: 'F24',
}

export const etichetteAllergene: Record<string, string> = {
  glutine: 'Glutine',
  crostacei: 'Crostacei',
  uova: 'Uova',
  pesce: 'Pesce',
  arachidi: 'Arachidi',
  soia: 'Soia',
  latte: 'Latte',
  frutta_guscio: 'Frutta a guscio',
  sedano: 'Sedano',
  molluschi: 'Molluschi',
}
