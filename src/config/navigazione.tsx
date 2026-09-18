import {
  LayoutDashboard,
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

export interface VoceNav {
  percorso: string
  etichetta: string
  icona: LucideIcon
  /** Fase in cui la pagina viene riempita (usata dal segnaposto). */
  fase: number
  gruppo: 'Operatività' | 'Gestione' | 'Presenza online' | 'Impostazioni'
}

/**
 * Menu principale. L'ordine riflette la giornata dello stabilimento:
 * si apre sul Cruscotto, poi l'Arenile (schermata più importante).
 */
export const navigazione: VoceNav[] = [
  { percorso: '/', etichetta: 'Cruscotto', icona: LayoutDashboard, fase: 4, gruppo: 'Operatività' },
  { percorso: '/arenile', etichetta: 'Arenile', icona: Umbrella, fase: 3, gruppo: 'Operatività' },
  { percorso: '/clienti', etichetta: 'Clienti', icona: Users, fase: 5, gruppo: 'Operatività' },

  { percorso: '/tariffe', etichetta: 'Tariffe', icona: Tags, fase: 5, gruppo: 'Gestione' },
  { percorso: '/bar', etichetta: 'Bar', icona: Coffee, fase: 5, gruppo: 'Gestione' },
  { percorso: '/ristorante', etichetta: 'Ristorante', icona: UtensilsCrossed, fase: 5, gruppo: 'Gestione' },
  { percorso: '/costi', etichetta: 'Costi', icona: Receipt, fase: 6, gruppo: 'Gestione' },
  { percorso: '/conto-economico', etichetta: 'Conto economico', icona: Calculator, fase: 6, gruppo: 'Gestione' },
  { percorso: '/personale', etichetta: 'Personale', icona: UserCog, fase: 7, gruppo: 'Gestione' },
  { percorso: '/eventi', etichetta: 'Eventi', icona: CalendarDays, fase: 7, gruppo: 'Gestione' },

  { percorso: '/sito', etichetta: 'Sito internet', icona: Globe, fase: 8, gruppo: 'Presenza online' },

  { percorso: '/impostazioni', etichetta: 'Impostazioni', icona: Settings, fase: 1, gruppo: 'Impostazioni' },
]

export const gruppiNav: VoceNav['gruppo'][] = [
  'Operatività',
  'Gestione',
  'Presenza online',
  'Impostazioni',
]
