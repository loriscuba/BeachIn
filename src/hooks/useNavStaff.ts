import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { useSessione } from '@/context/SessioneContext'
import { SCHEDE_PER_RUOLO, SCHEDE_RAPIDE, navigazione, type SchedaRapida, type SottoVoce, type VoceNav } from '@/config/navigazione'
import { codaBar, daFareCucina } from '@/lib/sala'

/** Contatori dei badge del menu (stile iPhone). */
export function useConteggiNav(): Record<NonNullable<SottoVoce['badge']>, number> {
  const { richiesteRistorante, comande, comandeSala } = useDemoData()
  const { moduloAttivo } = useModuli()
  return {
    richieste: richiesteRistorante.filter((r) => r.stato === 'da_confermare').length,
    comande: moduloAttivo('comande') ? comande.filter((c) => c.stato === 'in_attesa').length : 0,
    cucina: moduloAttivo('sala') ? daFareCucina(comandeSala) : 0,
    bar: moduloAttivo('bar-tavolo') ? codaBar(comande, comandeSala).daFare.length : 0,
  }
}

/**
 * Schede rapide del ruolo collegato (modulo attivo + permesso), nell'ordine del ruolo.
 * La Home (Panoramica, numeri di tutta la struttura) solo per chi gestisce: amministratore o chi vede le Impostazioni.
 */
export function useConHome() {
  const { puo, profilo } = useSessione()
  return !!profilo && (profilo.amministratore || puo('impostazioni'))
}

export function useSchedeRapide(): SchedaRapida[] {
  const { moduloAttivo } = useModuli()
  const { puo, profilo } = useSessione()
  const conHome = useConHome()
  const visibili = SCHEDE_RAPIDE.filter((s) => (s.id === 'home' ? conHome : moduloAttivo(s.modulo) && puo(s.modulo, s.minimo ?? 1)))
  const ordine = profilo && SCHEDE_PER_RUOLO[profilo.ruolo_id]
  if (!ordine) return visibili
  const prima = ordine.map((id) => visibili.find((s) => s.id === id)).filter((s): s is SchedaRapida => !!s)
  return [...prima, ...visibili.filter((s) => !prima.includes(s))]
}

/** La scheda è quella aperta se percorso e `?tab=` coincidono (Sala senza tab = Cameriere). */
export function schedaAttiva(s: SchedaRapida, pathname: string, search: string) {
  const [base, qs] = s.percorso.split('?')
  if (pathname !== base) return false
  const tab = new URLSearchParams(qs).get('tab')
  if (!tab) return true
  return (new URLSearchParams(search).get('tab') ?? 'cameriere') === tab
}

/** Voci del menu visibili all'utente (modulo attivo + permesso), con i sottomenu filtrati allo stesso modo. */
export function useVociMenu(): VoceNav[] {
  const { moduloAttivo } = useModuli()
  const { puo } = useSessione()
  const conHome = useConHome()
  const visibile = (m: VoceNav['modulo'], permesso?: 'utenti') => (m !== 'panoramica' || conHome) && moduloAttivo(m) && puo(permesso ?? m)
  return navigazione
    .map((v) => (v.figli ? { ...v, figli: v.figli.filter((f) => visibile(f.modulo, f.permesso)) } : v))
    .filter((v) => (v.figli ? v.figli.length > 0 : visibile(v.modulo)))
}
