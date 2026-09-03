/**
 * Formattatori — valuta, date, percentuali, numeri.
 * Locale it-IT, valuta EUR, date gg/mm/aaaa.
 */
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { config } from '@/data/config'

const eur0 = new Intl.NumberFormat(config.locale, {
  style: 'currency',
  currency: config.valuta,
  maximumFractionDigits: 0,
})

const eur2 = new Intl.NumberFormat(config.locale, {
  style: 'currency',
  currency: config.valuta,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const num0 = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 0 })
const num1 = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 1 })

/** Valuta senza decimali: € 1.250 */
export function euro(v: number): string {
  return eur0.format(v)
}

/** Valuta con decimali: € 12,50 */
export function euroCent(v: number): string {
  return eur2.format(v)
}

/** Valuta compatta per KPI grandi: € 210k */
export function euroK(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `€ ${num1.format(v / 1_000_000)}M`
  if (Math.abs(v) >= 1_000) return `€ ${num0.format(Math.round(v / 1_000))}k`
  return eur0.format(v)
}

/** Numero intero: 1.250 */
export function numero(v: number): string {
  return num0.format(v)
}

/** Numero con un decimale */
export function numero1(v: number): string {
  return num1.format(v)
}

/** Percentuale: 72% (input come frazione 0–1) */
export function percento(frazione: number, decimali = 0): string {
  const p = frazione * 100
  return `${decimali ? num1.format(p) : num0.format(Math.round(p))}%`
}

/** Data gg/mm/aaaa da ISO o Date */
export function data(v: string | Date): string {
  const d = typeof v === 'string' ? parseISO(v) : v
  return format(d, 'dd/MM/yyyy', { locale: it })
}

/** Data estesa: 15 luglio 2026 */
export function dataEstesa(v: string | Date): string {
  const d = typeof v === 'string' ? parseISO(v) : v
  return format(d, 'd MMMM yyyy', { locale: it })
}

/** Giorno + mese breve: 15 lug */
export function giornoMese(v: string | Date): string {
  const d = typeof v === 'string' ? parseISO(v) : v
  return format(d, 'd MMM', { locale: it })
}

/** Nome del giorno: lunedì */
export function giornoSettimana(v: string | Date): string {
  const d = typeof v === 'string' ? parseISO(v) : v
  return format(d, 'EEEE', { locale: it })
}

/** Iniziali da nome e cognome per avatar */
export function iniziali(nome: string, cognome?: string): string {
  const a = nome?.trim()?.[0] ?? ''
  const b = cognome?.trim()?.[0] ?? ''
  return (a + b).toUpperCase()
}
