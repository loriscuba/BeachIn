/**
 * comandiMenu.ts — il "cervello" a regole dell'assistente vocale del menu.
 * Interpreta frasi in italiano e restituisce un comando tipizzato che la pagina
 * esegue sul menu del ristorante. È deterministico e offline (nessun LLM):
 * riconosce schemi con espressioni regolari.
 *
 * In una fase successiva questa funzione può essere sostituita da una chiamata
 * a un modello di linguaggio: basta che restituisca la stessa struttura
 * `ComandoMenu`, senza toccare la pagina.
 */
import type { CategoriaPiatto } from '@/data/types'

export type ComandoMenu =
  | { azione: 'aggiungi'; nome: string; prezzo: number | null; categoria: CategoriaPiatto }
  | { azione: 'rimuovi'; nome: string }
  | { azione: 'prezzo'; nome: string; prezzo: number }
  | { azione: 'rinomina'; nome: string; nuovoNome: string }
  | { azione: 'leggi' }
  | { azione: 'svuota' }
  | { azione: 'aiuto' }
  | { azione: 'sconosciuto' }

/** Parole (anche al singolare) → categoria del menu. */
const CAT_DA_PAROLA: Record<string, CategoriaPiatto> = {
  antipasto: 'antipasti', antipasti: 'antipasti',
  primo: 'primi', primi: 'primi',
  secondo: 'secondi', secondi: 'secondi',
  contorno: 'contorni', contorni: 'contorni',
  pizza: 'pizze', pizze: 'pizze',
  dolce: 'dolci', dolci: 'dolci', dessert: 'dolci',
  bevanda: 'bevande', bevande: 'bevande', bibita: 'bevande',
  vino: 'bevande', birra: 'bevande', caffe: 'bevande',
}

/** Estrae un prezzo dal testo, restituendo anche il testo senza quella parte. */
function estraiPrezzo(testo: string): { prezzo: number | null; resto: string } {
  // 1) numero + valuta (assorbe anche un "a"/"per" davanti, per non lasciarlo nel nome)
  let m = testo.match(/(?:\b(?:a|per)\s+)?(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)\b/i)
  // 2) numero preceduto da "a"/"per"
  if (!m) m = testo.match(/\b(?:a|per)\s+(\d+(?:[.,]\d{1,2})?)\b/i)
  // 3) un numero qualsiasi
  if (!m) m = testo.match(/(\d+(?:[.,]\d{1,2})?)/)
  if (!m) return { prezzo: null, resto: testo }
  const prezzo = parseFloat(m[1].replace(',', '.'))
  return { prezzo, resto: testo.replace(m[0], ' ').replace(/\s+/g, ' ').trim() }
}

/**
 * Estrae una categoria SOLO se indicata esplicitamente ("categoria dolci",
 * "nei primi", "come antipasto"). Non fa scansioni implicite del nome, così
 * non rovina piatti come "Pizza Margherita" o "Vino della casa".
 */
function estraiCategoria(testo: string): { categoria: CategoriaPiatto | null; resto: string } {
  const m = testo.match(/\b(?:categoria|tra i|tra gli|nei|nella|nelle|nel|come)\s+([a-zàèéìòù]+)/i)
  if (m) {
    const cat = CAT_DA_PAROLA[m[1].toLowerCase()]
    if (cat) return { categoria: cat, resto: testo.replace(m[0], ' ').replace(/\s+/g, ' ').trim() }
  }
  return { categoria: null, resto: testo }
}

/** Deduce la categoria dalla prima parola del nome, senza modificarlo. */
function inferisciCategoria(nome: string): CategoriaPiatto | null {
  const prima = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/)[0]
  return CAT_DA_PAROLA[prima] ?? null
}

/** Ripulisce il nome del piatto: toglie articoli/preposizioni iniziali, poi capitalizza. */
function pulisciNome(t: string): string {
  const s = t
    .replace(/\s+/g, ' ')
    .replace(/^(?:il|lo|la|i|gli|le|l'|un|uno|una|un')\s+/i, '')
    .replace(/^(?:di|del|dello|della|dei|degli|delle|al|allo|alla|ai)\s+/i, '')
    .trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export function parseComandoMenu(raw: string): ComandoMenu {
  const testo = (raw || '').trim()
  if (!testo) return { azione: 'sconosciuto' }
  const lower = testo.toLowerCase()

  if (/\b(aiuto|help|cosa posso|cosa puoi|come funziona)\b/.test(lower)) return { azione: 'aiuto' }

  if (/\b(svuota|azzera|resetta|cancella tutto|elimina tutto)\b/.test(lower) &&
      /\b(menu|men[uù]|tutto|piatti)\b/.test(lower)) {
    return { azione: 'svuota' }
  }

  if (/\b(leggi|elenca|elencami|mostra|mostrami|dimmi|ripeti|quali sono)\b/.test(lower) &&
      /\b(menu|men[uù]|piatti)\b/.test(lower)) {
    return { azione: 'leggi' }
  }

  // Rinomina "X in Y"
  const rn = lower.match(/\b(?:rinomina|cambia nome (?:di|della|del)?)\s+(.+?)\s+(?:in|con)\s+(.+)$/)
  if (rn) return { azione: 'rinomina', nome: pulisciNome(rn[1]), nuovoNome: pulisciNome(rn[2]) }

  // Cambia prezzo
  if (/\b(prezzo|metti|imposta|porta|cambia|modifica)\b/.test(lower) &&
      !/\b(aggiungi|aggiungere|inserisci|nuovo)\b/.test(lower)) {
    const p = estraiPrezzo(testo)
    if (p.prezzo !== null) {
      const nome = pulisciNome(
        p.resto
          .replace(/\b(cambia|modifica|imposta|metti|porta|aggiorna)\b/gi, ' ')
          .replace(/\b(?:il|lo|la)?\s*prezzo\b/gi, ' ')
          .replace(/\b(di|del|dello|della|dei|a|per)\b/gi, ' ')
      )
      if (nome) return { azione: 'prezzo', nome, prezzo: p.prezzo }
    }
  }

  // Rimuovi
  const rm = lower.match(/\b(togli|rimuovi|rimuovere|elimina|eliminare|cancella|leva)\b\s+(.+)$/)
  if (rm) {
    const bersaglio = rm[2].replace(/\bda(?:l|i|llo|lla|gli|lle)?\s+men[uù]\b/gi, ' ')
    return { azione: 'rimuovi', nome: pulisciNome(bersaglio) }
  }

  // Aggiungi
  const add = lower.match(/\b(?:aggiungi|aggiungere|inserisci|inserire|nuovo piatto|crea)\b\s+(.+)$/)
  if (add) {
    // Lavoriamo sul testo originale (maiuscole preservate): il gruppo catturato
    // proviene dal lower, ma ha la stessa lunghezza della coda originale.
    const restoOriginale = testo.slice(testo.length - add[1].length)
    const cat = estraiCategoria(restoOriginale)
    const pr = estraiPrezzo(cat.resto)
    const nome = pulisciNome(
      pr.resto.replace(/\b(?:nel|nei|nella|al|alla|come)\s+men[uù]\b/gi, ' ')
    )
    if (nome) {
      return {
        azione: 'aggiungi',
        nome,
        prezzo: pr.prezzo,
        categoria: cat.categoria ?? inferisciCategoria(nome) ?? 'primi',
      }
    }
  }

  return { azione: 'sconosciuto' }
}
