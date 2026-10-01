/**
 * Ristorante: menù reale del Lido (25 piatti + bevande con food cost, margine e allergeni), tavoli,
 * prenotazioni per turno e servizi giornalieri. I coperti e gli incassi dei
 * servizi derivano dalla serie giornaliera, così tornano col Conto economico.
 */
import { addDays, format, parseISO } from 'date-fns'
import { config } from '../config'
import type {
  ArticoloMagazzino,
  Allergene,
  CategoriaPiatto,
  Piatto,
  SezioneMenu,
  PrenotazioneRistorante,
  ServizioRistoranteGiorno,
  StatoPrenotazione,
  Tavolo,
  Turno,
} from '../types'
import { traduzioniSeed, traduzioniSezioneSeed } from '@/lib/menuLingue'
import { creaRng, intero, scegli, scegliPesato, forse, type Rng } from './_rng'
import { giorni } from './giornaliero'

interface DefP {
  nome: string
  categoria: CategoriaPiatto
  prezzo: number
  fc: number // food cost €
  all: Allergene[]
}
// Menu reale del Lido dei Pini (Menù del proprietario, restaurantguru). Food cost e allergeni stimati.
const menuDef: DefP[] = [
  // Antipasti
  { nome: 'Flan di zucchine, fiore croccante e crema al grana', categoria: 'antipasti', prezzo: 14, fc: 4.2, all: ['latte', 'uova', 'glutine'] },
  { nome: 'Tartare di fassona con stracciatella affumicata e pesto', categoria: 'antipasti', prezzo: 18, fc: 6.8, all: ['latte', 'frutta_guscio'] },
  { nome: 'Guazzetto di mare', categoria: 'antipasti', prezzo: 18, fc: 6.9, all: ['pesce', 'molluschi', 'crostacei'] },
  { nome: 'Frittino del contadino', categoria: 'antipasti', prezzo: 16, fc: 4.8, all: ['glutine', 'uova'] },
  { nome: 'Tartare di tonno al naturale', categoria: 'antipasti', prezzo: 18, fc: 7.2, all: ['pesce'] },
  { nome: 'Duetto di acciughe e verdurine', categoria: 'antipasti', prezzo: 16, fc: 5.0, all: ['pesce', 'glutine'] },
  // Primi
  { nome: 'Penne con porri e salsiccia', categoria: 'primi', prezzo: 14, fc: 3.6, all: ['glutine'] },
  { nome: 'Gnocchi di patate con crema di gorgonzola e gherigli di noci', categoria: 'primi', prezzo: 16, fc: 4.3, all: ['glutine', 'latte', 'frutta_guscio'] },
  { nome: 'Spaghetto Lido', categoria: 'primi', prezzo: 20, fc: 7.4, all: ['glutine', 'molluschi', 'crostacei'] },
  { nome: 'Tagliatelle al ragù di fassona piemontese', categoria: 'primi', prezzo: 16, fc: 5.0, all: ['glutine', 'uova', 'sedano'] },
  { nome: 'Cappellacci bianchi e neri al profumo di mare', categoria: 'primi', prezzo: 20, fc: 7.0, all: ['glutine', 'uova', 'pesce', 'molluschi'] },
  { nome: 'Tagliatelle al nero di seppia, tartare di gambero e stracciatella affumicata', categoria: 'primi', prezzo: 20, fc: 7.6, all: ['glutine', 'uova', 'molluschi', 'crostacei', 'latte'] },
  // Secondi
  { nome: 'Orata alla griglia', categoria: 'secondi', prezzo: 22, fc: 8.4, all: ['pesce'] },
  { nome: 'Fritto royale', categoria: 'secondi', prezzo: 45, fc: 17.5, all: ['pesce', 'molluschi', 'crostacei', 'glutine'] },
  { nome: 'Trancio di spada alla griglia con aromi di Provenza', categoria: 'secondi', prezzo: 20, fc: 7.8, all: ['pesce'] },
  { nome: 'Filetto di fassona con burro aromatizzato alle erbe liguri', categoria: 'secondi', prezzo: 24, fc: 10.2, all: ['latte'] },
  // Grigliata di carne del lido
  { nome: "Tagliata di fassona spadellata con burro aromatizzato e salsa di soia (all'etto)", categoria: 'grigliata', prezzo: 7, fc: 2.9, all: ['latte', 'soia'] },
  { nome: 'Costine di maiale, coppa di vitello, pollo e arrosticini', categoria: 'grigliata', prezzo: 22, fc: 8.6, all: [] },
  // I nostri dolci
  { nome: "Colomba pasquale con crema al latte all'arancia", categoria: 'dolci', prezzo: 8, fc: 2.2, all: ['glutine', 'uova', 'latte'] },
  { nome: 'Pavlova con frutti di bosco freschi', categoria: 'dolci', prezzo: 8, fc: 2.4, all: ['uova'] },
  { nome: 'Bunetto al cioccolato e amaretto di Saronno', categoria: 'dolci', prezzo: 8, fc: 1.9, all: ['uova', 'latte', 'frutta_guscio'] },
  { nome: 'Pastiera napoletana al cioccolato', categoria: 'dolci', prezzo: 8, fc: 2.1, all: ['glutine', 'uova', 'latte'] },
  { nome: 'Panna cotta ai frutti di bosco con meringa alla mandorla', categoria: 'dolci', prezzo: 8, fc: 2.0, all: ['latte', 'uova', 'frutta_guscio'] },
  { nome: 'Crostatina con panna cotta ai mirtilli', categoria: 'dolci', prezzo: 8, fc: 2.0, all: ['glutine', 'uova', 'latte'] },
  { nome: 'Gelato al fior di latte con Chartreuse francese', categoria: 'dolci', prezzo: 8, fc: 1.8, all: ['latte'] },
  // Bevande (dimostrative)
  { nome: 'Acqua minerale 1L', categoria: 'bevande', prezzo: 3, fc: 0.5, all: [] },
  { nome: 'Vino della casa (calice)', categoria: 'bevande', prezzo: 5, fc: 1.2, all: [] },
  { nome: 'Vino della casa (bottiglia)', categoria: 'bevande', prezzo: 16, fc: 5.0, all: [] },
  { nome: 'Birra artigianale', categoria: 'bevande', prezzo: 5, fc: 1.6, all: ['glutine'] },
  { nome: 'Caffè', categoria: 'bevande', prezzo: 1.5, fc: 0.3, all: [] },
]

const popolarita: Record<string, number> = {
  antipasti: 3, primi: 5, secondi: 4, grigliata: 4, dolci: 3, bevande: 6,
}

/** Sezioni iniziali del menu (modificabili: rinomina, ordina, aggiungi, elimina). */
export const sezioniMenu: SezioneMenu[] = [
  { id: 'antipasti', nome: 'Antipasti' },
  { id: 'primi', nome: 'Primi' },
  { id: 'secondi', nome: 'Secondi' },
  { id: 'grigliata', nome: 'Grigliata di carne del lido' },
  { id: 'dolci', nome: 'I nostri dolci' },
  { id: 'bevande', nome: 'Bevande' },
].map((s) => ({ ...s, traduzioni: traduzioniSezioneSeed(s.id) }))

function costruisciMenu(rng: Rng): Piatto[] {
  return menuDef.map((d, i) => ({
    id: `P-${String(i + 1).padStart(3, '0')}`,
    nome: d.nome,
    categoria: d.categoria,
    prezzo: d.prezzo,
    foodCost: d.fc,
    allergeni: d.all,
    vendutiStagione: Math.round(intero(rng, 60, 900) * ((popolarita[d.categoria] ?? 3) / 5)),
    traduzioni: traduzioniSeed(d.nome),
  }))
}

export const menu: Piatto[] = costruisciMenu(creaRng(3636))

// Planimetria iniziale (in %): Veranda (sx in alto, 2 file da 4), Interno (sx in basso), Ciringuito (dx, 3 file da 2).
export const tavoli: Tavolo[] = Array.from({ length: 18 }, (_, i) => {
  const zona = i < 8 ? 'veranda' : i < 12 ? 'interno' : 'ciringuito'
  const [x, y] = zona === 'veranda' ? [9 + (i % 4) * 11, 22 + Math.floor(i / 4) * 26]
    : zona === 'interno' ? [9 + (i - 8) * 11, 86]
    : [64 + ((i - 12) % 2) * 22, 22 + Math.floor((i - 12) / 2) * 28]
  return {
    id: `TAV-${String(i + 1).padStart(2, '0')}`,
    numero: i + 1,
    posti: i % 4 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
    zona,
    x,
    y,
    forma: i % 4 === 0 ? 'quadrato' : 'tondo',
  } as Tavolo
})

/** Magazzino cucina (quantità dimostrative). */
export const magazzino: ArticoloMagazzino[] = ([
  ['Pescato del giorno', 'pesce', 'kg', 8, 5, 18, 'Mercato ittico Savona'],
  ['Gamberoni', 'pesce', 'kg', 3, 4, 32, 'Mercato ittico Savona'],
  ['Scampi', 'pesce', 'kg', 2.5, 2, 38, 'Mercato ittico Savona'],
  ['Calamari', 'pesce', 'kg', 6, 4, 16, 'Mercato ittico Savona'],
  ['Cozze', 'pesce', 'kg', 10, 6, 4.5, 'Mercato ittico Savona'],
  ['Vongole', 'pesce', 'kg', 4, 3, 12, 'Mercato ittico Savona'],
  ['Manzo (controfiletto)', 'carne', 'kg', 5, 3, 28, 'Macelleria Rossi'],
  ['Pomodorini', 'verdura', 'kg', 7, 4, 3.2, 'Ortofrutta Riviera'],
  ['Limoni', 'verdura', 'kg', 2, 3, 2.5, 'Ortofrutta Riviera'],
  ['Basilico', 'verdura', 'pz', 12, 10, 0.8, 'Ortofrutta Riviera'],
  ['Ricotta fresca', 'latticini', 'kg', 2, 2, 7, 'Caseificio Val Bormida'],
  ['Mozzarella', 'latticini', 'kg', 9, 6, 8.5, 'Caseificio Val Bormida'],
  ['Pasta secca', 'secco', 'kg', 25, 15, 2.2, 'Pastificio ligure'],
  ['Farina 00', 'secco', 'kg', 40, 20, 0.9, 'Molino'],
  ['Olio extravergine', 'secco', 'l', 12, 8, 9, 'Frantoio Taggiasco'],
  ['Olive taggiasche', 'secco', 'kg', 1.5, 2, 14, 'Frantoio Taggiasco'],
  ['Vino della casa', 'bevande', 'l', 60, 30, 3.5, 'Cantina locale'],
  ['Birra artigianale', 'bevande', 'pz', 48, 36, 1.8, 'Birrificio ligure'],
] as const).map(([nome, categoria, unita, quantita, scortaMinima, costoUnitario, fornitore], i) => ({
  id: `MAG-${String(i + 1).padStart(2, '0')}`, nome, categoria, unita, quantita, scortaMinima, costoUnitario, fornitore,
}))

// — Servizi giornalieri (coperti e incasso dalla serie giornaliera) —
export const serviziRistorante: ServizioRistoranteGiorno[] = giorni.flatMap((g) => {
  const incPranzo = Math.round(g.incassoRistorante * 0.4)
  const incCena = g.incassoRistorante - incPranzo
  const mk = (turno: Turno, coperti: number, incasso: number): ServizioRistoranteGiorno => ({
    data: g.data,
    turno,
    coperti,
    incasso,
    scontrinoMedio: coperti > 0 ? Math.round((incasso / coperti) * 100) / 100 : 0,
  })
  return [mk('pranzo', g.copertiPranzo, incPranzo), mk('cena', g.copertiCena, incCena)]
})

// — Prenotazioni (oggi e prossimi giorni) —
const nomiPren = [
  'Fam. Rossi', 'Bianchi', 'Sig. Ferrari', 'Gruppo Conti', 'Esposito', 'Fam. Greco',
  'Marino', 'Sig.ra Villa', 'Ricci', 'Fam. Costa', 'Lombardi', 'Fam. De Luca',
]
const orariSeed: Record<Turno, string[]> = {
  pranzo: ['12:15', '12:30', '12:45', '13:00', '13:30'],
  cena: ['19:30', '19:45', '20:00', '20:15', '20:30', '20:45', '21:00', '21:15'],
}

function costruisciPrenotazioni(rng: Rng): PrenotazioneRistorante[] {
  const out: PrenotazioneRistorante[] = []
  const oggi = parseISO(config.stagione.oggi)
  let n = 0
  const statoPesi: StatoPrenotazione[] = ['confermata', 'in_attesa', 'annullata']
  for (let giorno = 0; giorno < 5; giorno++) {
    const data = format(addDays(oggi, giorno), 'yyyy-MM-dd')
    for (const turno of ['pranzo', 'cena'] as Turno[]) {
      const quante = turno === 'cena' ? intero(rng, 4, 8) : intero(rng, 2, 5)
      for (let k = 0; k < quante; k++) {
        n++
        const tav = scegli(rng, tavoli)
        out.push({
          id: `PR-${String(n).padStart(3, '0')}`,
          data,
          turno,
          ora: orariSeed[turno][k % orariSeed[turno].length],
          nome: scegli(rng, nomiPren),
          coperti: intero(rng, 2, tav.posti),
          tavoloId: forse(rng, 0.7) ? tav.id : undefined,
          stato: scegliPesato(rng, statoPesi, [80, 15, 5]),
          note: forse(rng, 0.2) ? scegli(rng, ['Tavolo vista mare', 'Seggiolone per bimbo', 'Allergia crostacei', 'Anniversario']) : undefined,
        })
      }
    }
  }
  return out
}

export const prenotazioniRistorante: PrenotazioneRistorante[] = costruisciPrenotazioni(creaRng(4646))
