/**
 * Bar: ~60 articoli con margine e giacenza, vendite giornaliere (derivate dalla
 * serie giornaliera, così l'incasso bar coincide col Cruscotto e il Conto
 * economico) e conti aperti per ombrellone.
 */
import type { ArticoloBar, CategoriaBar, ContoOmbrellone, RigaConto, VenditaBarGiorno } from '../types'
import { creaRng, intero, scegli, arrotonda, forse, type Rng } from './_rng'
import { giorni, dettaglioBarGiorno } from './giornaliero'
import { postazioni } from './spiaggia'

interface Def {
  nome: string
  prezzo: number
}
const listino: { categoria: CategoriaBar; costo: number; soglia: number; items: Def[] }[] = [
  {
    categoria: 'caffetteria', costo: 0.22, soglia: 40,
    items: [
      { nome: 'Caffè espresso', prezzo: 1.2 }, { nome: 'Caffè macchiato', prezzo: 1.4 },
      { nome: 'Cappuccino', prezzo: 1.8 }, { nome: 'Caffè shakerato', prezzo: 3.5 },
      { nome: 'Tè freddo pesca', prezzo: 3 }, { nome: 'Tè freddo limone', prezzo: 3 },
      { nome: 'Cornetto', prezzo: 1.5 }, { nome: 'Brioche alla crema', prezzo: 1.8 },
      { nome: "Spremuta d'arancia", prezzo: 4 }, { nome: 'Caffè ginseng', prezzo: 1.6 },
    ],
  },
  {
    categoria: 'bibite', costo: 0.35, soglia: 60,
    items: [
      { nome: 'Acqua naturale 0,5L', prezzo: 1.5 }, { nome: 'Acqua frizzante 0,5L', prezzo: 1.5 },
      { nome: 'Coca-Cola', prezzo: 3 }, { nome: 'Coca-Cola Zero', prezzo: 3 },
      { nome: 'Fanta', prezzo: 3 }, { nome: 'Sprite', prezzo: 3 },
      { nome: 'Chinotto', prezzo: 3.2 }, { nome: 'Estathé', prezzo: 2.5 }, { nome: 'Red Bull', prezzo: 4.5 },
    ],
  },
  {
    categoria: 'birre', costo: 0.4, soglia: 48,
    items: [
      { nome: 'Birra piccola', prezzo: 3.5 }, { nome: 'Birra media', prezzo: 5 },
      { nome: 'Birra artigianale', prezzo: 6 }, { nome: 'Corona', prezzo: 5 },
      { nome: 'Ichnusa non filtrata', prezzo: 5 }, { nome: 'Moretti', prezzo: 4 },
      { nome: 'Heineken', prezzo: 4.5 }, { nome: 'Radler', prezzo: 4.5 },
    ],
  },
  {
    categoria: 'cocktail', costo: 0.28, soglia: 30,
    items: [
      { nome: 'Spritz Aperol', prezzo: 6 }, { nome: 'Spritz Campari', prezzo: 6 },
      { nome: 'Negroni', prezzo: 7 }, { nome: 'Mojito', prezzo: 7 },
      { nome: 'Gin Tonic', prezzo: 7 }, { nome: 'Americano', prezzo: 6.5 },
      { nome: 'Hugo', prezzo: 6 }, { nome: 'Piña Colada', prezzo: 7.5 }, { nome: 'Cocktail analcolico', prezzo: 5 },
    ],
  },
  {
    categoria: 'gelati', costo: 0.38, soglia: 50,
    items: [
      { nome: 'Cono 2 gusti', prezzo: 2.8 }, { nome: 'Cono 3 gusti', prezzo: 3.5 },
      { nome: 'Coppetta', prezzo: 3 }, { nome: 'Ghiacciolo', prezzo: 1.5 },
      { nome: 'Magnum', prezzo: 3 }, { nome: 'Cornetto Algida', prezzo: 2.5 },
      { nome: 'Granita', prezzo: 3.5 }, { nome: 'Affogato al caffè', prezzo: 4 },
    ],
  },
  {
    categoria: 'snack', costo: 0.33, soglia: 45,
    items: [
      { nome: 'Patatine', prezzo: 2.5 }, { nome: 'Arachidi', prezzo: 2 },
      { nome: 'Toast', prezzo: 4 }, { nome: 'Piadina', prezzo: 5.5 },
      { nome: 'Focaccia', prezzo: 3.5 }, { nome: 'Tramezzino', prezzo: 3.5 },
      { nome: 'Panino porchetta', prezzo: 6 }, { nome: 'Pop corn', prezzo: 2.5 },
    ],
  },
  {
    categoria: 'gastronomia', costo: 0.42, soglia: 35,
    items: [
      { nome: 'Insalatona', prezzo: 8.5 }, { nome: 'Caprese', prezzo: 7 },
      { nome: 'Primo del giorno', prezzo: 9 }, { nome: 'Fritto misto', prezzo: 12 },
      { nome: 'Poke bowl', prezzo: 10 }, { nome: 'Piadina crudo e squacquerone', prezzo: 7.5 },
      { nome: 'Hamburger', prezzo: 11 }, { nome: 'Club sandwich', prezzo: 9 },
    ],
  },
]

function costruisciArticoli(rng: Rng): ArticoloBar[] {
  const out: ArticoloBar[] = []
  let n = 0
  for (const gruppo of listino) {
    for (const it of gruppo.items) {
      n++
      const costoAcquisto = arrotonda(it.prezzo * gruppo.costo, 0.05)
      // qualche articolo sotto soglia, per far scattare gli alert scorte
      const sottoSoglia = forse(rng, 0.14)
      const giacenza = sottoSoglia
        ? intero(rng, 2, Math.max(3, Math.round(gruppo.soglia * 0.6)))
        : intero(rng, gruppo.soglia, gruppo.soglia * 4)
      out.push({
        id: `B-${String(n).padStart(3, '0')}`,
        nome: it.nome,
        categoria: gruppo.categoria,
        prezzoVendita: it.prezzo,
        costoAcquisto,
        giacenza,
        sogliaRiordino: gruppo.soglia,
        unita: 'pz',
      })
    }
  }
  return out
}

export const articoliBar: ArticoloBar[] = costruisciArticoli(creaRng(1717))

// — Vendite giornaliere (dalla serie giornaliera) —
export const venditeBar: VenditaBarGiorno[] = giorni.map((g) => {
  const d = dettaglioBarGiorno(g)
  return {
    data: g.data,
    incasso: g.incassoBar,
    costoMerce: d.costoMerce,
    numScontrini: d.numScontrini,
    scontrinoMedio: g.scontrinoMedioBar,
    perCategoria: d.perCategoria,
    perFascia: d.perFascia,
  }
})

// — Conti aperti per ombrellone (postazioni occupate/stagionali) —
function costruisciConti(rng: Rng): ContoOmbrellone[] {
  const candidate = postazioni.filter(
    (p) => p.stato === 'occupata' || p.stato === 'stagionale'
  )
  const conti: ContoOmbrellone[] = []
  let n = 0
  for (const p of candidate) {
    if (!forse(rng, 0.14)) continue // ~14% ha un conto aperto adesso
    n++
    const nRighe = intero(rng, 1, 5)
    const righe: RigaConto[] = []
    for (let k = 0; k < nRighe; k++) {
      const art = scegli(rng, articoliBar)
      righe.push({
        articoloId: art.id,
        nome: art.nome,
        quantita: intero(rng, 1, 3),
        prezzoUnitario: art.prezzoVendita,
        ora: `${String(intero(rng, 9, 18)).padStart(2, '0')}:${scegli(rng, ['05', '15', '30', '45'])}`,
      })
    }
    conti.push({
      id: `CO-${String(n).padStart(3, '0')}`,
      postazioneId: p.id,
      clienteId: p.clienteId,
      aperto: true,
      apertoIl: '2026-07-15',
      righe,
    })
  }
  return conti
}

export const contiOmbrellone: ContoOmbrellone[] = costruisciConti(creaRng(2929))
