import { supabase } from '@/lib/supabase'

/**
 * Utenti online per IPA Monitor: finché la pagina è visibile e c'è un utente dello staff collegato,
 * un segnale al minuto (beachin.monitor_segnale, migrazione 0014). Errori ignorati.
 */
async function segnala() {
  if (!supabase || document.hidden) return
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session) await supabase.rpc('monitor_segnale')
  } catch { /* */ }
}

export function avviaPresenza() {
  if (!supabase) return
  void segnala()
  setInterval(segnala, 60_000)
  document.addEventListener('visibilitychange', () => void segnala())
}
