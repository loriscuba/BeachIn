/**
 * 14 dipendenti con ruolo, contratto, monte ore, turni settimanali e costo
 * aziendale mensile. Il costo totale del personale viene riusato dai costi,
 * così il Conto economico è coerente col modulo Personale.
 */
import type { Dipendente, RuoloDipendente, TipoContratto, TurnoLavoro } from '../types'
import { creaRng, intero, scegli, type Rng } from './_rng'

interface DefD {
  nome: string
  cognome: string
  ruolo: RuoloDipendente
  inquadramento: string
  contratto: TipoContratto
  dal: string
  al: string
  ore: number
  costoOrario: number
  costoMensile: number
}

const organico: DefD[] = [
  { nome: 'Alessandro', cognome: 'Neri', ruolo: 'assistente_bagnanti', inquadramento: 'Livello 4', contratto: 'stagionale', dal: '2026-05-15', al: '2026-09-15', ore: 40, costoOrario: 12.5, costoMensile: 2450 },
  { nome: 'Davide', cognome: 'Fontana', ruolo: 'assistente_bagnanti', inquadramento: 'Livello 4', contratto: 'stagionale', dal: '2026-05-15', al: '2026-09-15', ore: 40, costoOrario: 12.5, costoMensile: 2450 },
  { nome: 'Sara', cognome: 'Bruno', ruolo: 'assistente_bagnanti', inquadramento: 'Livello 5', contratto: 'stagionale', dal: '2026-06-01', al: '2026-09-10', ore: 36, costoOrario: 11.8, costoMensile: 2080 },
  { nome: 'Chiara', cognome: 'Villa', ruolo: 'cassa_reception', inquadramento: 'Livello 3', contratto: 'tempo_indeterminato', dal: '2026-01-01', al: '2026-12-31', ore: 40, costoOrario: 14, costoMensile: 2720 },
  { nome: 'Federica', cognome: 'Costa', ruolo: 'cassa_reception', inquadramento: 'Livello 4', contratto: 'stagionale', dal: '2026-05-01', al: '2026-09-30', ore: 38, costoOrario: 12.8, costoMensile: 2360 },
  { nome: 'Luca', cognome: 'Ricci', ruolo: 'barista', inquadramento: 'Livello 4', contratto: 'stagionale', dal: '2026-05-01', al: '2026-09-30', ore: 40, costoOrario: 12.2, costoMensile: 2390 },
  { nome: 'Martina', cognome: 'Greco', ruolo: 'barista', inquadramento: 'Livello 5', contratto: 'stagionale', dal: '2026-06-01', al: '2026-09-15', ore: 36, costoOrario: 11.5, costoMensile: 2020 },
  { nome: 'Simone', cognome: 'Marino', ruolo: 'cameriere', inquadramento: 'Livello 5', contratto: 'stagionale', dal: '2026-05-15', al: '2026-09-30', ore: 40, costoOrario: 11.8, costoMensile: 2310 },
  { nome: 'Giulia', cognome: 'Serra', ruolo: 'cameriere', inquadramento: 'Livello 6', contratto: 'extra', dal: '2026-06-15', al: '2026-09-10', ore: 24, costoOrario: 11, costoMensile: 1290 },
  { nome: 'Roberto', cognome: 'Longo', ruolo: 'cuoco', inquadramento: 'Livello 2', contratto: 'tempo_determinato', dal: '2026-05-01', al: '2026-09-30', ore: 44, costoOrario: 17.5, costoMensile: 3640 },
  { nome: 'Antonio', cognome: 'Rizzo', ruolo: 'aiuto_cuoco', inquadramento: 'Livello 5', contratto: 'stagionale', dal: '2026-05-15', al: '2026-09-30', ore: 40, costoOrario: 12, costoMensile: 2350 },
  { nome: 'Anna', cognome: 'Fabbri', ruolo: 'pulizie', inquadramento: 'Livello 6', contratto: 'stagionale', dal: '2026-05-01', al: '2026-09-30', ore: 30, costoOrario: 10.5, costoMensile: 1560 },
  { nome: 'Paola', cognome: 'Testa', ruolo: 'pulizie', inquadramento: 'Livello 6', contratto: 'extra', dal: '2026-06-01', al: '2026-09-15', ore: 24, costoOrario: 10.5, costoMensile: 1230 },
  { nome: 'Enrico', cognome: 'Monti', ruolo: 'manutentore', inquadramento: 'Livello 3', contratto: 'tempo_indeterminato', dal: '2026-01-01', al: '2026-12-31', ore: 40, costoOrario: 15, costoMensile: 2900 },
]

// Fasce turni tipiche per ruolo
const fasceRuolo: Record<RuoloDipendente, [string, string][]> = {
  assistente_bagnanti: [['08:30', '13:30'], ['13:30', '19:00']],
  cassa_reception: [['08:00', '14:00'], ['14:00', '20:00']],
  barista: [['08:30', '14:30'], ['16:00', '24:00']],
  cameriere: [['12:00', '15:30'], ['19:00', '23:30']],
  cuoco: [['11:00', '15:00'], ['18:30', '23:30']],
  aiuto_cuoco: [['11:00', '15:00'], ['18:30', '23:00']],
  pulizie: [['07:00', '11:00'], ['18:00', '21:00']],
  manutentore: [['08:00', '12:00'], ['15:00', '18:00']],
}

function costruisciTurni(rng: Rng, ruolo: RuoloDipendente): TurnoLavoro[] {
  const fasce = fasceRuolo[ruolo]
  const turni: TurnoLavoro[] = []
  const riposo = intero(rng, 0, 6) // un giorno di riposo
  for (let giorno = 0; giorno < 7; giorno++) {
    if (giorno === riposo) continue
    const [inizio, fine] = scegli(rng, fasce)
    turni.push({ giorno, inizio, fine })
  }
  return turni
}

function costruisci(rng: Rng): Dipendente[] {
  return organico.map((d, i) => {
    const turni = costruisciTurni(rng, d.ruolo)
    // ore lavorate ~ contratto ± piccola variazione (straordinari o assenze)
    const oreLavorate = d.ore + intero(rng, -2, 4)
    return {
      id: `D-${String(i + 1).padStart(2, '0')}`,
      nome: d.nome,
      cognome: d.cognome,
      ruolo: d.ruolo,
      inquadramento: d.inquadramento,
      tipoContratto: d.contratto,
      periodoDal: d.dal,
      periodoAl: d.al,
      oreContrattoSettimana: d.ore,
      oreLavorateSettimana: oreLavorate,
      costoOrarioLordo: d.costoOrario,
      costoAziendaleMensile: d.costoMensile,
      turni,
    }
  })
}

export const dipendenti: Dipendente[] = costruisci(creaRng(8080))

/** Costo aziendale mensile complessivo (tutti i dipendenti attivi). */
export const costoPersonaleMensile = dipendenti.reduce((s, d) => s + d.costoAziendaleMensile, 0)
