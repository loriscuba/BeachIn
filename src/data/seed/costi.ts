/**
 * Costi dello stabilimento — copertura completa di tutte le categorie del
 * PROMPT. Le voci ricorrenti mensili vengono espanse sui mesi di stagione, così
 * l'elenco è ricco e la sintesi fissi/variabili è credibile. Il totale si
 * ottiene sommando le voci (nessun magic number nel Conto economico).
 */
import type {
  CentroCosto,
  MetodoPagamento,
  Ricorrenza,
  StatoPagamento,
  TipoCosto,
  VoceCosto,
} from '../types'
import { creaRng, intero, scegliPesato, arrotonda, type Rng } from './_rng'
import { costoPersonaleMensile } from './personale'

const mesi = ['05', '06', '07', '08', '09'] as const
const oggiMese = 7 // luglio

interface Template {
  categoria: string
  sottocategoria: string
  fornitore: string
  imponibile: number | [number, number] // fisso o range mensile
  iva: number
  ricorrenza: Ricorrenza
  tipo: TipoCosto
  centro: CentroCosto
  metodo: MetodoPagamento
  mese?: string // per una_tantum/annuale
}

const templates: Template[] = [
  // — Concessione demaniale —
  { categoria: 'Concessione demaniale', sottocategoria: 'Canone statale', fornitore: 'Agenzia del Demanio', imponibile: 28000, iva: 0, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'f24', mese: '05' },
  { categoria: 'Concessione demaniale', sottocategoria: 'Imposta regionale', fornitore: 'Regione Toscana', imponibile: 4200, iva: 0, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'f24', mese: '05' },
  { categoria: 'Concessione demaniale', sottocategoria: 'Diritti e istruttoria', fornitore: 'Comune', imponibile: 850, iva: 0, ricorrenza: 'una_tantum', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  // — Imposte e affitti —
  { categoria: 'Imposte e affitti', sottocategoria: 'Rata mutuo', fornitore: 'Banca del Tirreno', imponibile: 3200, iva: 0, ricorrenza: 'mensile', tipo: 'fisso', centro: 'struttura', metodo: 'rid' },
  { categoria: 'Imposte e affitti', sottocategoria: 'IMU', fornitore: 'Comune', imponibile: 3600, iva: 0, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'f24', mese: '06' },
  { categoria: 'Imposte e affitti', sottocategoria: 'TARI', fornitore: 'Comune', imponibile: 5400, iva: 0, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'f24', mese: '07' },
  // — Utenze —
  { categoria: 'Utenze', sottocategoria: 'Energia elettrica', fornitore: 'Enel Energia', imponibile: [1800, 2700], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'struttura', metodo: 'rid' },
  { categoria: 'Utenze', sottocategoria: 'Acqua', fornitore: 'Acquedotto', imponibile: [420, 720], iva: 0.1, ricorrenza: 'mensile', tipo: 'variabile', centro: 'struttura', metodo: 'rid' },
  { categoria: 'Utenze', sottocategoria: 'Gas', fornitore: 'Eni Plenitude', imponibile: [280, 520], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'ristorante', metodo: 'rid' },
  { categoria: 'Utenze', sottocategoria: 'Internet e telefonia', fornitore: 'TIM Business', imponibile: 120, iva: 0.22, ricorrenza: 'mensile', tipo: 'fisso', centro: 'struttura', metodo: 'rid' },
  // — Acquisto merce —
  { categoria: 'Acquisto merce', sottocategoria: 'Food ristorante', fornitore: 'Ittica Versilia', imponibile: [11000, 17500], iva: 0.1, ricorrenza: 'mensile', tipo: 'variabile', centro: 'ristorante', metodo: 'bonifico' },
  { categoria: 'Acquisto merce', sottocategoria: 'Beverage bar', fornitore: 'Distribuzione Bevande', imponibile: [6500, 11000], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'bar', metodo: 'bonifico' },
  { categoria: 'Acquisto merce', sottocategoria: 'Cantina', fornitore: 'Enoteca Costa', imponibile: [1200, 2200], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'ristorante', metodo: 'bonifico' },
  { categoria: 'Acquisto merce', sottocategoria: 'Gelateria', fornitore: 'Gelati Sanson', imponibile: [900, 1900], iva: 0.1, ricorrenza: 'mensile', tipo: 'variabile', centro: 'bar', metodo: 'bonifico' },
  { categoria: 'Acquisto merce', sottocategoria: 'Materiale monouso', fornitore: 'Ecopack', imponibile: [600, 1100], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'bar', metodo: 'carta' },
  // — Manutenzioni —
  { categoria: 'Manutenzioni', sottocategoria: 'Cabine e spogliatoi', fornitore: 'Falegnameria Rossi', imponibile: 2400, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  { categoria: 'Manutenzioni', sottocategoria: 'Ombrelloni e teli', fornitore: 'Tende Marini', imponibile: 3100, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'bonifico', mese: '05' },
  { categoria: 'Manutenzioni', sottocategoria: 'Lettini e sdraio', fornitore: 'Arredo Mare', imponibile: 1900, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'carta', mese: '06' },
  { categoria: 'Manutenzioni', sottocategoria: 'Passerelle', fornitore: 'Falegnameria Rossi', imponibile: 1500, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'bonifico', mese: '05' },
  { categoria: 'Manutenzioni', sottocategoria: 'Impianto idrico ed elettrico', fornitore: 'Impianti Bianchi', imponibile: [400, 900], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'struttura', metodo: 'bonifico' },
  { categoria: 'Manutenzioni', sottocategoria: 'Verniciature e carpenteria', fornitore: 'Edil Costa', imponibile: 2200, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  // — Arenile —
  { categoria: 'Arenile', sottocategoria: 'Livellamento sabbia', fornitore: 'Movimento Terra Srl', imponibile: 1800, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'bonifico', mese: '05' },
  { categoria: 'Arenile', sottocategoria: 'Ripascimento', fornitore: 'Consorzio Litorale', imponibile: 3400, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'bonifico', mese: '05' },
  { categoria: 'Arenile', sottocategoria: 'Pulizia quotidiana', fornitore: 'Pulizie Litoranea', imponibile: [700, 1000], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'spiaggia', metodo: 'bonifico' },
  { categoria: 'Arenile', sottocategoria: 'Smaltimento rifiuti', fornitore: 'Ambiente Servizi', imponibile: [350, 620], iva: 0.1, ricorrenza: 'mensile', tipo: 'variabile', centro: 'spiaggia', metodo: 'rid' },
  { categoria: 'Arenile', sottocategoria: 'Noleggio mezzi', fornitore: 'Noleggi Versilia', imponibile: 900, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'carta', mese: '06' },
  // — Attrezzature e ammortamenti —
  { categoria: 'Attrezzature', sottocategoria: 'Ammortamento ombrelloni e lettini', fornitore: '—', imponibile: 1400, iva: 0, ricorrenza: 'mensile', tipo: 'fisso', centro: 'spiaggia', metodo: 'bonifico' },
  { categoria: 'Attrezzature', sottocategoria: 'Ammortamento attrezzatura bar/cucina', fornitore: '—', imponibile: 1100, iva: 0, ricorrenza: 'mensile', tipo: 'fisso', centro: 'ristorante', metodo: 'bonifico' },
  { categoria: 'Attrezzature', sottocategoria: 'Ammortamento struttura e arredo', fornitore: '—', imponibile: 1600, iva: 0, ricorrenza: 'mensile', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico' },
  { categoria: 'Attrezzature', sottocategoria: 'Casse e POS', fornitore: 'RCH Group', imponibile: 1600, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'fisso', centro: 'struttura', metodo: 'carta', mese: '05' },
  // — Assicurazioni —
  { categoria: 'Assicurazioni', sottocategoria: 'RC verso terzi', fornitore: 'Generali', imponibile: 4200, iva: 0, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  { categoria: 'Assicurazioni', sottocategoria: 'Incendio', fornitore: 'Generali', imponibile: 1800, iva: 0, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  { categoria: 'Assicurazioni', sottocategoria: 'Infortuni', fornitore: 'Unipol', imponibile: 1500, iva: 0, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  { categoria: 'Assicurazioni', sottocategoria: 'Tutela legale', fornitore: 'Unipol', imponibile: 700, iva: 0, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  // — Consulenze e obblighi —
  { categoria: 'Consulenze e obblighi', sottocategoria: 'Commercialista', fornitore: 'Studio Bilancio', imponibile: 450, iva: 0.22, ricorrenza: 'mensile', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico' },
  { categoria: 'Consulenze e obblighi', sottocategoria: 'Consulente del lavoro', fornitore: 'Studio Paghe', imponibile: 380, iva: 0.22, ricorrenza: 'mensile', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico' },
  { categoria: 'Consulenze e obblighi', sottocategoria: 'HACCP', fornitore: 'Sicurezza Alimentare Srl', imponibile: 600, iva: 0.22, ricorrenza: 'annuale', tipo: 'fisso', centro: 'ristorante', metodo: 'bonifico', mese: '05' },
  { categoria: 'Consulenze e obblighi', sottocategoria: 'Sicurezza D.Lgs 81', fornitore: 'Sicura Consulting', imponibile: 900, iva: 0.22, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  { categoria: 'Consulenze e obblighi', sottocategoria: 'Antincendio', fornitore: 'Estintori Group', imponibile: 500, iva: 0.22, ricorrenza: 'annuale', tipo: 'fisso', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  { categoria: 'Consulenze e obblighi', sottocategoria: 'Corsi brevetto salvataggio', fornitore: 'FIN Salvamento', imponibile: 800, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'carta', mese: '05' },
  // — Salvataggio e sicurezza —
  { categoria: 'Salvataggio e sicurezza', sottocategoria: 'Attrezzatura torretta e moscone', fornitore: 'Nautica Salvamento', imponibile: 2100, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'bonifico', mese: '05' },
  { categoria: 'Salvataggio e sicurezza', sottocategoria: 'Defibrillatore e cassetta medica', fornitore: 'Medical Beach', imponibile: 700, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'carta', mese: '05' },
  { categoria: 'Salvataggio e sicurezza', sottocategoria: 'Segnaletica', fornitore: 'Segnal Mare', imponibile: 500, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'spiaggia', metodo: 'carta', mese: '05' },
  // — SIAE e intrattenimento —
  { categoria: 'SIAE e intrattenimento', sottocategoria: 'SIAE', fornitore: 'SIAE', imponibile: [200, 500], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'eventi', metodo: 'bonifico' },
  { categoria: 'SIAE e intrattenimento', sottocategoria: 'Musica e animazione', fornitore: 'Eventi & Sound', imponibile: [600, 1400], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'eventi', metodo: 'bonifico' },
  { categoria: 'SIAE e intrattenimento', sottocategoria: 'Service audio', fornitore: 'AudioPro', imponibile: 1200, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'eventi', metodo: 'bonifico', mese: '07' },
  // — Marketing —
  { categoria: 'Marketing', sottocategoria: 'Sito web e hosting', fornitore: 'WebStudio', imponibile: 90, iva: 0.22, ricorrenza: 'mensile', tipo: 'fisso', centro: 'struttura', metodo: 'carta' },
  { categoria: 'Marketing', sottocategoria: 'Social e ADV', fornitore: 'Meta / Google', imponibile: [250, 600], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'struttura', metodo: 'carta' },
  { categoria: 'Marketing', sottocategoria: 'Fotografo e stampa', fornitore: 'Studio Foto', imponibile: 900, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  { categoria: 'Marketing', sottocategoria: 'Insegne', fornitore: 'Insegne Costa', imponibile: 1300, iva: 0.22, ricorrenza: 'una_tantum', tipo: 'variabile', centro: 'struttura', metodo: 'bonifico', mese: '05' },
  { categoria: 'Marketing', sottocategoria: 'Commissioni OTA', fornitore: 'Portali prenotazione', imponibile: [300, 800], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'struttura', metodo: 'carta' },
  // — Lavanderia e pulizia —
  { categoria: 'Lavanderia e pulizia', sottocategoria: 'Lavanderia teli', fornitore: 'Lavanderia Blu', imponibile: [350, 700], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'spiaggia', metodo: 'bonifico' },
  { categoria: 'Lavanderia e pulizia', sottocategoria: 'Prodotti pulizia e consumo', fornitore: 'Igiene Pro', imponibile: [300, 550], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'struttura', metodo: 'carta' },
  // — Bancari —
  { categoria: 'Bancari', sottocategoria: 'Canone conto', fornitore: 'Banca del Tirreno', imponibile: 45, iva: 0, ricorrenza: 'mensile', tipo: 'fisso', centro: 'struttura', metodo: 'rid' },
  { categoria: 'Bancari', sottocategoria: 'Commissioni POS', fornitore: 'Nexi', imponibile: [280, 620], iva: 0.22, ricorrenza: 'mensile', tipo: 'variabile', centro: 'struttura', metodo: 'rid' },
  { categoria: 'Bancari', sottocategoria: 'Interessi finanziamento', fornitore: 'Banca del Tirreno', imponibile: 210, iva: 0, ricorrenza: 'mensile', tipo: 'fisso', centro: 'struttura', metodo: 'rid' },
]

function statoDi(rng: Rng, meseNum: number): StatoPagamento {
  if (meseNum < oggiMese) return scegliPesato(rng, ['pagato', 'scaduto'] as StatoPagamento[], [92, 8])
  if (meseNum === oggiMese) return scegliPesato(rng, ['pagato', 'da_pagare', 'scaduto'] as StatoPagamento[], [45, 45, 10])
  return 'da_pagare'
}

function scadenza(meseNum: number): string {
  const m = String(meseNum).padStart(2, '0')
  return `2026-${m}-20`
}

function costruisci(rng: Rng): VoceCosto[] {
  const voci: VoceCosto[] = []
  let n = 0
  const push = (t: Template, meseNum: number, importo: number) => {
    n++
    const data = `2026-${String(meseNum).padStart(2, '0')}-05`
    voci.push({
      id: `K-${String(n).padStart(4, '0')}`,
      categoria: t.categoria,
      sottocategoria: t.sottocategoria,
      fornitore: t.fornitore,
      imponibile: importo,
      iva: t.iva,
      ricorrenza: t.ricorrenza,
      tipo: t.tipo,
      centroCosto: t.centro,
      data,
      scadenza: scadenza(meseNum),
      statoPagamento: statoDi(rng, meseNum),
      metodo: t.metodo,
    })
  }

  for (const t of templates) {
    if (t.ricorrenza === 'mensile') {
      for (const m of mesi) {
        const meseNum = parseInt(m, 10)
        const importo = Array.isArray(t.imponibile)
          ? arrotonda(intero(rng, t.imponibile[0], t.imponibile[1]), 1)
          : t.imponibile
        push(t, meseNum, importo)
      }
    } else {
      const meseNum = parseInt(t.mese ?? '05', 10)
      const importo = Array.isArray(t.imponibile) ? t.imponibile[0] : t.imponibile
      push(t, meseNum, importo)
    }
  }

  // — Personale: una voce mensile per centro sintetica, allineata al modulo Personale —
  const centriPersonale: { centro: CentroCosto; quota: number }[] = [
    { centro: 'spiaggia', quota: 0.35 },
    { centro: 'bar', quota: 0.2 },
    { centro: 'ristorante', quota: 0.3 },
    { centro: 'struttura', quota: 0.15 },
  ]
  for (const m of mesi) {
    const meseNum = parseInt(m, 10)
    for (const cp of centriPersonale) {
      n++
      voci.push({
        id: `K-${String(n).padStart(4, '0')}`,
        categoria: 'Personale',
        sottocategoria: `Costo del lavoro (${cp.centro})`,
        fornitore: 'Buste paga',
        imponibile: Math.round(costoPersonaleMensile * cp.quota),
        iva: 0,
        ricorrenza: 'mensile',
        tipo: 'fisso',
        centroCosto: cp.centro,
        data: `2026-${m}-27`,
        scadenza: `2026-${m}-27`,
        statoPagamento: meseNum <= oggiMese ? 'pagato' : 'da_pagare',
        metodo: 'bonifico',
      })
    }
  }

  return voci
}

export const costi: VoceCosto[] = costruisci(creaRng(6363))

/** Totale imponibile dei costi di stagione (somma delle voci). */
export const costiTotali = costi.reduce((s, c) => s + c.imponibile, 0)
