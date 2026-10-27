/**
 * Centro notifiche dell'app staff (campanella in alto a destra): un unico posto per tutti gli eventi
 * (prenotazioni, richieste eventi, comande, cucina, bar, piatti pronti) e per le preferenze
 * (suono, notifiche sul telefono, categorie). Le pagine non hanno più interruttori propri.
 * Elenco e preferenze restano nel browser di questo dispositivo.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { useSessione } from '@/context/SessioneContext'
import type { ModuloId } from '@/config/moduli'
import { aspettaVia, codaBar, perReparto } from '@/lib/sala'
import { campanello, sbloccaAudio } from '@/lib/suoni'
import { data as fmtData, euro } from '@/lib/formatters'

export type CategoriaNotifica = 'prenotazioni' | 'spiaggia' | 'eventi' | 'ombrelloni' | 'cucina' | 'bar' | 'pronte'

export const CATEGORIE_NOTIFICA: { id: CategoriaNotifica; nome: string; modulo: ModuloId }[] = [
  { id: 'prenotazioni', nome: 'Prenotazioni tavolo', modulo: 'ristorante' },
  { id: 'spiaggia', nome: 'Prenotazioni ombrellone dal sito', modulo: 'sito' },
  { id: 'eventi', nome: 'Richieste per gli eventi', modulo: 'eventi' },
  { id: 'ombrelloni', nome: 'Comande dagli ombrelloni', modulo: 'comande' },
  { id: 'cucina', nome: 'Comande in cucina', modulo: 'sala' },
  { id: 'bar', nome: 'Ordini da preparare al bar', modulo: 'bar-tavolo' },
  { id: 'pronte', nome: 'Piatti pronti da servire', modulo: 'sala' },
]

export interface Notifica {
  id: string
  categoria: CategoriaNotifica
  titolo: string
  testo: string
  percorso: string
  ts: number
  letta: boolean
}

interface Preferenze { suono: boolean; spente: CategoriaNotifica[] }

interface NotificheValue {
  notifiche: Notifica[]
  nonLette: number
  categorie: typeof CATEGORIE_NOTIFICA
  preferenze: Preferenze
  impostaSuono: (on: boolean) => void
  impostaCategoria: (c: CategoriaNotifica, on: boolean) => void
  segnaLetta: (id: string) => void
  segnaTutteLette: () => void
  svuota: () => void
}

const CHIAVE_ELENCO = 'beachin.notifiche.v1'
const CHIAVE_PREF = 'beachin.notifiche.pref.v1'
const MAX = 50
/** Dati che arrivano nei primi secondi (caricamento dal database) non sono eventi nuovi. */
const AVVIO_MS = 5000

function leggi<T>(chiave: string, ripiego: T): T {
  try { const v = localStorage.getItem(chiave); return v ? (JSON.parse(v) as T) : ripiego } catch { return ripiego }
}
function scrivi(chiave: string, v: unknown) {
  try { localStorage.setItem(chiave, JSON.stringify(v)) } catch { /* storage non disponibile */ }
}

type Sorgente = Omit<Notifica, 'ts' | 'letta'>

const Ctx = createContext<NotificheValue | null>(null)

export function NotificheProvider({ children }: { children: ReactNode }) {
  const { richiesteRistorante, richiesteEventi, prenotazioniOnline, comande, comandeSala } = useDemoData()
  const { moduloAttivo } = useModuli()
  const { puo, profilo } = useSessione()
  const [notifiche, setNotifiche] = useState<Notifica[]>(() => leggi(CHIAVE_ELENCO, []))
  const [preferenze, setPreferenze] = useState<Preferenze>(() => ({ suono: true, spente: [], ...leggi<Partial<Preferenze>>(CHIAVE_PREF, {}) }))
  useEffect(() => scrivi(CHIAVE_ELENCO, notifiche), [notifiche])
  useEffect(() => scrivi(CHIAVE_PREF, preferenze), [preferenze])

  // categorie che l'utente può ricevere: modulo attivo + permesso del ruolo
  const categorie = useMemo(() => CATEGORIE_NOTIFICA.filter((c) => moduloAttivo(c.modulo) && puo(c.modulo)), [moduloAttivo, puo])

  // eventi "in corso" di ogni categoria; una chiave mai vista = notifica nuova
  const mio = profilo?.nome
  const senzaOmbrelloni = !categorie.some((c) => c.id === 'ombrelloni')
  const sorgenti = useMemo<Sorgente[]>(() => [
    ...richiesteRistorante.filter((r) => r.stato === 'da_confermare').map((r) => ({
      id: `prenotazioni-${r.id}`, categoria: 'prenotazioni' as const, titolo: 'Nuova prenotazione tavolo',
      testo: `${r.nome} · ${r.coperti} persone · ${fmtData(r.data)}${r.ora ? ` alle ${r.ora}` : ''}`, percorso: '/prenotazioni',
    })),
    ...prenotazioniOnline.filter((p) => p.stato === 'da_confermare').map((p) => ({
      id: `spiaggia-${p.id}`, categoria: 'spiaggia' as const, titolo: 'Prenotazione ombrellone dal sito',
      testo: `${p.nome} · dal ${fmtData(p.dal)} al ${fmtData(p.al)}`, percorso: '/sito?tab=panoramica',
    })),
    ...richiesteEventi.filter((r) => r.stato === 'da_confermare' && r.origine !== 'manuale').map((r) => ({
      id: `eventi-${r.id}`, categoria: 'eventi' as const, titolo: `Richiesta per ${r.eventoNome}`,
      testo: `${r.nome} · ${r.persone} persone`, percorso: '/eventi?tab=presenze',
    })),
    // le comande prese al banco le ha appena fatte chi è lì: niente notifica
    ...comande.filter((c) => c.stato === 'in_attesa' && c.origine !== 'bar').map((c) => ({
      id: `ombrelloni-${c.id}`, categoria: 'ombrelloni' as const, titolo: `Comanda dall'ombrellone ${c.ombrellone}`,
      testo: `${c.righe.reduce((n, r) => n + r.quantita, 0)} articoli · ${euro(c.totale)}${c.cliente ? ` · ${c.cliente}` : ''}`, percorso: '/comande',
    })),
    // le comande inviate da chi è collegato non suonano sul suo stesso dispositivo
    ...comandeSala.filter((c) => c.cameriere !== mio || c.origine !== 'cameriere').flatMap((c) => {
      const cu = perReparto(c, 'cucina')
      return cu && cu.c.stato === 'inviata' && !aspettaVia(cu.c) ? [{
        id: `cucina-${c.id}`, categoria: 'cucina' as const, titolo: `Comanda dal tavolo ${c.tavolo}`,
        testo: `${cu.indici.length} piatti${c.cameriere ? ` · ${c.cameriere}` : c.origine !== 'cameriere' ? ' · ordinata dal cliente' : ''}`, percorso: '/sala?tab=cucina',
      }] : []
    }),
    // chi non riceve le comande degli ombrelloni (es. solo Coda bar) le ha qui, come nella sua coda
    ...codaBar(senzaOmbrelloni ? comande.filter((c) => c.stato === 'in_attesa' && c.origine !== 'bar') : [], comandeSala.filter((c) => c.cameriere !== mio || c.origine !== 'cameriere')).daFare.map((v) => ({
      id: `bar-${v.tipo}-${v.c.id}`, categoria: 'bar' as const,
      titolo: v.tipo === 'tavolo' ? `Ordine al bar dal tavolo ${v.c.tavolo}` : `Comanda dall'ombrellone ${v.c.ombrellone}`,
      testo: 'Da preparare in Coda bar', percorso: '/sala?tab=bar',
    })),
    ...comandeSala.filter((c) => c.stato === 'pronta' && !c.pagata).map((c) => ({
      id: `pronte-${c.id}`, categoria: 'pronte' as const, titolo: `Tavolo ${c.tavolo}: pronto da servire`,
      testo: c.cameriere ? `Comanda di ${c.cameriere}` : 'Comanda pronta', percorso: '/sala?tab=cameriere',
    })),
  ], [richiesteRistorante, prenotazioniOnline, richiesteEventi, comande, comandeSala, mio, senzaOmbrelloni])

  const visti = useRef<Set<string> | null>(null)
  const avvio = useRef(Date.now())
  const prefRef = useRef(preferenze)
  prefRef.current = preferenze
  const ammesse = useRef(categorie)
  ammesse.current = categorie
  useEffect(() => {
    const prima = !visti.current || Date.now() - avvio.current < AVVIO_MS
    const nuove = visti.current ? sorgenti.filter((s) => !visti.current!.has(s.id)) : []
    visti.current = new Set([...(visti.current ?? []), ...sorgenti.map((s) => s.id)])
    if (prima) return
    const accese = nuove.filter((s) => ammesse.current.some((c) => c.id === s.categoria) && !prefRef.current.spente.includes(s.categoria))
    if (!accese.length) return
    const ora = Date.now()
    setNotifiche((l) => [...accese.map((s) => ({ ...s, id: `${s.id}-${ora}`, ts: ora, letta: false })).reverse(), ...l].slice(0, MAX))
    if (prefRef.current.suono) campanello()
  }, [sorgenti])

  // il browser permette l'audio solo dopo un gesto: lo sblocco al primo tocco
  useEffect(() => {
    const sblocca = () => sbloccaAudio()
    window.addEventListener('pointerdown', sblocca, { once: true })
    return () => window.removeEventListener('pointerdown', sblocca)
  }, [])

  const impostaSuono = useCallback((on: boolean) => { if (on) campanello(); setPreferenze((p) => ({ ...p, suono: on })) }, [])
  const impostaCategoria = useCallback((c: CategoriaNotifica, on: boolean) =>
    setPreferenze((p) => ({ ...p, spente: on ? p.spente.filter((x) => x !== c) : [...p.spente.filter((x) => x !== c), c] })), [])
  const segnaLetta = useCallback((id: string) => setNotifiche((l) => l.map((n) => (n.id === id ? { ...n, letta: true } : n))), [])
  const segnaTutteLette = useCallback(() => setNotifiche((l) => l.map((n) => ({ ...n, letta: true }))), [])
  const svuota = useCallback(() => setNotifiche([]), [])

  // si vedono solo le notifiche delle categorie ancora permesse al ruolo
  const visibili = useMemo(() => notifiche.filter((n) => categorie.some((c) => c.id === n.categoria)), [notifiche, categorie])
  const value = useMemo<NotificheValue>(() => ({
    notifiche: visibili, nonLette: visibili.filter((n) => !n.letta).length, categorie, preferenze,
    impostaSuono, impostaCategoria, segnaLetta, segnaTutteLette, svuota,
  }), [visibili, categorie, preferenze, impostaSuono, impostaCategoria, segnaLetta, segnaTutteLette, svuota])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifiche() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNotifiche fuori da NotificheProvider')
  return v
}
