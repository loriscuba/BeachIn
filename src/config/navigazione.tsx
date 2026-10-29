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
  Inbox,
  ConciergeBell,
  ChefHat,
  Beer,
  Bell,
  BookOpen,
  Wallet,
  LayoutGrid,
  Tablet,
  Package,
  CalendarX2,
  ScanLine,
  Megaphone,
  Smartphone,
  UsersRound,
  Boxes,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FUNZIONI, idFunzione, type ModuloId } from './moduli'

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
  /** Contatore stile iPhone: 'richieste' = richieste tavolo dal sito da confermare; 'comande' = comande appena arrivate; 'cucina' = comande del ristorante non ancora prese dalla cucina. */
  badge?: 'richieste' | 'comande' | 'cucina' | 'bar'
  /** Permesso diverso da quello del modulo (es. Impostazioni → Utenti e ruoli). */
  permesso?: 'utenti'
  /** Icona propria (pulsanti di "Altro" sul telefono); senza, quella della voce padre. */
  icona?: LucideIcon
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
      { percorso: '/bar?tab=listino', etichetta: 'Listino', icona: BookOpen, modulo: 'bar' },
      { percorso: '/bar?tab=conti', etichetta: 'Conti', icona: Wallet, modulo: 'bar' },
      { percorso: '/comande', etichetta: 'Comande', icona: Bell, modulo: 'comande', badge: 'comande' },
    ],
  },
  {
    percorso: '/ristorante', etichetta: 'Ristorante', icona: UtensilsCrossed, modulo: 'ristorante', fase: 5, gruppo: 'Operatività',
    figli: [
      { percorso: '/ristorante?tab=prenotazioni', etichetta: 'Prenotazioni', icona: Inbox, modulo: 'ristorante' },
      { percorso: '/ristorante?tab=tavoli', etichetta: 'Tavoli', icona: LayoutGrid, modulo: 'ristorante' },
      { percorso: '/sala?tab=cameriere', etichetta: 'Comande sala', icona: ConciergeBell, modulo: 'sala' },
      { percorso: '/sala?tab=cucina', etichetta: 'Cucina', icona: ChefHat, modulo: 'sala', badge: 'cucina' },
      { percorso: '/sala?tab=self', etichetta: 'Tablet self', icona: Tablet, modulo: 'sala' },
      { percorso: '/sala?tab=bar', etichetta: 'Coda bar', icona: Beer, modulo: 'bar-tavolo', badge: 'bar' },
      { percorso: '/ristorante?tab=menu', etichetta: 'Menu', icona: UtensilsCrossed, modulo: 'ristorante' },
      { percorso: '/ristorante?tab=magazzino', etichetta: 'Magazzino', icona: Package, modulo: 'ristorante' },
      { percorso: '/ristorante?tab=giorni', etichetta: 'Gestione giorni', icona: CalendarX2, modulo: 'ristorante' },
    ],
  },
  { percorso: '/cruscotto', etichetta: 'Cruscotto completo', icona: LayoutDashboard, modulo: 'cruscotto', fase: 4, gruppo: 'Operatività' },
  { percorso: '/arenile', etichetta: 'Arenile', icona: Umbrella, modulo: 'arenile', fase: 3, gruppo: 'Operatività' },
  { percorso: '/clienti', etichetta: 'Clienti', icona: Users, modulo: 'clienti', fase: 5, gruppo: 'Operatività' },

  { percorso: '/tariffe', etichetta: 'Tariffe', icona: Tags, modulo: 'tariffe', fase: 5, gruppo: 'Gestione' },
  { percorso: '/costi', etichetta: 'Costi', icona: Receipt, modulo: 'costi', fase: 6, gruppo: 'Gestione' },
  { percorso: '/conto-economico', etichetta: 'Conto economico', icona: Calculator, modulo: 'conto-economico', fase: 6, gruppo: 'Gestione' },
  { percorso: '/personale', etichetta: 'Personale', icona: UserCog, modulo: 'personale', fase: 7, gruppo: 'Gestione' },
  {
    percorso: '/eventi', etichetta: 'Eventi', icona: CalendarDays, modulo: 'eventi', fase: 7, gruppo: 'Gestione',
    figli: [
      { percorso: '/eventi?tab=calendario', etichetta: 'Calendario', icona: CalendarDays, modulo: 'eventi' },
      { percorso: '/eventi?tab=presenze', etichetta: 'Presenze', icona: ScanLine, modulo: 'eventi' },
    ],
  },

  {
    percorso: '/sito', etichetta: 'Sito internet', icona: Globe, modulo: 'sito', fase: 8, gruppo: 'Presenza online',
    figli: [
      { percorso: '/sito?tab=panoramica', etichetta: 'Panoramica', icona: Globe, modulo: 'sito' },
      { percorso: '/sito?tab=marketing', etichetta: 'Sito e marketing', icona: Megaphone, modulo: 'sito' },
      { percorso: '/sito?tab=app', etichetta: 'App clienti', icona: Smartphone, modulo: 'sito' },
    ],
  },

  {
    percorso: '/impostazioni', etichetta: 'Impostazioni', icona: Settings, modulo: 'impostazioni', fase: 1, gruppo: 'Impostazioni',
    figli: [
      { percorso: '/impostazioni?tab=generali', etichetta: 'Generali', icona: Settings, modulo: 'impostazioni' },
      { percorso: '/impostazioni?tab=moduli', etichetta: 'Moduli e funzionalità', icona: Boxes, modulo: 'impostazioni' },
      { percorso: '/impostazioni?tab=utenti', etichetta: 'Utenti e ruoli', icona: UsersRound, modulo: 'impostazioni', permesso: 'utenti' },
    ],
  },
]

export const gruppiNav: VoceNav['gruppo'][] = [
  'Operatività',
  'Gestione',
  'Presenza online',
  'Impostazioni',
]

/**
 * Schede rapide dell'app staff su telefono (barra in basso, le prime 4 + "Altro") e tablet (barra laterale stretta,
 * le prime 6): le funzioni operative del ruolo. Ogni ruolo ha il suo ordine; si mostrano solo quelle con modulo
 * attivo e permesso. Su PC resta il menu completo.
 */
export interface SchedaRapida {
  id: 'home' | 'cameriere' | 'cucina' | 'bar' | 'comande' | 'arenile'
  percorso: string
  etichetta: string
  icona: LucideIcon
  modulo: ModuloId
  /** Livello minimo del permesso (1 lettura, 2 modifica). */
  minimo?: 1 | 2
  badge?: SottoVoce['badge']
  /** Funzionalità da controllare quando il percorso non ha `?tab=` del modulo . */
  funzione?: string
}

export const SCHEDE_RAPIDE: SchedaRapida[] = [
  { id: 'home', percorso: '/', etichetta: 'Home', icona: Home, modulo: 'panoramica' },
  { id: 'cameriere', percorso: '/sala?tab=cameriere', etichetta: 'Cameriere', icona: ConciergeBell, modulo: 'sala' },
  { id: 'cucina', percorso: '/sala?tab=cucina', etichetta: 'Cucina', icona: ChefHat, modulo: 'sala', badge: 'cucina' },
  { id: 'bar', percorso: '/sala?tab=bar', etichetta: 'Bar', icona: Beer, modulo: 'bar-tavolo', badge: 'bar' },
  { id: 'comande', percorso: '/comande', etichetta: 'Ombrelloni', icona: Bell, modulo: 'comande', badge: 'comande' },
  { id: 'arenile', percorso: '/arenile', etichetta: 'Arenile', icona: Umbrella, modulo: 'arenile' },
]

/** Ordine delle schede per ruolo (ruoli di sistema); gli altri ruoli usano l'ordine di `SCHEDE_RAPIDE`. */
export const SCHEDE_PER_RUOLO: Record<string, SchedaRapida['id'][]> = {
  cameriere: ['cameriere', 'cucina', 'comande'],
  cucina: ['cucina', 'cameriere'],
  barista: ['bar', 'comande', 'cucina'],
  bar: ['comande', 'bar'],
}

/** Funzionalità a cui porta una voce del menu (`/modulo?tab=scheda`), se è nel catalogo `FUNZIONI`. */
export function funzioneDiVoce(v: { modulo: ModuloId; percorso: string; funzione?: string }): string | null {
  if (v.funzione) return v.funzione
  const tab = new URLSearchParams(v.percorso.split('?')[1]).get('tab')
  const id = tab ? idFunzione(v.modulo, tab) : null
  return id && FUNZIONI.some((x) => x.id === id) ? id : null
}
