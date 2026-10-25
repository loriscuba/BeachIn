/**
 * Bar: ~60 articoli con margine e giacenza, vendite giornaliere (derivate dalla
 * serie giornaliera, così l'incasso bar coincide col Cruscotto e il Conto
 * economico) e conti aperti per ombrellone.
 */
import type { ArticoloBar, CategoriaBar, SezioneBar, ContoOmbrellone, RigaConto, VenditaBarGiorno } from '../types'
import { creaRng, intero, scegli, arrotonda, forse, type Rng } from './_rng'
import { giorni, dettaglioBarGiorno } from './giornaliero'
import { postazioni } from './spiaggia'

/** Foto del listino (Unsplash, libere): si cambiano da Bar → Listino. */
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=600&q=70`
export const fotoBar: Record<string, string> = {
  'Caffè espresso': u('1485808191679-5f86510681a2'),
  'Caffè macchiato': u('1563090308-5a7889e40542'),
  'Cappuccino': u('1770448993107-81c89c28f84b'),
  'Caffè shakerato': u('1577594412934-9b28db62ce6a'),
  'Tè freddo pesca': u('1676693420436-7fa448f054eb'),
  'Tè freddo limone': u('1758705206938-a196ac3ae3bb'),
  'Cornetto': u('1623334044303-241021148842'),
  'Brioche alla crema': u('1786426119462-380a67b9d838'),
  "Spremuta d'arancia": u('1600271886742-f049cd451bba'),
  'Caffè ginseng': u('1595434091143-b375ced5fe5c'),
  'Acqua naturale 0,5L': u('1762681206108-ce20fc3cf7c2'),
  'Acqua frizzante 0,5L': u('1613639119901-da64d78fe61f'),
  'Coca-Cola': u('1574706226623-e5cc0da928c6'),
  'Coca-Cola Zero': u('1543253687-c931c8e01820'),
  'Fanta': u('1624517452488-04869289c4ca'),
  'Sprite': u('1557746534-7e6ca4397ff5'),
  'Chinotto': u('1636144832475-0d81f893354d'),
  'Estathé': u('1601390395693-364c0e22031a'),
  'Red Bull': u('1613218222876-954978a4404e'),
  'Birra piccola': u('1608270586620-248524c67de9'),
  'Birra media': u('1758380742009-163a0deee80e'),
  'Birra artigianale': u('1632173517757-1e87c79de596'),
  'Corona': u('1543328919-d1c63a7e836a'),
  'Ichnusa non filtrata': u('1709010454595-1e8328c9f3c3'),
  'Moretti': u('1639996889453-f95e871c1df6'),
  'Heineken': u('1649628194010-ef5d798ae701'),
  'Radler': u('1676408364951-fe1541a47366'),
  'Spritz Aperol': u('1564090654281-eb1db56d15fc'),
  'Spritz Campari': u('1570598912132-0ba1dc952b7d'),
  'Negroni': u('1764712999736-761be7a71c43'),
  'Americano': u('1654677608880-51f63b5dee97'),
  'Mojito': u('1778104959714-f9e729a9c5de'),
  'Gin Tonic': u('1623408859815-22534357b3db'),
  'Hugo': u('1709195658489-5a14884e307d'),
  'Piña Colada': u('1607644536940-6c300b5784c5'),
  'Cocktail analcolico': u('1654074517750-f854f7c27d62'),
  'Cono 2 gusti': u('1691200324934-d1fca4986671'),
  'Cono 3 gusti': u('1564021345996-c4d4e8ac84b8'),
  'Coppetta': u('1650553448920-9432f8086905'),
  'Ghiacciolo': u('1561588012-17a0e1119c0e'),
  'Magnum': u('1594305178909-03ab72b8205e'),
  'Cornetto Algida': u('1787307320279-75d6d58c0748'),
  'Affogato al caffè': u('1594631661960-34762327295a'),
  'Patatine': u('1528751014936-863e6e7a319c'),
  'Granita': u('1749542120098-dbb1f36e1577'),
  'Arachidi': u('1646123424528-a3cfebda0351'),
  'Toast': u('1647505794572-0a6d945d664d'),
  'Focaccia': u('1767065886275-2a8ff2eaa13a'),
  'Tramezzino': u('1785064138041-19295508d398'),
  'Pop corn': u('1691480213129-106b2c7d1ee8'),
  'Piadina': u('1752095809096-f09d22c466c5'),
  'Piadina crudo e squacquerone': u('1646530208887-8a791bff4701'),
  'Panino porchetta': u('1788875810951-9de7b2e27876'),
  'Insalatona': u('1626451542138-1f86835340ec'),
  'Caprese': u('1769458313937-b5ad8f84942e'),
  'Primo del giorno': u('1775634018153-51e9884dbf7c'),
  'Fritto misto': u('1682264895449-f75b342cbab6'),
  'Poke bowl': u('1768326119213-e0ad875083a3'),
  'Hamburger': u('1550949987-440138d6550e'),
  'Club sandwich': u('1553909489-cd47e0907980'),
}

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
        foto: fotoBar[it.nome],
      })
    }
  }
  return out
}

export const articoliBar: ArticoloBar[] = costruisciArticoli(creaRng(1717))

const nomiSezione: Record<string, string> = {
  caffetteria: 'Caffetteria', bibite: 'Bibite', birre: 'Birre', cocktail: 'Cocktail', gelati: 'Gelati', snack: 'Snack', gastronomia: 'Gastronomia',
}
/** Categorie iniziali del listino bar (poi modificabili). */
export const sezioniBar: SezioneBar[] = listino.map((g) => ({ id: g.categoria, nome: nomiSezione[g.categoria] ?? g.categoria }))

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
