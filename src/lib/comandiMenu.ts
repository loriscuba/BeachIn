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

const UNITA = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
  'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove']
const DECINE = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta']

/** «ventidue» → 22, «centoventi» → 120, «un» → 1. Numeri in lettere da 0 a 999; null se non è un numero. */
export function numeroInLettere(parola: string): number | null {
  let s = parola.toLowerCase()
  if (s === 'un' || s === 'una') return 1
  let n = 0
  const c = s.match(/^(.*?)cento/)
  if (c) {
    const molt = c[1] === '' ? 1 : UNITA.indexOf(c[1])
    if (molt < 2 && c[1] !== '') return null
    n += molt * 100
    s = s.slice(c[0].length)
  }
  if (s === '') return n || null
  const u = UNITA.indexOf(s)
  if (u >= 0) return n + u
  for (let d = 9; d >= 2; d--) {
    const base = DECINE[d]
    // elisione: «ventuno», «trentotto»
    for (const radice of [base, base.slice(0, -1)]) {
      if (!s.startsWith(radice)) continue
      const resto = s.slice(radice.length)
      if (resto === '' && radice === base) return n + d * 10
      const r = UNITA.indexOf(resto)
      if (r >= 1 && r <= 9 && (radice === base) === !/^[ou]/.test(resto)) return n + d * 10 + r
    }
  }
  return null
}

/**
 * Riporta in cifre i numeri detti in lettere solo dove sono un prezzo («a dodici euro», «costa tredici»,
 * «sei e cinquanta»), non nei nomi dei piatti («pizza quattro formaggi» resta com'è).
 */
function cifreNeiPrezzi(testo: string): string {
  const parole = testo.split(/(\s+)/)
  for (let i = 0; i < parole.length; i += 2) {
    const n = numeroInLettere(parole[i])
    if (n === null) continue
    const prima = (parole[i - 2] ?? '').toLowerCase()
    const primaAncora = parole[i - 4] ?? ''
    const dopo = (parole[i + 2] ?? '').toLowerCase()
    const dopoAncora = (parole[i + 4] ?? '').toLowerCase()
    const davanti = /^(?:a|al|per|ad|costa|costano|diventa|è|prezzo|di)$/.test(prima) ||
      (prima === 'e' && /^(?:\d+(?:[.,]\d+)?|euro|€)$/i.test(primaAncora))
    const dietro = dopo === '' || /^(?:euro|€|eur|centesimi)$/.test(dopo) ||
      (dopo === 'e' && (numeroInLettere(dopoAncora) !== null || dopoAncora === 'mezzo'))
    if ((davanti && dietro) || /^(?:euro|€|eur)$/.test(dopo)) parole[i] = String(n)
  }
  return parole.join('')
}

/** Estrae un prezzo dal testo, restituendo anche il testo senza quella parte. */
function estraiPrezzo(input: string): { prezzo: number | null; resto: string } {
  const testo = cifreNeiPrezzi(input)
  const VAL = String.raw`(?:€\s*)?(\d+(?:[.,]\d{1,2})?)`
  const EURO = String.raw`(?:\s*(?:€|euro|eur)(?![a-z]))`
  // «e 50», «e cinquanta centesimi», «e mezzo»
  const CENT = String.raw`(?:\s+e\s+(mezzo|\d{1,2})(?:\s+centesimi)?(?![\d,.]))`
  // assorbe ciò che precede il prezzo («a», «al prezzo di», «costa», «è»), per non lasciarlo nel nome
  const DAVANTI = String.raw`((?:^|\s)(?:a|al|per|con|ad|costa|costano|diventa|è|di)\s+)?((?:un\s+|il\s+|al\s+)?(?:prezzo|costo)\s+(?:di\s+|è\s+)?)?`
  // unità di vendita dette dopo il prezzo
  const DOPO = String.raw`(?:\s+(?:a persona|a testa|a porzione|al pezzo|cadauno|l'uno|ciascuno))?`
  const re = new RegExp(DAVANTI + VAL + `(${EURO})?` + CENT + '?' + `(${EURO})?` + DOPO, 'gi')
  let scelto: { m: RegExpExecArray; punti: number } | null = null
  for (const m of testo.matchAll(re)) {
    const conValuta = !!(m[4] || m[6]) || /€\s*\d/.test(m[0])
    const fine = m.index! + m[0].length >= testo.trimEnd().length
    // priorità: con la valuta > preceduto da «a / prezzo / costa» > numero in fondo alla frase
    const punti = conValuta ? 3 : m[1] || m[2] ? 2 : fine ? 1 : 0
    if (punti > 0 && (!scelto || punti > scelto.punti)) scelto = { m: m as RegExpExecArray, punti }
  }
  if (!scelto) return { prezzo: null, resto: input }
  const m = scelto.m
  let prezzo = parseFloat(m[3].replace(',', '.'))
  if (m[5]) prezzo += m[5].toLowerCase() === 'mezzo' ? 0.5 : parseInt(m[5], 10) / 100
  prezzo = Math.round(prezzo * 100) / 100
  const resto = testo.slice(0, m.index) + ' ' + testo.slice(m.index! + m[0].length)
  return { prezzo, resto: resto.replace(/\s+/g, ' ').trim() }
}

/**
 * Estrae una categoria SOLO se indicata esplicitamente ("categoria dolci",
 * "nei primi", "come antipasto"). Non fa scansioni implicite del nome, così
 * non rovina piatti come "Pizza Margherita" o "Vino della casa".
 */
function estraiCategoria(testo: string): { categoria: CategoriaPiatto | null; resto: string } {
  const m = testo.match(/\b(?:categoria|tra i|tra gli|tra le|fra i|fra gli|fra le|nei|negli|nella|nelle|nel|in|come)\s+([a-zàèéìòù]+)/i)
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
    .replace(/^[\s,;:.]+|[\s,;:.]+$/g, '')
    .replace(/^(?:(?:il|lo|la|i|gli|le|un|uno|una)\s+|(?:l|un)'\s*)/i, '')
    .replace(/^(?:(?:di|del|dello|della|dei|degli|delle|al|allo|alla|ai|agli|alle)\s+|(?:dell|all|dall|nell|sull)'\s*)/i, '')
    .trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

const VERBI = 'aggiungi|aggiungere|inserisci|inserire|annulla|annullare|togli|togliere|rimuovi|rimuovere|elimina|eliminare|cancella|cancellare|leva|levare|cambia|modifica|metti|imposta|porta|aggiorna|rinomina|leggi|svuota'

/** Imperativi a cui il parlato attacca un pronome: «toglimi», «inseriscimi», «toglimelo», «leggimi il menu». */
const IMPERATIVI = 'aggiungi|inserisci|annulla|sposta|togli|rimuovi|elimina|cancella|leva|cambia|modifica|metti|imposta|porta|aggiorna|rinomina|leggi|svuota'

/**
 * Riporta il parlato alla forma base prima del parsing: stacca i pronomi dai verbi
 * («toglimi la tartare» → «togli la tartare») e toglie le formule di cortesia
 * («per favore», «puoi …», «vorrei …»), che altrimenti finirebbero nel nome del piatto.
 */
export function normalizzaComando(testo: string): string {
  return testo
    .replace(/[’`]/g, "'")
    .replace(/menù/gi, 'menu')
    .replace(new RegExp(`\\b(${IMPERATIVI})(?:me|ce)?(?:mi|ci|lo|la|li|le|ne)\\b`, 'gi'), '$1')
    .replace(/\b(?:per (?:favore|piacere|cortesia)|grazie|cortesemente)\b/gi, ' ')
    .replace(/\b(?:mi |ci )?(?:puoi|potresti|vorrei|voglio|devi|dovresti)\s+(?=\w)/gi, ' ')
    .replace(/[.!?]+(?=\s|$)/g, ' ')
    // «Aggiungi, per favore, il gelato» → dopo aver tolto la cortesia restano virgole orfane
    .replace(/(?:\s*,)+(?=\s*,|\s*$)/g, '')
    .replace(new RegExp(`\\b(${VERBI})\\s*,\\s*`, 'gi'), '$1 ')
    // intercalari a inizio frase: «ok aggiungi…», «allora togli…»
    .replace(/^(?:ok(?:ay)?|allora|senti|ecco|dunque|ehm)\b[\s,]*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Divide una frase con più comandi: «togli la pasta allo scoglio e aggiungi il filetto a 14 €»
 * → ["togli la pasta allo scoglio", "aggiungi il filetto a 14 €"]. Si taglia solo davanti a un verbo di comando
 * preceduto da "e", "poi", "anche", virgola o punto, così "spaghetti aglio e olio" resta intero.
 */
export function dividiComandi(testo: string): string[] {
  const re = new RegExp(`\\s*(?:[,;.]\\s*(?:e\\s+|poi\\s+|e poi\\s+)?|\\s(?:e poi|poi|e anche|anche|e|ed)\\s+)(?=(?:${VERBI})\\b)`, 'gi')
  return normalizzaComando(testo).split(re).map((p) => p.trim()).filter(Boolean)
}

export function parseComandoMenu(raw: string): ComandoMenu {
  const testo = normalizzaComando(raw || '')
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
  // «metti nel menu il fritto misto a 16 euro» è un'aggiunta, non un cambio di prezzo
  const nelMenu = /\b(?:nel|al|in) menu\b/.test(lower) && !/\bprezzo\b/.test(lower)
  if (/\b(prezzo|metti|mettere|imposta|impostare|porta|portare|cambia|cambiare|modifica|modificare|aggiorna|aumenta|alza|abbassa|diminuisci|riduci|sconta|costa|costano)\b/.test(lower) &&
      !/\b(aggiungi|aggiungere|inserisci|nuovo)\b/.test(lower) && !nelMenu) {
    const p = estraiPrezzo(testo)
    if (p.prezzo !== null) {
      const nome = pulisciNome(
        p.resto
          .replace(/\b(cambia|cambiare|modifica|modificare|imposta|impostare|metti|mettere|porta|portare|aggiorna|aggiornare|aumenta|alza|abbassa|diminuisci|riduci|sconta)\b/gi, ' ')
          .replace(/\b(?:il|lo|la)?\s*(?:nuovo\s+)?prezzo\b/gi, ' ')
          .replace(/\b(?:adesso|ora|da oggi)\b/gi, ' ')
          .replace(/(?:\s+(?:è|e|a|per|costa|costano|diventa))+\s*$/i, ' ')
      )
      if (nome) return { azione: 'prezzo', nome, prezzo: p.prezzo }
    }
  }

  // Rimuovi
  const rm = lower.match(/\b(annulla|annullare|togli|togliere|rimuovi|rimuovere|elimina|eliminare|cancella|cancellare|leva|levare)\b\s+(.+)$/)
  if (rm) {
    const bersaglio = rm[2].replace(/\bda(?:l|i|llo|lla|gli|lle)?\s+men[uù]\b/gi, ' ')
    return { azione: 'rimuovi', nome: pulisciNome(bersaglio) }
  }

  // Aggiungi
  const add = lower.match(/\b(?:aggiungi|aggiungere|inserisci|inserire|nuovo piatto|crea|metti|mettere)\b\s+(.+)$/)
  if (add) {
    // Lavoriamo sul testo originale (maiuscole preservate): il gruppo catturato
    // proviene dal lower, ma ha la stessa lunghezza della coda originale.
    const restoOriginale = testo.slice(testo.length - add[1].length)
    // «…, però spostalo nei secondi» / «e mettilo tra i dolci»: resta solo l'indicazione di categoria
    const cat = estraiCategoria(
      restoOriginale.replace(/[,;]?\s*(?:\b(?:però|pero|ma|e)\s+)?\b(?:sposta|spostare|metti|mettere|inserisci)\s+(?=(?:categoria|tra|fra|nei|negli|nella|nelle|nel|in|come)\b)/gi, ' '),
    )
    const pr = estraiPrezzo(cat.resto)
    const nome = pulisciNome(
      pr.resto.replace(/\b(?:nel|nei|nella|al|alla|come|in)\s+menu\b/gi, ' ')
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
