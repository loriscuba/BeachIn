/**
 * Listino postazioni (matrice periodo × fila × tipologia × durata) + tariffe
 * accessorie e sconti. Prezzi deterministici da una formula: la prima fila
 * costa di più e si scende verso il fondo; i periodi alzano il prezzo.
 */
import { config } from '../config'
import type {
  Durata,
  FilaId,
  Periodo,
  TariffaAccessoria,
  TipologiaPostazione,
  VoceTariffa,
} from '../types'
import { creaRng, arrotonda, forse, type Rng } from './_rng'

const file = config.arenile.file as readonly FilaId[]
const periodi: Periodo[] = ['bassa', 'media', 'alta', 'altissima']
const durate: Durata[] = [
  'giornaliera',
  'mezza_giornata',
  'settimanale',
  'quindicinale',
  'mensile',
  'stagionale',
]

const moltPeriodo: Record<Periodo, number> = { bassa: 0.8, media: 1.0, alta: 1.25, altissima: 1.5 }
const moltTipologia: Record<TipologiaPostazione, number> = {
  ombrellone_2_lettini: 1.0,
  ombrellone_2_sdraio: 0.92,
  ombrellone_lettino_sdraio: 0.96,
  gazebo: 1.7,
  tenda: 0.7,
}
// giornaliera=1; le altre durate scalano con uno sconto sul multiplo
const moltDurata: Record<Durata, number> = {
  giornaliera: 1,
  mezza_giornata: 0.6,
  settimanale: 6,
  quindicinale: 11,
  mensile: 20,
  stagionale: 78,
}
const finestraPeriodo: Record<Periodo, [string, string]> = {
  bassa: ['2026-05-01', '2026-05-31'],
  media: ['2026-06-01', '2026-06-30'],
  alta: ['2026-07-01', '2026-07-31'],
  altissima: ['2026-08-01', '2026-08-31'],
}

function baseGiornaliera(fila: FilaId): number {
  return 42 - file.indexOf(fila) * 2.5 // A ~42 → I ~22
}

function combosValide(): { fila: FilaId; tip: TipologiaPostazione }[] {
  const out: { fila: FilaId; tip: TipologiaPostazione }[] = []
  const ombrelloni: TipologiaPostazione[] = [
    'ombrellone_2_lettini',
    'ombrellone_2_sdraio',
    'ombrellone_lettino_sdraio',
  ]
  for (const fila of file) {
    for (const tip of ombrelloni) out.push({ fila, tip })
    if (fila === 'A') out.push({ fila, tip: 'gazebo' })
    if (fila === 'I') out.push({ fila, tip: 'tenda' })
  }
  return out
}

function costruisci(rng: Rng): VoceTariffa[] {
  const voci: VoceTariffa[] = []
  let n = 0
  for (const periodo of periodi) {
    const [dal, al] = finestraPeriodo[periodo]
    for (const { fila, tip } of combosValide()) {
      for (const durata of durate) {
        n++
        const prezzo = arrotonda(
          baseGiornaliera(fila) * moltPeriodo[periodo] * moltTipologia[tip] * moltDurata[durata],
          durata === 'giornaliera' || durata === 'mezza_giornata' ? 1 : 5
        )
        // qualche voce ancora in bozza (aggiornamenti non pubblicati)
        const stato = periodo === 'altissima' && forse(rng, 0.15) ? 'bozza' : 'pubblicato'
        voci.push({
          id: `T-${String(n).padStart(4, '0')}`,
          periodo,
          fila,
          tipologia: tip,
          durata,
          prezzo,
          validaDal: dal,
          validaAl: al,
          stato,
        })
      }
    }
  }
  return voci
}

export const tariffe: VoceTariffa[] = costruisci(creaRng(555))

export const tariffeAccessorie: TariffaAccessoria[] = [
  { id: 'A-01', nome: 'Ingresso singolo (senza postazione)', categoria: 'ingresso', prezzo: 8, unita: 'al giorno', stato: 'pubblicato' },
  { id: 'A-02', nome: 'Ingresso bambino (3–10 anni)', categoria: 'ingresso', prezzo: 5, unita: 'al giorno', stato: 'pubblicato' },
  { id: 'A-03', nome: 'Cabina', categoria: 'servizi', prezzo: 12, unita: 'al giorno', stato: 'pubblicato' },
  { id: 'A-04', nome: 'Cabina stagionale', categoria: 'servizi', prezzo: 620, unita: 'a stagione', stato: 'pubblicato' },
  { id: 'A-05', nome: 'Armadietto', categoria: 'servizi', prezzo: 6, unita: 'al giorno', stato: 'pubblicato' },
  { id: 'A-06', nome: 'Doccia calda', categoria: 'servizi', prezzo: 2, unita: 'a gettone', stato: 'pubblicato' },
  { id: 'A-07', nome: 'Noleggio telo', categoria: 'servizi', prezzo: 4, unita: 'al giorno', stato: 'pubblicato' },
  { id: 'A-08', nome: 'Cassaforte', categoria: 'servizi', prezzo: 3, unita: 'al giorno', stato: 'pubblicato' },
  { id: 'A-09', nome: 'Noleggio SUP', categoria: 'noleggio', prezzo: 15, unita: "all'ora", stato: 'pubblicato' },
  { id: 'A-10', nome: 'Noleggio pedalò', categoria: 'noleggio', prezzo: 18, unita: "all'ora", stato: 'pubblicato' },
  { id: 'A-11', nome: 'Noleggio canoa', categoria: 'noleggio', prezzo: 12, unita: "all'ora", stato: 'pubblicato' },
  { id: 'A-12', nome: 'Noleggio kayak', categoria: 'noleggio', prezzo: 14, unita: "all'ora", stato: 'pubblicato' },
  { id: 'A-13', nome: 'Parcheggio riservato', categoria: 'parcheggio', prezzo: 10, unita: 'al giorno', stato: 'pubblicato' },
  { id: 'A-14', nome: 'Sconto bambini', categoria: 'sconto', prezzo: 30, percentuale: true, unita: 'sulla postazione', stato: 'pubblicato' },
  { id: 'A-15', nome: 'Sconto over 65', categoria: 'sconto', prezzo: 15, percentuale: true, unita: 'sulla postazione', stato: 'pubblicato' },
  { id: 'A-16', nome: 'Convenzione aziendale', categoria: 'sconto', prezzo: 20, percentuale: true, unita: 'sulla postazione', stato: 'bozza' },
]
