/**
 * Sito internet: pagine, contenuti home, galleria, news, prenotazioni online
 * (alcune da confermare → alimentano gli alert del Cruscotto), messaggi,
 * recensioni, SEO e statistiche visite. Listino pubblicato e disponibilità
 * ombrelloni NON stanno qui: sono derivati da tariffe e spiaggia nell'api,
 * così restano sempre sincronizzati.
 */
import { addDays, format, parseISO } from 'date-fns'
import { config } from '../config'
import type {
  MessaggioContatto,
  NewsSito,
  PaginaSito,
  PrenotazioneOnline,
  Recensione,
  StatoPrenotazioneOnline,
  StatoSito,
  TipologiaPostazione,
} from '../types'
import { creaRng, intero, scegli, scegliPesato, forse, type Rng } from './_rng'

const oggi = parseISO(config.stagione.oggi)

const pagine: PaginaSito[] = [
  { id: 'PG-1', slug: 'home', titolo: 'Home', pubblicata: true, aggiornata: '2026-07-10' },
  { id: 'PG-2', slug: 'listino', titolo: 'Listino prezzi', pubblicata: true, aggiornata: '2026-07-01' },
  { id: 'PG-3', slug: 'servizi', titolo: 'Servizi', pubblicata: true, aggiornata: '2026-06-15' },
  { id: 'PG-4', slug: 'ristorante', titolo: 'Ristorante', pubblicata: true, aggiornata: '2026-06-28' },
  { id: 'PG-5', slug: 'contatti', titolo: 'Contatti', pubblicata: true, aggiornata: '2026-05-20' },
  { id: 'PG-6', slug: 'dove-siamo', titolo: 'Dove siamo', pubblicata: true, aggiornata: '2026-05-20' },
  { id: 'PG-7', slug: 'eventi', titolo: 'Eventi', pubblicata: false, aggiornata: '2026-07-12' },
]

const galleria = [
  'La spiaggia all’alba',
  'File di ombrelloni',
  'Il bar sulla terrazza',
  'Piatti del ristorante',
  'Tramonto dal pontile',
  'Cabine colorate',
  'Beach volley',
  'Aperitivo in musica',
].map((titolo, i) => ({ id: `FT-${i + 1}`, titolo, ordine: i + 1 }))

const news: NewsSito[] = [
  { id: 'N-1', titolo: 'Aperta la stagione 2026!', data: '2026-05-01', testo: 'Vi aspettiamo con tante novità e i servizi di sempre.', pubblicata: true },
  { id: 'N-2', titolo: 'Cena sotto le stelle: prenota', data: '2026-07-10', testo: 'Sabato 19 luglio serata speciale con menù di mare.', pubblicata: true },
  { id: 'N-3', titolo: 'Festa di Ferragosto', data: '2026-08-01', testo: 'Musica, cena e spettacolo. Posti limitati.', pubblicata: false },
]

const nomiClienti = ['Marco R.', 'Giulia B.', 'Fam. Conti', 'Luca F.', 'Sara M.', 'Andrea G.', 'Chiara V.', 'Paolo E.']
const tipologie: TipologiaPostazione[] = [
  'ombrellone_2_lettini',
  'ombrellone_2_sdraio',
  'ombrellone_lettino_sdraio',
  'gazebo',
  'tenda',
]

function costruisciPrenotazioni(rng: Rng): PrenotazioneOnline[] {
  const out: PrenotazioneOnline[] = []
  const stati: StatoPrenotazioneOnline[] = ['da_confermare', 'confermata', 'rifiutata']
  for (let i = 0; i < 9; i++) {
    const inizio = intero(rng, -3, 6)
    const dal = format(addDays(oggi, inizio), 'yyyy-MM-dd')
    const durata = intero(rng, 1, 7)
    const nome = scegli(rng, nomiClienti)
    out.push({
      id: `PO-${String(i + 1).padStart(2, '0')}`,
      ricevutaIl: format(addDays(oggi, intero(rng, -4, 0)), 'yyyy-MM-dd'),
      nome,
      email: `${nome.split(' ')[0].toLowerCase()}@example.it`,
      telefono: `3${intero(rng, 20, 49)} ${intero(rng, 1000000, 9999999)}`,
      dal,
      al: format(addDays(parseISO(dal), durata), 'yyyy-MM-dd'),
      tipologiaPostazione: scegli(rng, tipologie),
      persone: intero(rng, 1, 5),
      stato: scegliPesato(rng, stati, [50, 40, 10]),
      messaggio: forse(rng, 0.4)
        ? scegli(rng, ['Possibilmente in prima fila', 'Con cabina se disponibile', 'Arriviamo nel pomeriggio', 'Grazie mille!'])
        : undefined,
    })
  }
  return out
}

function costruisciMessaggi(rng: Rng): MessaggioContatto[] {
  const oggetti = ['Informazioni prezzi', 'Disponibilità agosto', 'Convenzione aziendale', 'Evento privato', 'Accessibilità', 'Animali ammessi?']
  const out: MessaggioContatto[] = []
  for (let i = 0; i < 6; i++) {
    const nome = scegli(rng, nomiClienti)
    out.push({
      id: `MS-${String(i + 1).padStart(2, '0')}`,
      data: format(addDays(oggi, -intero(rng, 0, 8)), 'yyyy-MM-dd'),
      nome,
      email: `${nome.split(' ')[0].toLowerCase()}@example.it`,
      oggetto: scegli(rng, oggetti),
      messaggio: 'Buongiorno, avrei bisogno di alcune informazioni. Grazie.',
      letto: forse(rng, 0.5),
    })
  }
  return out
}

function costruisciRecensioni(rng: Rng): Recensione[] {
  const testi = [
    'Spiaggia pulitissima e personale gentile.',
    'Ottimo ristorante, pesce freschissimo.',
    'Bagnini attenti, mi sono sentita sicura coi bambini.',
    'Prezzi giusti per i servizi offerti.',
    'Ci torniamo ogni anno, come a casa.',
    'Bar un po’ affollato a Ferragosto, ma tutto ok.',
    'Cabine curate e docce sempre pulite.',
    'Aperitivo in musica bellissimo!',
    'Parcheggio comodo e passerelle nuove.',
    'Consigliato per famiglie.',
  ]
  return testi.map((t, i) => ({
    id: `RC-${String(i + 1).padStart(2, '0')}`,
    autore: scegli(rng, nomiClienti),
    data: format(addDays(oggi, -intero(rng, 1, 40)), 'yyyy-MM-dd'),
    voto: scegliPesato(rng, [5, 4, 3], [60, 30, 10]),
    testo: t,
    pubblicata: forse(rng, 0.85),
  }))
}

function costruisciVisite(rng: Rng) {
  const out: { data: string; visite: number; unici: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = format(addDays(oggi, -i), 'yyyy-MM-dd')
    const visite = intero(rng, 180, 520)
    out.push({ data: d, visite, unici: Math.round(visite * 0.72) })
  }
  return out
}

const rng = creaRng(5151)

export const statoSito: StatoSito = {
  pagine,
  home: {
    titolo: 'Bagni BeachIn — la tua estate sul mare',
    sottotitolo: 'Ombrelloni, ristorante e servizi a Marina di BeachIn',
    testo:
      'Da tre generazioni ti accogliamo su una delle spiagge più belle della costa. ' +
      'Prenota il tuo ombrellone, scopri il ristorante di pesce e vivi i nostri eventi.',
    immagine: 'hero-spiaggia-alba',
  },
  galleria,
  news,
  prenotazioni: costruisciPrenotazioni(rng),
  messaggi: costruisciMessaggi(rng),
  recensioni: costruisciRecensioni(rng),
  seo: {
    titolo: 'Bagni BeachIn | Stabilimento balneare a Marina di BeachIn',
    descrizione:
      'Stabilimento balneare con ombrelloni, cabine, bar e ristorante di pesce. Prenota online la tua postazione.',
    keyword: ['stabilimento balneare', 'spiaggia', 'ombrelloni', 'ristorante di mare', 'marina di beachin'],
  },
  visite: costruisciVisite(rng),
}
