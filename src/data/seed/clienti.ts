/**
 * ~220 anagrafiche clienti, deterministiche.
 * Ai clienti stagionali/periodici viene assegnata una postazione: spiaggia.ts
 * legge questa lista per marcare le postazioni "stagionale" con il cliente.
 */
import type { Cliente, FilaId, TipologiaCliente } from '../types'
import { creaRng, intero, reale, scegli, forse, arrotonda, type Rng } from './_rng'

const nomiM = [
  'Marco', 'Luca', 'Andrea', 'Giovanni', 'Francesco', 'Alessandro', 'Matteo', 'Lorenzo',
  'Davide', 'Stefano', 'Roberto', 'Simone', 'Paolo', 'Antonio', 'Giuseppe', 'Riccardo',
  'Federico', 'Michele', 'Gabriele', 'Nicola', 'Fabio', 'Emanuele', 'Daniele', 'Enrico',
]
const nomiF = [
  'Giulia', 'Sara', 'Chiara', 'Francesca', 'Martina', 'Alessia', 'Elena', 'Valentina',
  'Federica', 'Silvia', 'Anna', 'Laura', 'Elisa', 'Beatrice', 'Ilaria', 'Roberta',
  'Cristina', 'Marta', 'Serena', 'Paola', 'Claudia', 'Monica', 'Alice', 'Camilla',
]
const cognomi = [
  'Rossi', 'Bianchi', 'Ferrari', 'Russo', 'Romano', 'Gallo', 'Costa', 'Fontana',
  'Conti', 'Ricci', 'Bruno', 'Greco', 'De Luca', 'Mancini', 'Lombardi', 'Moretti',
  'Barbieri', 'Giordano', 'Rizzo', 'Colombo', 'Marino', 'Esposito', 'Bianco', 'Villa',
  'Serra', 'Ferrero', 'Vitale', 'Testa', 'Longo', 'Martini', 'Leone', 'Fabbri',
  'Caruso', 'Ferri', 'Pellegrini', 'Palumbo', 'Sanna', 'Farina', 'Rinaldi', 'Monti',
]

const note = [
  'Vuole sempre la fila B, vicino alla passerella',
  'Cliente storico, gli lasciamo il gazebo d’angolo',
  'Preferisce il fondo, più tranquillo per i bambini',
  'Paga a fine mese, tutto sul conto ombrellone',
  'Allergica al glutine, avvisare il ristorante',
  'Arriva sempre dopo Ferragosto',
  'Chiede la cabina 12 tutti gli anni',
  'Gruppo numeroso nei weekend',
  'Va di fretta la mattina, caffè al volo',
  'Ombrellone lontano dalla musica, per favore',
]

const distribuzione: { tipologia: TipologiaCliente; n: number; anniMax: number }[] = [
  { tipologia: 'stagionale', n: 60, anniMax: 22 },
  { tipologia: 'mensile', n: 25, anniMax: 12 },
  { tipologia: 'quindicinale', n: 15, anniMax: 9 },
  { tipologia: 'settimanale', n: 30, anniMax: 8 },
  { tipologia: 'giornaliero', n: 70, anniMax: 6 },
  { tipologia: 'occasionale', n: 20, anniMax: 3 },
]

const valorePer: Record<TipologiaCliente, [number, number]> = {
  stagionale: [2600, 4200],
  mensile: [900, 1500],
  quindicinale: [520, 820],
  settimanale: [260, 430],
  giornaliero: [120, 620],
  occasionale: [25, 95],
}

const file: FilaId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

function idPostazione(fila: FilaId, numero: number): string {
  return `${fila}-${String(numero).padStart(2, '0')}`
}

/**
 * Elenco ordinato delle postazioni assegnate ai clienti stagionali.
 * Occupa le prime file (più pregiate) scendendo: A e B intere, poi parte di C.
 * 60 postazioni: A(20) + B(20) + C(20) → tutte assegnate agli stagionali.
 */
function postazioniStagionali(): string[] {
  const lista: string[] = []
  for (const fila of ['A', 'B', 'C'] as FilaId[]) {
    for (let n = 1; n <= 20 && lista.length < 60; n++) lista.push(idPostazione(fila, n))
  }
  return lista
}

function telefono(rng: Rng): string {
  const prefissi = ['320', '333', '347', '348', '349', '340', '328', '338', '366', '389']
  return `${scegli(rng, prefissi)} ${intero(rng, 100, 999)}${intero(rng, 1000, 9999)}`
}

function costruisci(rng: Rng): Cliente[] {
  const clienti: Cliente[] = []
  const postStag = postazioniStagionali()
  let n = 0
  let iStag = 0

  for (const gruppo of distribuzione) {
    for (let k = 0; k < gruppo.n; k++) {
      n++
      const donna = forse(rng, 0.5)
      const nome = donna ? scegli(rng, nomiF) : scegli(rng, nomiM)
      const cognome = scegli(rng, cognomi)
      const tip = gruppo.tipologia
      const [vmin, vmax] = valorePer[tip]
      const conBambini = forse(rng, tip === 'stagionale' ? 0.55 : 0.4)
      const componenti = conBambini ? intero(rng, 3, 5) : intero(rng, 1, 3)

      // Assegnazione postazione: stagionali sempre; alcuni mensili/quindicinali
      let postazioneId: string | undefined
      if (tip === 'stagionale' && iStag < postStag.length) postazioneId = postStag[iStag++]

      const anni = intero(rng, tip === 'occasionale' ? 0 : 1, gruppo.anniMax)
      const valoreStagione = arrotonda(reale(rng, vmin, vmax), 10)
      const haSaldo = forse(rng, tip === 'stagionale' || tip === 'mensile' ? 0.28 : 0.08)
      const saldoAperto = haSaldo ? arrotonda(reale(rng, 20, 340), 5) : 0

      clienti.push({
        id: `C-${String(n).padStart(3, '0')}`,
        nome,
        cognome,
        telefono: telefono(rng),
        email: `${nome.toLowerCase()}.${cognome.toLowerCase().replace(/[^a-z]/g, '')}@example.it`,
        tipologia: tip,
        componenti,
        conBambini,
        postazionePreferita: forse(rng, 0.35) ? `Fila ${scegli(rng, file)}` : undefined,
        postazioneId,
        clienteDaAnni: anni,
        saldoAperto,
        valoreStagione,
        note: forse(rng, 0.3) ? scegli(rng, note) : undefined,
      })
    }
  }
  return clienti
}

export const clienti: Cliente[] = costruisci(creaRng(4242))

/** Indice per id, comodo per i lookup. */
export const clientiPerId = new Map(clienti.map((c) => [c.id, c]))
