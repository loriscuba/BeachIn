/**
 * Lettura di una fattura fornitore nel browser, da PDF (pdf.js, testo con posizione) o dall'XML della fattura
 * elettronica (FatturaPA, quello che arriva dallo SDI). Si ricavano fornitore, numero, data, scadenza, righe e totali;
 * a ogni riga viene proposta una categoria di costo con parole chiave. Nessun file esce dal dispositivo.
 *
 * PDF: le parole si raggruppano in righe di testo per altezza. Una riga articolo è una riga che finisce con
 * "importo  aliquota%" (es. "129,60 22%"); i pezzi di descrizione andati a capo (righe senza numeri nella tabella)
 * si attaccano alla riga articolo più vicina.
 */
import type { CentroCosto, MetodoPagamento } from '@/data/types'
import { leggiPdf, type PezzoTesto } from '@/lib/bustaPaga'

export interface RigaLetta {
  codice?: string
  descrizione: string
  um?: string
  quantita?: number
  prezzo?: number
  sconto?: number
  importo: number
  /** aliquota es. 0.22 */
  iva: number
}

export interface DatiFattura {
  fornitore?: string
  partitaIva?: string
  numero?: string
  /** date ISO "AAAA-MM-GG" */
  data?: string
  scadenza?: string
  metodo?: MetodoPagamento
  imponibile?: number
  imposta?: number
  totale?: number
  righe: RigaLetta[]
}

// ——— categorie proposte ———

export interface Categoria { categoria: string; sottocategoria: string; centro: CentroCosto }

const REGOLE: { re: RegExp; c: Categoria }[] = [
  { re: /cauzion|vuot[oi]\b|vuoti a rendere|\bpallet/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Cauzioni vuoti', centro: 'bar' } },
  { re: /trasport|consegn|spedizion|\bnolo\b/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Trasporto merce', centro: 'bar' } },
  { re: /\bbirr|\blager\b|\bipa\b|\bweiss/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Birre', centro: 'bar' } },
  { re: /\bvin[oi]\b|spumant|prosecco|champagne|vermentino|pigato|rossese|\bdoc\b|\bdocg\b/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Cantina', centro: 'ristorante' } },
  { re: /liquor|amaro|grappa|\bgin\b|vodka|\brum\b|whisk|aperitiv|spritz|bitter|limoncello/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Liquori e aperitivi', centro: 'bar' } },
  { re: /\bacqua\b(?!.*tonic)|\bacque\b|minerale|frizzante|naturale/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Acque minerali', centro: 'bar' } },
  { re: /cola|aranciat|limonat|chinott|gassos|tonic|\bt[eè]\b|\bthe\b|succ[oh]i?\b|energy|bibit|soda|ginger|cedrata|spremut/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Bibite e succhi', centro: 'bar' } },
  { re: /caff[eè]|cialde|capsul|ginseng|orzo|cacao|latte\b/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Caffetteria', centro: 'bar' } },
  { re: /gelat|ghiacciol|cono\b|coppett/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Gelateria', centro: 'bar' } },
  { re: /bicchier|cannucc|tovagliol|piatt[io] (?:carta|plastic|monouso)|posate|monouso|vaschett|sacchett/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Materiale monouso', centro: 'bar' } },
  { re: /detersiv|sgrassat|igienizz|candeggin|carta igienica|sapone|pulizia/i, c: { categoria: 'Lavanderia e pulizia', sottocategoria: 'Prodotti pulizia e consumo', centro: 'struttura' } },
  { re: /pesce|carne|pasta|farin|olio|pomodor|verdur|frutta|formagg|salum|pane|uova|riso|surgelat/i, c: { categoria: 'Acquisto merce', sottocategoria: 'Food ristorante', centro: 'ristorante' } },
]
export const CATEGORIA_ALTRO: Categoria = { categoria: 'Acquisto merce', sottocategoria: 'Altro', centro: 'bar' }

/** Categorie che le regole possono proporre (per i menu a tendina dell'anteprima). */
export const CATEGORIE_IMPORT: Categoria[] = [...new Map([...REGOLE.map((r) => r.c), CATEGORIA_ALTRO].map((c) => [`${c.categoria}|${c.sottocategoria}`, c])).values()]

export function categoriaPer(descrizione: string): Categoria {
  return REGOLE.find((r) => r.re.test(descrizione))?.c ?? CATEGORIA_ALTRO
}

// ——— utilità ———

const r2 = (n: number) => Math.round(n * 100) / 100
/** "1.234,56" → 1234.56 (accetta anche "1234.56") */
export function numeroIt(s?: string): number | undefined {
  if (!s) return undefined
  let t = s.replace(/[€\s]/g, '')
  if (/,\d{1,6}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}
const dataIso = (s?: string) => {
  const m = s?.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined
}
const metodoDa = (t: string): MetodoPagamento | undefined =>
  /\bRID\b|SDD|addebito diretto|MP19|MP20|MP21/i.test(t) ? 'rid'
    : /bonifico|MP05/i.test(t) ? 'bonifico'
    : /carta|MP08/i.test(t) ? 'carta'
    : /contant|MP01/i.test(t) ? 'contanti' : undefined

// ——— PDF ———

interface Riga { y: number; testo: string; parole: PezzoTesto[] }

function righeDiTesto(pezzi: PezzoTesto[]): Riga[] {
  const ps = pezzi.filter((p) => p.testo.trim()).sort((a, b) => b.y - a.y || a.x - b.x)
  const righe: Riga[] = []
  for (const p of ps) {
    const r = righe.find((x) => Math.abs(x.y - p.y) < 2.5)
    if (r) r.parole.push(p)
    else righe.push({ y: p.y, testo: '', parole: [p] })
  }
  for (const r of righe) {
    r.parole.sort((a, b) => a.x - b.x)
    r.testo = r.parole.map((p) => p.testo.trim()).join(' ').replace(/\s+/g, ' ').trim()
  }
  return righe.sort((a, b) => b.y - a.y)
}

const NUM = String.raw`\d{1,3}(?:\.\d{3})*,\d{2,4}|\d+,\d{2,4}`
// … [UM] quantità prezzo [sconto%] importo aliquota%
const RE_RIGA = new RegExp(
  String.raw`^(.*?)\s*(?:\b([A-Za-z]{1,3}\.?)\s+)?(\d+(?:,\d{1,3})?)\s+(${NUM})\s+(?:(\d{1,2}(?:,\d{1,2})?)\s?%\s+)?(${NUM})\s+(\d{1,2}(?:,\d{1,2})?)\s?%$`,
)
const RE_CODICE = /^(?=.*[\d-])[A-Z0-9][A-Z0-9./_-]{2,}$/

export function analizzaFatturaPdf(pezzi: PezzoTesto[]): DatiFattura {
  const righe = righeDiTesto(pezzi)
  const tutto = righe.map((r) => r.testo).join('\n')

  // righe articolo
  const articoli: { y: number; riga: RigaLetta; prima: string }[] = []
  let iTesta = righe.findIndex((r) => /descrizione/i.test(r.testo) && /(importo|totale|prezzo)/i.test(r.testo))
  for (let i = 0; i < righe.length; i++) {
    const m = righe[i].testo.match(RE_RIGA)
    if (!m) continue
    const [, testa, um, q, prezzo, sconto, importo, iva] = m
    articoli.push({
      y: righe[i].y, prima: testa,
      riga: {
        descrizione: '', um: um?.replace('.', '').toUpperCase(), quantita: numeroIt(q), prezzo: numeroIt(prezzo),
        sconto: numeroIt(sconto), importo: numeroIt(importo) ?? 0, iva: (numeroIt(iva) ?? 22) / 100,
      },
    })
    if (iTesta < 0) iTesta = i - 1
  }
  // pezzi di descrizione andati a capo: righe di solo testo dentro la tabella, attaccate all'articolo più vicino
  const frammenti = new Map<number, { y: number; t: string }[]>()
  if (articoli.length) {
    const yMin = articoli[articoli.length - 1].y - 14
    const yMax = iTesta >= 0 ? righe[iTesta].y : articoli[0].y + 14
    for (const r of righe) {
      if (r.y >= yMax || r.y <= yMin || RE_RIGA.test(r.testo) || /\d+,\d{2}\s*$/.test(r.testo)) continue
      let k = 0
      articoli.forEach((a, j) => { if (Math.abs(a.y - r.y) < Math.abs(articoli[k].y - r.y)) k = j })
      if (Math.abs(articoli[k].y - r.y) > 14) continue
      frammenti.set(k, [...(frammenti.get(k) ?? []), { y: r.y, t: r.testo }])
    }
  }
  const lette: RigaLetta[] = articoli.map((a, j) => {
    const parti = (a.prima || '').split(' ').filter(Boolean)
    let codice: string | undefined
    if (parti.length && RE_CODICE.test(parti[0])) codice = parti.shift()
    const pezziDescr = [...(frammenti.get(j) ?? []), { y: a.y, t: parti.join(' ') }]
      .filter((p) => p.t).sort((x, y) => y.y - x.y).map((p) => p.t)
    // un codice finito su una riga di frammento (descrizione su due righe con il codice centrato)
    if (!codice && pezziDescr.length) {
      const w = pezziDescr[0].split(' ')
      if (RE_CODICE.test(w[0])) { codice = w.shift(); pezziDescr[0] = w.join(' ') }
    }
    return { ...a.riga, codice, descrizione: pezziDescr.join(' ').replace(/\s+/g, ' ').trim() || 'Articolo' }
  })

  // intestazione (la prima P.IVA del documento è quella del fornitore, le altre del cliente)
  const pive = [...tutto.matchAll(/(?:P\.?\s?IVA|Partita IVA)[^0-9\n]{0,12}(?:IT)?\s?(\d{11})/gi)].map((m) => m[1])
  const societa = righe.map((r) => r.testo).find((t) => /\b(S\.?r\.?l\.?s?|S\.?p\.?A\.?|S\.?n\.?c\.?|S\.?a\.?s\.?|soc\.? coop)\b/i.test(t) && !/cessionario|committente|destinat|spett/i.test(t))
  const numero = tutto.match(/fattura[^\n]{0,30}?\bn(?:\.|r\.?|um(?:ero)?\.?|°)?\s*:?\s*([A-Z0-9][A-Z0-9/_-]*)/i)?.[1]
    ?? tutto.match(/^\s*n(?:\.|r\.?|umero|°)\s*:?\s*([A-Z0-9]+\/[0-9]{2,4})/im)?.[1]
  const data = dataIso(tutto.match(/\bdata(?: documento| fattura| emissione)?\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/i)?.[1])
    ?? dataIso(tutto)
  const scadenza = dataIso(tutto.match(/scadenz[ae][^0-9\n]{0,15}(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/i)?.[1])
  const importoDopo = (re: RegExp) => numeroIt(tutto.match(new RegExp(`(?:${re.source})` + String.raw`[^\n\d]{0,25}(${NUM})`, 'i'))?.[1])
  const imponibile = importoDopo(/totale imponibile|imponibile totale/)
  const imposta = importoDopo(/totale (?:iva|imposta)(?: \d{1,2}%)?/)
  const totale = importoDopo(/totale documento|totale fattura|netto a pagare|totale da pagare/)

  return {
    fornitore: societa?.replace(/\s+(fattura|n\.).*$/i, '').trim(), partitaIva: pive[0],
    numero, data, scadenza, metodo: metodoDa(tutto),
    imponibile: imponibile ?? (lette.length ? r2(lette.reduce((s, r) => s + r.importo, 0)) : undefined),
    imposta, totale, righe: lette,
  }
}

// ——— XML FatturaPA ———

export function analizzaFatturaXml(xml: string): DatiFattura {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML non valido')
  // i tag possono avere un prefisso (p:FatturaElettronica): si cerca per nome locale
  const tutti = (el: Element | Document, nome: string) => Array.from(el.getElementsByTagName('*')).filter((x) => x.localName === nome)
  const uno = (el: Element | Document | undefined, nome: string) => (el ? tutti(el, nome)[0] : undefined)
  const testo = (el: Element | Document | undefined, nome: string) => uno(el, nome)?.textContent?.trim() || undefined
  const num = (el: Element | Document | undefined, nome: string) => { const t = testo(el, nome); return t != null ? Number(t) : undefined }

  const cedente = uno(doc, 'CedentePrestatore')
  const anag = uno(cedente, 'Anagrafica')
  const fornitore = testo(anag, 'Denominazione') ?? [testo(anag, 'Nome'), testo(anag, 'Cognome')].filter(Boolean).join(' ') ?? undefined
  const generali = uno(doc, 'DatiGeneraliDocumento')
  const righe: RigaLetta[] = tutti(doc, 'DettaglioLinee').map((l) => {
    const sm = uno(l, 'ScontoMaggiorazione')
    const perc = num(sm, 'Percentuale')
    return {
      codice: testo(l, 'CodiceValore'), descrizione: testo(l, 'Descrizione') ?? 'Articolo', um: testo(l, 'UnitaMisura'),
      quantita: num(l, 'Quantita'), prezzo: num(l, 'PrezzoUnitario'),
      sconto: perc != null ? (testo(sm, 'Tipo') === 'MG' ? -perc : perc) : undefined,
      importo: num(l, 'PrezzoTotale') ?? 0, iva: (num(l, 'AliquotaIVA') ?? 22) / 100,
    }
  })
  const riepiloghi = tutti(doc, 'DatiRiepilogo')
  const imponibile = riepiloghi.length ? r2(riepiloghi.reduce((s, r) => s + (num(r, 'ImponibileImporto') ?? 0), 0)) : undefined
  const imposta = riepiloghi.length ? r2(riepiloghi.reduce((s, r) => s + (num(r, 'Imposta') ?? 0), 0)) : undefined
  const pagamento = uno(doc, 'DettaglioPagamento')
  return {
    fornitore: fornitore || undefined, partitaIva: testo(uno(cedente, 'IdFiscaleIVA'), 'IdCodice') ?? testo(cedente, 'CodiceFiscale'),
    numero: testo(generali, 'Numero'), data: testo(generali, 'Data'),
    scadenza: testo(pagamento, 'DataScadenzaPagamento'), metodo: metodoDa(testo(pagamento, 'ModalitaPagamento') ?? ''),
    imponibile, imposta,
    totale: num(generali, 'ImportoTotaleDocumento') ?? (imponibile != null && imposta != null ? r2(imponibile + imposta) : undefined),
    righe,
  }
}

/** Legge un file PDF o XML (fattura elettronica). */
export async function leggiFattura(file: File): Promise<DatiFattura> {
  if (/\.xml$/i.test(file.name) || /xml/i.test(file.type)) return analizzaFatturaXml(await file.text())
  return analizzaFatturaPdf(await leggiPdf(file))
}
