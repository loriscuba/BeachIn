/**
 * Ristorante: menù (~35 piatti con food cost, margine e allergeni), tavoli,
 * prenotazioni per turno e servizi giornalieri. I coperti e gli incassi dei
 * servizi derivano dalla serie giornaliera, così tornano col Conto economico.
 */
import { addDays, format, parseISO } from 'date-fns'
import { config } from '../config'
import type {
  Allergene,
  CategoriaPiatto,
  Piatto,
  PrenotazioneRistorante,
  ServizioRistoranteGiorno,
  StatoPrenotazione,
  Tavolo,
  Turno,
} from '../types'
import { creaRng, intero, scegli, scegliPesato, forse, type Rng } from './_rng'
import { giorni } from './giornaliero'

interface DefP {
  nome: string
  categoria: CategoriaPiatto
  prezzo: number
  fc: number // food cost €
  all: Allergene[]
}
const menuDef: DefP[] = [
  // Antipasti
  { nome: 'Antipasto di mare', categoria: 'antipasti', prezzo: 16, fc: 6.4, all: ['pesce', 'molluschi', 'crostacei'] },
  { nome: 'Cozze alla marinara', categoria: 'antipasti', prezzo: 12, fc: 4.2, all: ['molluschi'] },
  { nome: 'Insalata di polpo', categoria: 'antipasti', prezzo: 14, fc: 5.6, all: ['molluschi', 'sedano'] },
  { nome: 'Tartare di tonno', categoria: 'antipasti', prezzo: 15, fc: 6.8, all: ['pesce'] },
  { nome: 'Bruschette miste', categoria: 'antipasti', prezzo: 8, fc: 2.1, all: ['glutine'] },
  // Primi
  { nome: 'Spaghetti alle vongole', categoria: 'primi', prezzo: 15, fc: 5.2, all: ['glutine', 'molluschi'] },
  { nome: 'Risotto alla pescatora', categoria: 'primi', prezzo: 16, fc: 6.0, all: ['molluschi', 'crostacei'] },
  { nome: 'Paccheri astice', categoria: 'primi', prezzo: 22, fc: 9.5, all: ['glutine', 'crostacei'] },
  { nome: 'Trofie al pesto', categoria: 'primi', prezzo: 12, fc: 3.0, all: ['glutine', 'latte', 'frutta_guscio'] },
  { nome: 'Gnocchi pomodoro e basilico', categoria: 'primi', prezzo: 11, fc: 2.6, all: ['glutine'] },
  { nome: 'Spaghetti allo scoglio', categoria: 'primi', prezzo: 18, fc: 7.2, all: ['glutine', 'molluschi', 'crostacei'] },
  // Secondi
  { nome: 'Frittura di paranza', categoria: 'secondi', prezzo: 18, fc: 7.0, all: ['pesce', 'glutine'] },
  { nome: 'Grigliata di pesce', categoria: 'secondi', prezzo: 24, fc: 10.5, all: ['pesce', 'crostacei'] },
  { nome: 'Branzino al forno', categoria: 'secondi', prezzo: 20, fc: 8.4, all: ['pesce'] },
  { nome: 'Tagliata di manzo', categoria: 'secondi', prezzo: 19, fc: 8.0, all: [] },
  { nome: 'Calamari fritti', categoria: 'secondi', prezzo: 16, fc: 6.2, all: ['molluschi', 'glutine'] },
  { nome: 'Pollo alla griglia', categoria: 'secondi', prezzo: 13, fc: 4.1, all: [] },
  // Contorni
  { nome: 'Insalata mista', categoria: 'contorni', prezzo: 5, fc: 1.2, all: [] },
  { nome: 'Patatine fritte', categoria: 'contorni', prezzo: 5, fc: 1.0, all: [] },
  { nome: 'Verdure grigliate', categoria: 'contorni', prezzo: 6, fc: 1.6, all: [] },
  // Pizze
  { nome: 'Pizza Margherita', categoria: 'pizze', prezzo: 8, fc: 2.0, all: ['glutine', 'latte'] },
  { nome: 'Pizza Marinara', categoria: 'pizze', prezzo: 7, fc: 1.6, all: ['glutine'] },
  { nome: 'Pizza Diavola', categoria: 'pizze', prezzo: 10, fc: 2.8, all: ['glutine', 'latte'] },
  { nome: 'Pizza Frutti di mare', categoria: 'pizze', prezzo: 12, fc: 4.2, all: ['glutine', 'molluschi', 'crostacei'] },
  { nome: 'Pizza Capricciosa', categoria: 'pizze', prezzo: 11, fc: 3.2, all: ['glutine', 'latte', 'uova'] },
  // Dolci
  { nome: 'Tiramisù', categoria: 'dolci', prezzo: 6, fc: 1.5, all: ['glutine', 'uova', 'latte'] },
  { nome: 'Panna cotta', categoria: 'dolci', prezzo: 5, fc: 1.1, all: ['latte'] },
  { nome: 'Macedonia', categoria: 'dolci', prezzo: 5, fc: 1.4, all: [] },
  { nome: 'Semifreddo al pistacchio', categoria: 'dolci', prezzo: 6, fc: 1.8, all: ['latte', 'frutta_guscio', 'uova'] },
  // Bevande
  { nome: 'Acqua minerale 1L', categoria: 'bevande', prezzo: 3, fc: 0.5, all: [] },
  { nome: 'Vino della casa (calice)', categoria: 'bevande', prezzo: 5, fc: 1.2, all: [] },
  { nome: 'Vino della casa (bottiglia)', categoria: 'bevande', prezzo: 16, fc: 5.0, all: [] },
  { nome: 'Birra media', categoria: 'bevande', prezzo: 5, fc: 1.6, all: ['glutine'] },
  { nome: 'Caffè', categoria: 'bevande', prezzo: 1.5, fc: 0.3, all: [] },
  { nome: 'Limoncello', categoria: 'bevande', prezzo: 4, fc: 0.9, all: [] },
]

const popolarita: Record<CategoriaPiatto, number> = {
  antipasti: 3, primi: 5, secondi: 4, contorni: 3, pizze: 5, dolci: 3, bevande: 6,
}

function costruisciMenu(rng: Rng): Piatto[] {
  return menuDef.map((d, i) => ({
    id: `P-${String(i + 1).padStart(3, '0')}`,
    nome: d.nome,
    categoria: d.categoria,
    prezzo: d.prezzo,
    foodCost: d.fc,
    allergeni: d.all,
    vendutiStagione: Math.round(intero(rng, 60, 900) * (popolarita[d.categoria] / 5)),
  }))
}

export const menu: Piatto[] = costruisciMenu(creaRng(3636))

export const tavoli: Tavolo[] = Array.from({ length: 18 }, (_, i) => {
  const zona = i < 8 ? 'veranda' : i < 13 ? 'sala' : 'terrazza'
  return {
    id: `TAV-${String(i + 1).padStart(2, '0')}`,
    numero: i + 1,
    posti: i % 4 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
    zona,
  } as Tavolo
})

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
