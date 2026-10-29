import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useSessione } from '@/context/SessioneContext'
import type { SottoVoce } from '@/config/navigazione'
import { supabase } from '@/lib/supabase'
import { useSchedeRapide, useVociMenu } from '@/hooks/useNavStaff'

/** Pulsante della barra in basso (una scheda rapida o una qualsiasi sezione di "Tutte le sezioni"). */
export interface VoceBarra { percorso: string; etichetta: string; icona: LucideIcon; badge?: SottoVoce['badge'] }

/** Posti liberi della barra in basso oltre a quello fisso (Home, o la prima scheda del ruolo). */
export const POSTI_PREFERITI = 3

/*
 * Preferiti della barra in basso, per utente: si salvano nei metadati dell'account (Supabase Auth, `barra_preferiti`)
 * così seguono l'utente su ogni telefono, senza tabelle nuove; sul dispositivo resta una copia per aprire subito
 * (e senza Supabase, in demo locale, vale solo quella).
 */
const chiave = (id: string) => `beachin.barra.${id}`
let stato: { id: string; preferiti: (string | null)[] | null } = { id: '', preferiti: null }
const ascolta = new Set<() => void>()
const avvisa = () => ascolta.forEach((f) => f())

function leggiLocale(id: string): (string | null)[] | null {
  try { const v = JSON.parse(localStorage.getItem(chiave(id)) ?? 'null'); return Array.isArray(v) ? v : null } catch { return null }
}
function imposta(id: string, preferiti: (string | null)[] | null, salvaAccount: boolean) {
  stato = { id, preferiti }
  try { if (preferiti) localStorage.setItem(chiave(id), JSON.stringify(preferiti)); else localStorage.removeItem(chiave(id)) } catch { /* storage non disponibile */ }
  avvisa()
  if (salvaAccount && supabase) {
    void supabase.auth.updateUser({ data: { barra_preferiti: preferiti } }).then(({ error }) => { if (error) console.error('preferiti barra', error.message) })
  }
}

/** Barra in basso del telefono: posto fisso + 3 preferiti scelti dall'utente tra le sezioni che può vedere. */
export function useBarraPreferiti() {
  const { profilo } = useSessione()
  const id = profilo?.id ?? ''
  const schede = useSchedeRapide()
  const voci = useVociMenu()
  const preferiti = useSyncExternalStore(
    (f) => { ascolta.add(f); return () => { ascolta.delete(f) } },
    () => (stato.id === id ? stato.preferiti : null),
  )

  // all'apertura: subito la copia del dispositivo, poi quella dell'account (vince, arriva da un altro telefono)
  useEffect(() => {
    if (!id) return
    if (stato.id !== id) { stato = { id, preferiti: leggiLocale(id) }; avvisa() }
    if (!supabase) return
    // getUser chiede al server: i metadati nella sessione salvata non vedono le modifiche fatte da un altro telefono
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const v = data.user.user_metadata?.barra_preferiti
      if (stato.id === id && (Array.isArray(v) || v === null) && JSON.stringify(v) !== JSON.stringify(stato.preferiti)) imposta(id, v, false)
    })
  }, [id])

  // tutte le sezioni visibili all'utente (modulo attivo + permessi del ruolo): solo queste possono andare nella barra
  const disponibili = useMemo(() => {
    const m = new Map<string, VoceBarra>()
    for (const s of schede) m.set(s.percorso, { percorso: s.percorso, etichetta: s.etichetta, icona: s.icona, badge: s.badge })
    for (const v of voci) {
      if (!v.figli) { if (!m.has(v.percorso)) m.set(v.percorso, { percorso: v.percorso, etichetta: v.etichetta, icona: v.icona }); continue }
      for (const f of v.figli) if (!m.has(f.percorso)) m.set(f.percorso, { percorso: f.percorso, etichetta: f.etichetta, icona: f.icona ?? v.icona, badge: f.badge })
    }
    return m
  }, [schede, voci])

  const delRuolo = useMemo(() => schede.map((s) => disponibili.get(s.percorso)).filter((v): v is VoceBarra => !!v), [schede, disponibili])
  const fisso: VoceBarra | undefined = delRuolo[0]
  // posti scelti (se ancora permessi), quelli vuoti si riempiono con le schede del ruolo come prima
  const posti = useMemo(() => {
    const usati = new Set(fisso ? [fisso.percorso] : [])
    const scelti = Array.from({ length: POSTI_PREFERITI }, (_, i) => {
      const p = preferiti?.[i]
      const v = p && !usati.has(p) ? disponibili.get(p) : undefined
      if (v) usati.add(v.percorso)
      return v
    })
    const riserva = delRuolo.filter((v) => !usati.has(v.percorso))
    return scelti.map((v) => v ?? riserva.shift()).filter((v): v is VoceBarra => !!v)
  }, [preferiti, disponibili, delRuolo, fisso])

  const metti = useCallback((posto: number, percorso: string) => {
    const attuali: (string | null)[] = Array.from({ length: POSTI_PREFERITI }, (_, i) => posti[i]?.percorso ?? null)
    const gia = attuali.indexOf(percorso)
    if (gia >= 0) attuali[gia] = attuali[posto] // già nella barra: i due posti si scambiano
    attuali[posto] = percorso
    imposta(id, attuali, true)
  }, [posti, id])
  const ripristina = useCallback(() => imposta(id, null, true), [id])

  return { fisso, posti, delRuolo, disponibili, metti, ripristina, personalizzata: !!preferiti }
}
