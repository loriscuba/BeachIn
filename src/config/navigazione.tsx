import {
  LayoutDashboard,
  Home,
  Umbrella,
  Users,
  Tags,
  Coffee,
  UtensilsCrossed,
  Receipt,
  Calculator,
  UserCog,
  CalendarDays,
  Globe,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuloId } from './moduli'

export interface VoceNav {
  percorso: string
  etichetta: string
  icona: LucideIcon
  /** Modulo commerciale a cui appartiene la voce (per il gating e l'upsell). */
  modulo: ModuloId
  /** Fase in cui la pagina viene riempita (usata dal segnaposto). */
  fase: number
  gruppo: 'Operatività' | 'Gestione' | 'Presenza online' | 'Impostazioni'
  /** Sottomenu: percorsi con `?tab=` della stessa pagina (o altre pagine, es. Comande sotto Bar). */
  figli?: SottoVoce[]
}

export interface SottoVoce {
  percorso: string
  etichetta: string
  modulo: ModuloId
  /** Contatore stile iPhone: 'richieste' = richieste tavolo dal sito da confermare. */
  badge?: 'richieste'
}

/**
 * Menu principale. L'ordine riflette la giornata dello stabilimento:
 * si apre sulla Panoramica, poi il Cruscotto completo e l'Arenile.
 */
export const navigazione: VoceNav[] = [
  { percorso: '/', etichetta: 'Panoramica', icona: Home, modulo: 'panoramica', fase: 4, gruppo: 'Operatività' },
  {
    percorso: '/bar', etichetta: 'Bar', icona: Coffee, modulo: 'bar', fase: 5, gruppo: 'Operatività',
    figli: [
      { percorso: '/bar?tab=listino', etichetta: 'Listino', modulo: 'bar' },
      { percorso: '/bar?tab=conti', etichetta: 'Conti', modulo: 'bar' },
      { percorso: '/comande', etichetta: 'Comande', modulo: 'comande' },
    ],
  },
  {
    percorso: '/ristorante', etichetta: 'Ristorante', icona: UtensilsCrossed, modulo: 'ristorante', fase: 5, gruppo: 'Operatività',
    figli: [
      { percorso: '/ristorante?tab=prenotazioni', etichetta: 'Prenotazioni', modulo: 'ristorante', badge: 'richieste' },
      { percorso: '/ristorante?tab=tavoli', etichetta: 'Tavoli', modulo: 'ristorante' },
      { percorso: '/ristorante?tab=menu', etichetta: 'Menu', modulo: 'ristorante' },
      { percorso: '/ristorante?tab=magazzino', etichetta: 'Magazzino', modulo: 'ristorante' },
      { percorso: '/ristorante?tab=giorni', etichetta: 'Gestione giorni', modulo: 'ristorante' },
    ],
  },
  { percorso: '/cruscotto', etichetta: 'Cruscotto completo', icona: LayoutDashboard, modulo: 'cruscotto', fase: 4, gruppo: 'Operatività' },
  { percorso: '/arenile', etichetta: 'Arenile', icona: Umbrella, modulo: 'arenile', fase: 3, gruppo: 'Operatività' },
  { percorso: '/clienti', etichetta: 'Clienti', icona: Users, modulo: 'clienti', fase: 5, gruppo: 'Operatività' },

  { percorso: '/tariffe', etichetta: 'Tariffe', icona: Tags, modulo: 'tariffe', fase: 5, gruppo: 'Gestione' },
  { percorso: '/costi', etichetta: 'Costi', icona: Receipt, modulo: 'costi', fase: 6, gruppo: 'Gestione' },
  { percorso: '/conto-economico', etichetta: 'Conto economico', icona: Calculator, modulo: 'conto-economico', fase: 6, gruppo: 'Gestione' },
  { percorso: '/personale', etichetta: 'Personale', icona: UserCog, modulo: 'personale', fase: 7, gruppo: 'Gestione' },
  { percorso: '/eventi', etichetta: 'Eventi', icona: CalendarDays, modulo: 'eventi', fase: 7, gruppo: 'Gestione' },

  { percorso: '/sito', etichetta: 'Sito internet', icona: Globe, modulo: 'sito', fase: 8, gruppo: 'Presenza online' },

  { percorso: '/impostazioni', etichetta: 'Impostazioni', icona: Settings, modulo: 'impostazioni', fase: 1, gruppo: 'Impostazioni' },
]

export const gruppiNav: VoceNav['gruppo'][] = [
  'Operatività',
  'Gestione',
  'Presenza online',
  'Impostazioni',
]
