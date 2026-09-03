/**
 * api.ts — UNICO punto di accesso ai dati.
 * Le pagine importano solo da qui (mai i seed direttamente). Ogni funzione è
 * async con un ritardo simulato di 150–300 ms, così le pagine gestiscono lo
 * stato di caricamento come se parlassero con Supabase.
 *
 * In una fase successiva il corpo di queste funzioni verrà sostituito da
 * chiamate reali: la firma resta identica.
 */
import { config } from './config'
import type {
  ArticoloBar,
  Cabina,
  Cliente,
  ContatoriArenile,
  ContoEconomico,
  ContoOmbrellone,
  Dipendente,
  Doccia,
  Evento,
  GiornoStagione,
  KpiCruscotto,
  Piatto,
  Postazione,
  PrenotazioneRistorante,
  ServizioRistoranteGiorno,
  StatoSito,
  TariffaAccessoria,
  Tavolo,
  Torretta,
  Armadietto,
  VenditaBarGiorno,
  VoceCosto,
  VoceTariffa,
} from './types'

import { giorni } from './seed/giornaliero'
import { postazioni, cabine, armadietti, docce, torrette } from './seed/spiaggia'
import { clienti } from './seed/clienti'
import { tariffe, tariffeAccessorie } from './seed/tariffe'
import { articoliBar, venditeBar, contiOmbrellone } from './seed/bar'
import { menu, tavoli, serviziRistorante, prenotazioniRistorante } from './seed/ristorante'
import { costi } from './seed/costi'
import { dipendenti } from './seed/personale'
import { eventi, ricaviEventi, costiEventi } from './seed/eventi'
import { statoSito } from './seed/sito'

import {
  contatoriArenile,
  contoEconomico,
  kpiCruscotto,
  simulaPreventivo,
  type RisultatoPreventivo,
} from '@/lib/calcoli'

// Ritardo simulato 150–300 ms (solo timing: non influisce sui dati)
function ritardo<T>(dato: T): Promise<T> {
  const ms = 150 + Math.floor(Math.random() * 150)
  return new Promise((resolve) => setTimeout(() => resolve(dato), ms))
}

// — Serie giornaliera / KPI —
export function getGiorni(): Promise<GiornoStagione[]> {
  return ritardo(giorni.slice())
}
export function getKpiCruscotto(): Promise<KpiCruscotto> {
  return ritardo(kpiCruscotto(giorni, config.stagione.oggi))
}

// — Arenile —
export function getPostazioni(): Promise<Postazione[]> {
  return ritardo(postazioni.map((p) => ({ ...p })))
}
export function getContatoriArenile(): Promise<ContatoriArenile> {
  return ritardo(contatoriArenile(postazioni))
}
export function getStruttureArenile(): Promise<{
  cabine: Cabina[]
  armadietti: Armadietto[]
  docce: Doccia[]
  torrette: Torretta[]
}> {
  return ritardo({ cabine, armadietti, docce, torrette })
}

// — Clienti —
export function getClienti(): Promise<Cliente[]> {
  return ritardo(clienti.map((c) => ({ ...c })))
}
export function getCliente(id: string): Promise<Cliente | undefined> {
  return ritardo(clienti.find((c) => c.id === id))
}

// — Tariffe —
export function getTariffe(): Promise<VoceTariffa[]> {
  return ritardo(tariffe.slice())
}
export function getTariffeAccessorie(): Promise<TariffaAccessoria[]> {
  return ritardo(tariffeAccessorie.slice())
}
export function getPreventivo(
  fila: Parameters<typeof simulaPreventivo>[1],
  tipologia: Parameters<typeof simulaPreventivo>[2],
  dal: string,
  al: string
): Promise<RisultatoPreventivo> {
  return ritardo(simulaPreventivo(tariffe, fila, tipologia, dal, al))
}

// — Bar —
export function getArticoliBar(): Promise<ArticoloBar[]> {
  return ritardo(articoliBar.slice())
}
export function getVenditeBar(): Promise<VenditaBarGiorno[]> {
  return ritardo(venditeBar.slice())
}
export function getContiOmbrellone(): Promise<ContoOmbrellone[]> {
  return ritardo(contiOmbrellone.map((c) => ({ ...c })))
}

// — Ristorante —
export function getMenu(): Promise<Piatto[]> {
  return ritardo(menu.slice())
}
export function getTavoli(): Promise<Tavolo[]> {
  return ritardo(tavoli.slice())
}
export function getServiziRistorante(): Promise<ServizioRistoranteGiorno[]> {
  return ritardo(serviziRistorante.slice())
}
export function getPrenotazioniRistorante(): Promise<PrenotazioneRistorante[]> {
  return ritardo(prenotazioniRistorante.slice())
}

// — Costi —
export function getCosti(): Promise<VoceCosto[]> {
  return ritardo(costi.map((c) => ({ ...c })))
}

// — Conto economico —
export function getContoEconomico(): Promise<ContoEconomico> {
  return ritardo(contoEconomico(giorni, costi, { ricavi: ricaviEventi, costi: costiEventi }))
}

// — Personale —
export function getPersonale(): Promise<Dipendente[]> {
  return ritardo(dipendenti.map((d) => ({ ...d })))
}

// — Eventi —
export function getEventi(): Promise<Evento[]> {
  return ritardo(eventi.slice())
}

// — Sito —
export function getStatoSito(): Promise<StatoSito> {
  return ritardo(statoSito)
}

/** Disponibilità mostrata sul sito: derivata dall'arenile (sempre sincronizzata). */
export function getDisponibilitaSito(): Promise<{ libere: number; totali: number; occupazione: number }> {
  const c = contatoriArenile(postazioni)
  return ritardo({ libere: c.libere, totali: c.totali, occupazione: c.occupazione })
}

/** Listino pubblicato sul sito: le voci tariffa in stato "pubblicato". */
export function getListinoPubblicato(): Promise<VoceTariffa[]> {
  return ritardo(tariffe.filter((t) => t.stato === 'pubblicato'))
}
