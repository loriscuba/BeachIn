/** Comande del ristorante (sala → cucina): etichette, colori e foto di riserva per il tablet self. */
import type { ArticoloBar, Comanda, ComandaSala, Piatto, RigaComandaSala, StatoComandaSala, StatoRigaSala } from '@/data/types'
import { urlPubblico } from '@/lib/urlPubblico'

export const etichettaStatoSala: Record<StatoComandaSala, string> = {
  inviata: 'Inviata', in_preparazione: 'In preparazione', pronta: 'Pronta', servita: 'Servita',
}
export const tonoStatoSala: Record<StatoComandaSala, 'rosso' | 'giallo' | 'verde' | 'spento'> = {
  inviata: 'rosso', in_preparazione: 'giallo', pronta: 'verde', servita: 'spento',
}
/** Testo del bottone della comanda (in preparazione si segnano i singoli piatti). */
export const azioneStatoSala: Partial<Record<StatoComandaSala, string>> = {
  inviata: 'Inizia preparazione', pronta: 'Servito tutto il pronto',
}

/** Comande ancora "aperte" di un tavolo (non servite), dalla più vecchia. */
export const aperteDelTavolo = (comande: ComandaSala[], tavolo: number) =>
  comande.filter((c) => c.tavolo === tavolo && c.stato !== 'servita' && !c.pagata).sort((a, b) => a.ts - b.ts)

/** Comande del conto in corso del tavolo (anche già servite): quelle della seduta attuale, non ancora pagate. */
export const delConto = (comande: ComandaSala[], tavolo: number, seduta?: string) =>
  comande.filter((c) => c.tavolo === tavolo && !c.pagata && (!c.seduta || !seduta || c.seduta === seduta)).sort((a, b) => a.ts - b.ts)

/** Minuti trascorsi dall'invio. */
export const minutiDa = (ts: number, ora = Date.now()) => Math.max(0, Math.floor((ora - ts) / 60000))

/**
 * Foto d'atmosfera (Unsplash, licenza libera) per la copertina del tablet. Non è un piatto del locale:
 * le foto vere dei piatti si caricano da Ristorante → Menu e compaiono nelle schede.
 */
export const fotoCopertinaSala = 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=1200&q=70'

// — Uscite (bevande subito, poi 1ª, 2ª… uscita) —
export const USCITE = [0, 1, 2, 3]
export const nomeUscita = (n: number) => (n === 0 ? 'Subito' : `${n}ª uscita`)
/** Uscita proposta per una sezione del menu: il cameriere la cambia trascinando il piatto. */
export function uscitaPredefinita(sezioneId: string): number {
  const s = sezioneId.toLowerCase()
  if (/bevand|vin|bibit|cantina/.test(s)) return 0
  if (/second|grigl|pesce|carne|contorn/.test(s)) return 2
  if (/dolc|dessert|frutta|gelat/.test(s)) return 3
  return 1
}

export const uscitaDi = (r: RigaComandaSala) => r.uscita ?? 1
/** Uscita chiamata ("via"): la cucina la può preparare. Le comande vecchie non hanno il campo: tutte chiamate. */
export const uscitaChiamata = (c: ComandaSala, n: number) => n <= (c.uscitaVia ?? 99)
/** Stato del piatto; le comande vecchie (senza stato per riga) lo ricavano da quello della comanda. */
export const statoRiga = (c: ComandaSala, r: RigaComandaSala): StatoRigaSala =>
  r.stato ?? (c.stato === 'servita' ? 'servita' : c.stato === 'pronta' ? 'pronta' : c.stato === 'in_preparazione' ? 'preparazione' : 'attesa')
/** Piatto ancora da preparare (da fare o in lavorazione). */
export const daPreparare = (st: StatoRigaSala) => st === 'attesa' || st === 'preparazione'

/** Uscite presenti nella comanda, in ordine, con i loro piatti (indice originale per le azioni). */
export function usciteDi(c: ComandaSala) {
  const mappa = new Map<number, { r: RigaComandaSala; i: number }[]>()
  c.righe.forEach((r, i) => { const n = uscitaDi(r); mappa.set(n, [...(mappa.get(n) ?? []), { r, i }]) })
  return [...mappa.entries()].sort((a, b) => a[0] - b[0]).map(([n, righe]) => {
    const stati = righe.map(({ r }) => statoRiga(c, r))
    const stato: StatoRigaSala = stati.every((x) => x === 'servita') ? 'servita' : stati.every((x) => !daPreparare(x)) ? 'pronta' : 'attesa'
    return { n, righe, stato, chiamata: uscitaChiamata(c, n) }
  })
}

/**
 * Stato della comanda ricavato dai piatti (stessa regola per cucina e bar, anche sulla vista di un solo reparto):
 * servita se tutto è servito; dei piatti chiamati e non serviti: tutti da fare = inviata (Da fare), tutti pronti = pronta,
 * altrimenti in preparazione. Le stesse righe stanno nel jsonb: lo stato salvato è solo un riassunto.
 */
export function ricalcolaStato(c: ComandaSala): ComandaSala {
  const stati = c.righe.map((r) => statoRiga(c, r))
  const attivi = stati.filter((x, i) => x !== 'servita' && uscitaChiamata(c, uscitaDi(c.righe[i])))
  const stato: StatoComandaSala = stati.every((x) => x === 'servita') ? 'servita'
    : attivi.length && attivi.every((x) => x === 'pronta') ? 'pronta'
    : attivi.length && attivi.every((x) => x === 'attesa') ? 'inviata'
    : 'in_preparazione'
  // righe senza stato (comande vecchie): lo fissano qui, così non dipendono più dallo stato della comanda
  return { ...c, righe: c.righe.map((r, i) => (r.stato ? r : { ...r, stato: stati[i] })), stato }
}

/** Link pubblico dell'app di sala (cameriere, cucina, tablet), da aprire su telefono o tablet. */
export const urlSalaApp = () => urlPubblico('salaapp')

// — Bar al tavolo (modulo `bar-tavolo`): righe del listino bar nella stessa comanda —
export type Reparto = 'cucina' | 'bar'
export const repartoDi = (r: RigaComandaSala): Reparto => r.reparto ?? 'cucina'

/** Articoli disponibili del listino bar nella forma dei piatti (stessi componenti di cameriere e tablet). */
export const articoliComePiatti = (articoli: ArticoloBar[]): Piatto[] =>
  articoli.filter((a) => a.disponibile !== false).map((a) => ({
    id: a.id, nome: a.nome, categoria: a.categoria, prezzo: a.prezzoVendita, foodCost: a.costoAcquisto, allergeni: [], vendutiStagione: 0,
  }))

/**
 * La comanda vista da un reparto: solo le sue righe (con l'indice originale, per le azioni) e lo stato
 * ricalcolato su quelle. `null` se il reparto non ha niente in questa comanda.
 */
export function perReparto(c: ComandaSala, reparto: Reparto): { c: ComandaSala; indici: number[] } | null {
  const indici = c.righe.flatMap((r, i) => (repartoDi(r) === reparto ? [i] : []))
  if (!indici.length) return null
  return { c: ricalcolaStato({ ...c, righe: indici.map((i) => c.righe[i]) }), indici }
}

/** Comande che la cucina non ha ancora iniziato (badge «Cucina»): sono nella colonna Da fare. */
export const daFareCucina = (comande: ComandaSala[]) => comande.filter((c) => perReparto(c, 'cucina')?.c.stato === 'inviata').length

/** Bevande dei tavoli ancora da preparare al bar (da fare o in lavorazione). */
export const righeBarDaFare = (c: ComandaSala) =>
  c.righe.flatMap((r, i) => (repartoDi(r) === 'bar' && daPreparare(statoRiga(c, r)) ? [i] : []))

/** Una voce della coda unica del bar: comanda dall'ombrellone o bevande di un tavolo. */
export type VoceBar = { tipo: 'ombrellone'; ts: number; c: Comanda } | { tipo: 'tavolo'; ts: number; c: ComandaSala }

/** Coda unica del bar: da preparare (dalla più vecchia) e pronte (le ultime, dalla più recente). */
export function codaBar(comande: Comanda[], comandeSala: ComandaSala[]) {
  const ombrelloni: VoceBar[] = comande.map((c) => ({ tipo: 'ombrellone', ts: c.ts ?? 0, c }))
  const tavoli: VoceBar[] = comandeSala.filter((c) => c.righe.some((r) => repartoDi(r) === 'bar')).map((c) => ({ tipo: 'tavolo', ts: c.ts, c }))
  const daFare = (v: VoceBar) => (v.tipo === 'ombrellone' ? v.c.stato !== 'pronta' : righeBarDaFare(v.c).length > 0)
  const pronta = (v: VoceBar) => (v.tipo === 'ombrellone' ? v.c.stato === 'pronta' : !daFare(v) && v.c.righe.some((r) => repartoDi(r) === 'bar' && statoRiga(v.c, r) === 'pronta'))
  const tutte = [...ombrelloni, ...tavoli]
  return {
    daFare: tutte.filter(daFare).sort((a, b) => a.ts - b.ts),
    pronte: tutte.filter(pronta).sort((a, b) => b.ts - a.ts).slice(0, 12),
  }
}

/** Link del QR fisso di un tavolo (codice non indovinabile): il telefono del cliente apre il menu di quel tavolo. */
export const urlTavoloQr = (codice: string) => urlPubblico(`tavolo?c=${codice}`)
