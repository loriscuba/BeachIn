/**
 * Lettura di una busta paga in PDF (cedolino) nel browser: pdf.js estrae i testi con la loro posizione e qui si
 * ricavano i dati principali. Il modello di riferimento è il cedolino TeamSystem (il più diffuso tra i consulenti):
 * etichette di una casella in alto, valore sulla riga sotto. Ogni valore va nella casella la cui etichetta inizia
 * più a destra prima della fine del valore (i numeri sono allineati a destra nella casella).
 * Codice fiscale e IBAN si cercano anche in tutto il testo, così qualcosa arriva anche da modelli diversi.
 * Nessun dato esce dal dispositivo: il PDF non viene caricato da nessuna parte.
 */
import type { RuoloDipendente, VoceBustaPaga } from '@/data/types'

/** Testo del PDF con posizione (punti PDF, origine in basso a sinistra). */
export interface PezzoTesto { testo: string; x: number; y: number; larghezza: number }
interface Parola { t: string; x: number; fine: number; y: number }

export interface DatiBustaPaga {
  ditta?: string
  /** "2026-07" */
  periodo?: string
  cognome?: string
  nome?: string
  matricola?: string
  codiceFiscale?: string
  comuneResidenza?: string
  /** date in formato ISO "AAAA-MM-GG" */
  dataNascita?: string
  dataAssunzione?: string
  dataCessazione?: string
  qualifica?: string
  livello?: string
  percentualePartTime?: number
  oreMensiliCcnl?: number
  giorniCcnl?: number
  retribuzioneFatto?: number
  pagaBase?: number
  contingenza?: number
  giorniLavorati?: number
  oreStraordinario?: number
  totaleLordo?: number
  imponibileContributi?: number
  contributiDipendente?: number
  imponibileIrpef?: number
  irpefLorda?: number
  detrazioni?: number
  irpefNetta?: number
  totaleTrattenute?: number
  netto?: number
  tfrMese?: number
  tfrMaturato?: number
  ferieResidue?: number
  rolResidui?: number
  iban?: string
  banca?: string
  voci: VoceBustaPaga[]
}

const MESI = ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE']
export const nomeMese = (periodo?: string) => {
  if (!periodo) return ''
  const [a, m] = periodo.split('-')
  const n = MESI[Number(m) - 1]
  return n ? `${n[0]}${n.slice(1).toLowerCase()} ${a}` : periodo
}

/** "1.744,10" → 1744.1; "-167,28" → -167.28 */
export const numeroIt = (s?: string): number | undefined => {
  if (!s) return undefined
  const pulito = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  if (!pulito || pulito === '-' || pulito === '.') return undefined
  const n = Number(pulito)
  return Number.isFinite(n) ? n : undefined
}

/** "12/08/98" o "12/08/1998" → "1998-08-12" (anni a due cifre: oltre l'anno corrente+5 = 1900). */
export const dataIt = (s?: string): string | undefined => {
  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!m) return undefined
  let anno = Number(m[3])
  if (m[3].length === 2) anno += anno > (new Date().getFullYear() % 100) + 5 ? 1900 : 2000
  return `${anno}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const RE_CF = /\b[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]\b/
const RE_IBAN = /\bIT\d{2}[A-Z]\d{10}[0-9A-Z]{12}\b/

/** Spezza i pezzi di testo in parole con la loro posizione (carattere a larghezza media del pezzo). */
function parole(pezzi: PezzoTesto[]): Parola[] {
  const out: Parola[] = []
  for (const p of pezzi) {
    if (!p.testo.trim()) continue
    const cw = p.larghezza / Math.max(1, p.testo.length)
    const re = /\S+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(p.testo))) out.push({ t: m[0], x: p.x + m.index * cw, fine: p.x + (m.index + m[0].length) * cw, y: p.y })
  }
  return out
}

/** Valori sotto le etichette: per ogni riga di etichette, le parole della riga sotto vanno nella casella giusta. */
function caselle(pezzi: PezzoTesto[], ws: Parola[]) {
  const etichette = pezzi.filter((p) => /[A-Z]{2}/.test(p.testo) && p.testo === p.testo.toUpperCase() && p.larghezza / Math.max(1, p.testo.length) < 4)
  const valori = new Map<string, string[]>() // etichetta → valori (dall'alto in basso)
  const righe: PezzoTesto[][] = []
  for (const e of [...etichette].sort((a, b) => b.y - a.y)) {
    const r = righe.find((rr) => Math.abs(rr[0].y - e.y) <= 1)
    if (r) r.push(e)
    else righe.push([e])
  }
  for (const r of righe) {
    const y = r[0].y
    const cols = [...r].sort((a, b) => a.x - b.x)
    const sotto = ws.filter((w) => w.y < y - 9 && w.y > y - 20 && !etichette.some((e) => Math.abs(e.y - w.y) < 0.5 && w.x >= e.x - 0.5 && w.fine <= e.x + e.larghezza + 0.5))
    const perCol = new Map<PezzoTesto, Parola[]>()
    for (const w of sotto) {
      const c = [...cols].reverse().find((e) => e.x <= w.fine - 3)
      if (!c) continue
      perCol.set(c, [...(perCol.get(c) ?? []), w])
    }
    for (const [c, lista] of perCol) {
      const chiave = c.testo.trim()
      const testo = lista.sort((a, b) => a.x - b.x).map((w) => w.t).join(' ')
      valori.set(chiave, [...(valori.get(chiave) ?? []), testo])
    }
  }
  return valori
}

const PREFISSI_COGNOME = new Set(['DE', 'DI', 'DEL', 'DELLA', 'DELLO', 'DEI', 'DEGLI', 'LA', 'LO', 'LI', 'DA', 'DAL', 'DALLA', 'DALL\'', 'D\'', 'MC', 'VAN', 'VON'])
function dividiNominativo(s: string) {
  const p = s.trim().split(/\s+/)
  let n = 1
  while (n < p.length - 1 && PREFISSI_COGNOME.has(p[n - 1])) n++
  const tc = (x: string) => x.toLowerCase().replace(/(^|[\s'’-])\p{L}/gu, (c) => c.toUpperCase())
  return { cognome: tc(p.slice(0, n).join(' ')), nome: tc(p.slice(n).join(' ')) }
}

/** Analizza i testi di una pagina di cedolino. */
export function analizzaBustaPaga(pezzi: PezzoTesto[]): DatiBustaPaga {
  const ws = parole(pezzi)
  const v = caselle(pezzi, ws)
  const primo = (k: string) => v.get(k)?.[0]
  const num = (k: string) => numeroIt(primo(k)?.split(' ').pop())
  const out: DatiBustaPaga = { voci: [] }

  // Ditta: le righe sotto "Ditta" (nome e indirizzo)
  const ditta = pezzi.find((p) => p.testo.trim() === 'Ditta')
  if (ditta) {
    const sotto = pezzi.filter((p) => p.y < ditta.y && p.y > ditta.y - 30 && p.testo.trim() && !/^(Foglio|Autorizz)/.test(p.testo.trim())).sort((a, b) => b.y - a.y)
    out.ditta = sotto[0]?.testo.trim()
  }

  const mese = primo('MESE RETRIBUITO')?.split(' ')
  if (mese) {
    const m = MESI.indexOf(mese[0]?.toUpperCase() ?? '')
    const a = mese.find((x) => /^\d{4}$/.test(x))
    if (m >= 0 && a) out.periodo = `${a}-${String(m + 1).padStart(2, '0')}`
  }
  const nominativo = primo('COGNOME E NOME')
  if (nominativo) Object.assign(out, dividiNominativo(nominativo))
  out.matricola = primo('CODICE')
  out.dataAssunzione = dataIt(primo('DATA ASSUNZIONE'))
  out.dataCessazione = dataIt(primo('DATA CESSAZIONE'))
  out.codiceFiscale = primo('CODICE FISCALE')?.match(RE_CF)?.[0]
  out.comuneResidenza = primo('COMUNE DI RESIDENZA')
  out.dataNascita = dataIt(primo('DATA NASCITA'))
  out.retribuzioneFatto = num('RETRIBUZIONE DI FATTO')
  out.qualifica = primo('QUALIFICA')
  out.livello = primo('LIVELLO')
  out.percentualePartTime = num('% P. TIME')
  out.oreMensiliCcnl = num('ORE CCNL')
  out.giorniCcnl = num('GG.')
  out.totaleLordo = num('TOTALE LORDO')
  out.imponibileContributi = num('IMPON. CONTR. SOC.')
  out.contributiDipendente = num('TOTALE CONTRIBUTI SOCIALI')
  out.imponibileIrpef = num('IMPONIBILE IRPEF')
  out.irpefLorda = num('IRPEF LORDA')
  out.detrazioni = num('TOTALE DETRAZIONI')
  out.irpefNetta = num('TOTALE TRATTENUTE IRPEF')
  out.totaleTrattenute = num('TOTALE TRATTENUTE')
  out.netto = num('NETTO BUSTA')
  out.ferieResidue = num('FERIE RES.')
  out.rolResidui = num('ROL. RES.')
  out.banca = primo('BANCA ACCREDITO')

  // Paga base e contingenza: la riga di valori sotto "PAGA BASE CONTINGEN. ..."
  const intest = pezzi.find((p) => /PAGA BASE/.test(p.testo))
  if (intest) {
    const riga = ws.filter((w) => w.y < intest.y - 3 && w.y > intest.y - 16).sort((a, b) => a.x - b.x)
    out.pagaBase = numeroIt(riga[0]?.t)
    out.contingenza = numeroIt(riga[1]?.t)
  }

  // Voci del corpo: tra l'intestazione "DESCRIZIONE VOCE" e "TOTALE LORDO", colonne prese dall'intestazione
  const hDesc = pezzi.find((p) => p.testo.trim() === 'DESCRIZIONE VOCE')
  const hFine = pezzi.find((p) => p.testo.trim() === 'TOTALE LORDO')
  if (hDesc) {
    const colonne = ['ORE/GIORNI', 'BASE', 'COMPETENZE', 'TRATTENUTE', 'DATI STATISTICI']
      .map((t) => ({ t, x: pezzi.find((p) => p.testo.trim() === t && Math.abs(p.y - hDesc.y) < 1)?.x ?? Infinity }))
    const xOre = colonne[0].x
    const yFine = hFine?.y ?? 0
    const righe = new Map<number, Parola[]>()
    for (const w of ws.filter((w) => w.y < hDesc.y - 3 && w.y > yFine + 3)) {
      const k = Math.round(w.y)
      righe.set(k, [...(righe.get(k) ?? []), w])
    }
    for (const [, lista] of [...righe].sort((a, b) => b[0] - a[0])) {
      lista.sort((a, b) => a.x - b.x)
      const testoRiga = lista.map((w) => w.t).join(' ')
      if (/^Tfr maturato/i.test(testoRiga)) { out.tfrMaturato = numeroIt(lista[lista.length - 1].t); continue }
      if (!/^\d{1,5}$/.test(lista[0].t)) continue
      const voce: VoceBustaPaga = { codice: lista[0].t, descrizione: '' }
      const desc: string[] = []
      for (const w of lista.slice(1)) {
        if (w.fine - 3 < xOre) { desc.push(w.t); continue }
        const col = [...colonne].reverse().find((c) => c.x <= w.fine - 3)?.t
        const n = numeroIt(w.t)
        if (n == null) continue
        if (col === 'ORE/GIORNI') voce.quantita = n
        else if (col === 'BASE') voce.base = n
        else if (col === 'COMPETENZE') voce.competenza = n
        else if (col === 'TRATTENUTE') voce.trattenuta = n
        else if (col === 'DATI STATISTICI' && voce.statistico == null) voce.statistico = n
      }
      voce.descrizione = desc.join(' ')
      out.voci.push(voce)
    }
    const ordinario = out.voci.find((x) => /ORDINARI/i.test(x.descrizione))
    if (ordinario?.quantita != null) out.giorniLavorati = ordinario.quantita
    const straord = out.voci.filter((x) => /STRAORD/i.test(x.descrizione))
    if (straord.length) out.oreStraordinario = straord.reduce((s, x) => s + (x.quantita ?? 0), 0)
    const tfr = out.voci.find((x) => /T\.?F\.?R/i.test(x.descrizione))
    if (tfr) out.tfrMese = tfr.statistico ?? tfr.competenza
  }

  // Ripieghi su tutto il testo (altri modelli di cedolino)
  const tutto = pezzi.map((p) => p.testo).join(' ')
  out.codiceFiscale ??= tutto.match(RE_CF)?.[0]
  out.iban = tutto.replace(/\s+(?=\d)/g, '').match(RE_IBAN)?.[0] ?? tutto.match(RE_IBAN)?.[0]
  if (out.banca && out.iban && out.banca.includes(out.iban)) out.banca = out.banca.replace(out.iban, '').trim()
  return out
}

/** Ruolo dell'app dalla qualifica scritta sul cedolino (se non si riconosce, lo sceglie chi importa). */
export function ruoloDaQualifica(q?: string): RuoloDipendente | undefined {
  const s = (q ?? '').toUpperCase()
  if (/AIUTO\s*CUOC|COMMIS/.test(s)) return 'aiuto_cuoco'
  if (/CUOC|CHEF/.test(s)) return 'cuoco'
  if (/BAR(IST|MAN)|BAR\b/.test(s)) return 'barista'
  if (/CAMERIER|SALA/.test(s)) return 'cameriere'
  if (/BAGNIN|SALVATAG|ASSIST.*BAGN/.test(s)) return 'assistente_bagnanti'
  if (/CASS|RECEPTION|ACCOGLIEN/.test(s)) return 'cassa_reception'
  if (/PULIZ/.test(s)) return 'pulizie'
  if (/MANUTEN/.test(s)) return 'manutentore'
  return undefined
}

/** Testi della prima pagina del PDF (pdf.js caricato solo quando serve). */
export async function leggiPdf(file: File): Promise<PezzoTesto[]> {
  const [pdfjs, { default: worker }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  try {
    const pagina = await doc.getPage(1)
    const { items } = await pagina.getTextContent()
    return items.flatMap((it) => ('str' in it ? [{ testo: it.str, x: it.transform[4], y: it.transform[5], larghezza: it.width }] : []))
  } finally {
    void doc.destroy()
  }
}
