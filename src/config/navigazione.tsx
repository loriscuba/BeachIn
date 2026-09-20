import {
  LayoutDashboard,
  Home,
  Umbrella,
  Users,
  Tags,
  Coffee,
  UtensilsCrossed,
  Mic,
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
}

/**
 * Menu principale. L'ordine riflette la giornata dello stabilimento:
 * si apre sulla Panoramica, poi il Cruscotto completo e l'Arenile.
 */
export const navigazione: VoceNav[] = [
  { percorso: '/', etichetta: 'Panoramica', icona: Home, modulo: 'panoramica', fase: 4, gruppo: 'Operatività' },
  { percorso: '/cruscotto', etichetta: 'Cruscotto completo', icona: LayoutDashboard, modulo: 'cruscotto', fase: 4, gruppo: 'Operatività' },
  { percorso: '/arenile', etichetta: 'Arenile', icona: Umbrella, modulo: 'arenile', fase: 3, gruppo: 'Operatività' },
  { percorso: '/clienti', etichetta: 'Clienti', icona: Users, modulo: 'clienti', fase: 5, gruppo: 'Operatività' },

  { percorso: '/tariffe', etichetta: 'Tariffe', icona: Tags, modulo: 'tariffe', fase: 5, gruppo: 'Gestione' },
  { percorso: '/bar', etichetta: 'Bar', icona: Coffee, modulo: 'bar', fase: 5, gruppo: 'Gestione' },
  { percorso: '/ristorante', etichetta: 'Ristorante', icona: UtensilsCrossed, modulo: 'ristorante', fase: 5, gruppo: 'Gestione' },
  { percorso: '/assistente-vocale', etichetta: 'Assistente vocale', icona: Mic, modulo: 'assistente-vocale', fase: 5, gruppo: 'Gestione' },
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
