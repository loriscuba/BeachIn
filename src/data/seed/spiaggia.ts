/**
 * Arenile: 180 postazioni (9 file × 20), cabine, armadietti, docce, torrette.
 * Gli stati del giorno corrente sono coerenti con giornoOggi.postazioniOccupate:
 * la somma di occupata + stagionale + prenotata riproduce l'occupazione mostrata
 * ovunque (Cruscotto, Sito). I clienti stagionali vengono agganciati alle loro
 * postazioni leggendo il seed clienti.
 */
import { config } from '../config'
import type {
  Armadietto,
  Cabina,
  Doccia,
  FilaId,
  Postazione,
  StatoPostazione,
  StatoStruttura,
  TipologiaPostazione,
  Torretta,
} from '../types'
import { creaRng, intero, scegli, arrotonda, type Rng } from './_rng'
import { clienti } from './clienti'
import { giornoOggi } from './giornaliero'

const file = config.arenile.file as readonly FilaId[]
const perFila = config.arenile.postazioniPerFila

function id(fila: FilaId, n: number): string {
  return `${fila}-${String(n).padStart(2, '0')}`
}

// Tipologia deterministica in base a fila e numero
function tipologiaDi(fila: FilaId, n: number): TipologiaPostazione {
  if (fila === 'A' && n <= config.arenile.gazeboPrimaFila) return 'gazebo'
  if (fila === 'I' && n >= 15) return 'tenda'
  if (fila === 'A' || fila === 'B') return 'ombrellone_2_lettini'
  if (n % 3 === 0) return 'ombrellone_lettino_sdraio'
  if (n % 2 === 0) return 'ombrellone_2_sdraio'
  return 'ombrellone_2_lettini'
}

// Prezzo indicativo (giornaliero) per fila: la prima fila costa di più
function tariffaGiornaliera(fila: FilaId, tip: TipologiaPostazione): number {
  const indice = file.indexOf(fila)
  const base = 40 - indice * 2.5 // A ~40, I ~20
  const extra = tip === 'gazebo' ? 25 : tip === 'tenda' ? -4 : 0
  return arrotonda(base + extra, 1)
}
function tariffaStagionale(fila: FilaId, tip: TipologiaPostazione): number {
  const indice = file.indexOf(fila)
  const base = 3400 - indice * 130
  const extra = tip === 'gazebo' ? 1400 : 0
  return arrotonda(base + extra, 50)
}

function costruisci(rng: Rng): Postazione[] {
  const post: Postazione[] = []
  const clientePerPost = new Map(
    clienti.filter((c) => c.postazioneId).map((c) => [c.postazioneId!, c.id])
  )

  // 1) crea tutte le postazioni "libere" con tipologia e tariffa
  for (const fila of file) {
    for (let n = 1; n <= perFila; n++) {
      const tip = tipologiaDi(fila, n)
      post.push({
        id: id(fila, n),
        fila,
        numero: n,
        tipologia: tip,
        stato: 'libera',
        tariffaApplicata: tariffaGiornaliera(fila, tip),
      })
    }
  }

  const perId = new Map(post.map((p) => [p.id, p]))

  // 2) stagionali: A, B, C interamente assegnate ai clienti stagionali
  for (const [postId, clienteId] of clientePerPost) {
    const p = perId.get(postId)
    if (!p) continue
    p.stato = 'stagionale'
    p.clienteId = clienteId
    p.periodoDal = config.stagione.inizio
    p.periodoAl = config.stagione.fine
    p.tariffaApplicata = tariffaStagionale(p.fila, p.tipologia)
  }

  // 3) obiettivo del giorno: occupata + stagionale + prenotata = postazioniOccupate
  const stagionali = post.filter((p) => p.stato === 'stagionale').length
  const daVendere = Math.max(0, giornoOggi.postazioniOccupate - stagionali)
  const prenotate = Math.round(daVendere * 0.13)
  const occupate = daVendere - prenotate
  const fuoriServizio = 3

  // Postazioni ancora libere (file D..I), in ordine
  const disponibili = post.filter((p) => p.stato === 'libera')

  // clienti non stagionali senza postazione, per agganciare gli "occupata"
  const clientiVolanti = clienti
    .filter((c) => !c.postazioneId && c.tipologia !== 'occasionale')
    .map((c) => c.id)
  let ic = 0

  const assegna = (n: number, stato: StatoPostazione, conCliente: boolean) => {
    for (let k = 0; k < n && disponibili.length; k++) {
      const p = disponibili.shift()!
      p.stato = stato
      if (stato === 'occupata') {
        p.periodoDal = config.stagione.oggi
        p.periodoAl = config.stagione.oggi
      } else if (stato === 'prenotata') {
        p.periodoDal = config.stagione.oggi
        p.periodoAl = config.stagione.oggi
      }
      if (conCliente && clientiVolanti.length) {
        p.clienteId = clientiVolanti[ic % clientiVolanti.length]
        ic++
      }
      if (stato === 'fuori_servizio') {
        p.clienteId = undefined
        p.note = scegli(rng, [
          'Palo ombrellone da sostituire',
          'Lettino rotto, in riparazione',
          'Zona in manutenzione fino a domani',
        ])
      }
    }
  }

  // Distribuiti "a macchia" ma deterministici: mescoliamo l'ordine con l'rng
  for (let i = disponibili.length - 1; i > 0; i--) {
    const j = intero(rng, 0, i)
    ;[disponibili[i], disponibili[j]] = [disponibili[j], disponibili[i]]
  }

  assegna(fuoriServizio, 'fuori_servizio', false)
  assegna(occupate, 'occupata', true)
  assegna(prenotate, 'prenotata', false)
  // il resto resta 'libera'

  // riordina per fila/numero (l'ordine di rendering lo vuole ordinato)
  return post.sort((a, b) =>
    a.fila === b.fila ? a.numero - b.numero : file.indexOf(a.fila) - file.indexOf(b.fila)
  )
}

export const postazioni: Postazione[] = costruisci(creaRng(9090))

// — Strutture accessorie —

function struttura<T extends { id: string; numero: number; stato: StatoStruttura }>(
  prefisso: string,
  n: number,
  rng: Rng
): T[] {
  const out: T[] = []
  for (let i = 1; i <= n; i++) {
    const r = rng()
    const stato: StatoStruttura =
      r < 0.5 ? 'stagionale' : r < 0.75 ? 'occupata' : r < 0.92 ? 'libera' : 'manutenzione'
    out.push({ id: `${prefisso}-${String(i).padStart(2, '0')}`, numero: i, stato } as T)
  }
  return out
}

const rngStrutture = creaRng(1313)
export const cabine: Cabina[] = struttura<Cabina>('CAB', config.arenile.cabine, rngStrutture)
export const armadietti: Armadietto[] = struttura<Armadietto>(
  'ARM',
  config.arenile.armadietti,
  rngStrutture
)

export const docce: Doccia[] = Array.from({ length: config.arenile.docce }, (_, i) => ({
  id: `DOC-${String(i + 1).padStart(2, '0')}`,
  numero: i + 1,
  tipo: i < 2 ? 'calda' : 'fredda',
}))

export const torrette: Torretta[] = [
  { id: 'TOR-01', nome: 'Torretta Nord', fila: 'A' },
  { id: 'TOR-02', nome: 'Torretta Sud', fila: 'A' },
]
