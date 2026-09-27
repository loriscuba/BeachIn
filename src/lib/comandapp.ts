import type { StatoComanda } from '@/data/types'

/** Stati della comanda: etichette e ordine (ComandApp + cruscotto bar). */
export const PASSI_COMANDA: StatoComanda[] = ['in_attesa', 'presa_in_carico', 'in_preparazione', 'pronta']
export const etichettaStatoComanda: Record<StatoComanda, string> = {
  in_attesa: 'Inviata', presa_in_carico: 'Presa in carico', in_preparazione: 'In preparazione', pronta: 'Pronta',
}

/** Credenziali DEMO (finte): ogni account è legato a un ombrellone. Domani = anagrafica abbonamenti dal DB. */
export const UTENTI_COMANDAPP = [
  { utente: 'ombrellone12', password: 'lido', ombrellone: '12', nome: 'Famiglia Rossi' },
  { utente: 'ombrellone27', password: 'lido', ombrellone: '27', nome: 'Marco Bianchi' },
  { utente: 'ombrellone41', password: 'lido', ombrellone: '41', nome: 'Giulia Verdi' },
]

/** Link pubblico di ComandApp (da dare al bagnante). */
export function urlComandApp(): string {
  if (import.meta.env.VITE_ROUTER === 'hash') return `${window.location.href.split('#')[0]}#/comandapp`
  return `${window.location.origin}${import.meta.env.BASE_URL}comandapp`
}
