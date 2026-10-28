import { useEffect, useState } from 'react'
import { BellPlus, BellRing, Share } from 'lucide-react'
import { attivaPush, statoPush, type AppPush, type StatoPush } from '@/lib/notifichePush'

const RIMANDA_GIORNI = 3
const chiaveRimandata = (app: AppPush) => `beachin.push.${app}.rimandata`

/**
 * Invito all'entrata dell'app: finestra che chiede di attivare le notifiche (il permesso del browser
 * va chiesto da un tocco, non in automatico). "Non ora" la nasconde per qualche giorno.
 */
export function InvitoNotifiche({ app, titolo, descrizione }: { app: AppPush; titolo: string; descrizione: string }) {
  const [stato, setStato] = useState<StatoPush>()
  const [errore, setErrore] = useState<string>()
  const [lavoro, setLavoro] = useState(false)
  const [chiuso, setChiuso] = useState(() => {
    try { return Date.now() - Number(localStorage.getItem(chiaveRimandata(app)) ?? 0) < RIMANDA_GIORNI * 864e5 } catch { return false }
  })
  useEffect(() => { statoPush(app).then(setStato).catch(() => setStato('non-supportato')) }, [])
  if (chiuso || (stato !== 'da-attivare' && stato !== 'serve-installazione')) return null
  const nonOra = () => { try { localStorage.setItem(chiaveRimandata(app), String(Date.now())) } catch { /* */ } setChiuso(true) }
  const attiva = async () => {
    setLavoro(true); setErrore(undefined)
    try {
      const s = await attivaPush(app)
      if (s === 'attivo' || s === 'negato') setChiuso(true)
      else setStato(s)
    } catch (e) { setErrore((e as Error).message) } finally { setLavoro(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-xl">
        <span className="mx-auto grid h-14 w-14 place-content-center rounded-full bg-tenda/30"><BellRing className="h-7 w-7 text-cabina" /></span>
        <p className="mt-3 font-display text-xl font-semibold text-profondo">{titolo}</p>
        <p className="mt-1 text-sm text-profondo/70">
          {stato === 'serve-installazione'
            ? <>Su iPhone: tocca <Share className="inline h-4 w-4" /> <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>, poi apri l'app dall'icona per attivare le notifiche.</>
            : descrizione}
        </p>
        {stato === 'da-attivare' && (
          <button onClick={attiva} disabled={lavoro} className="mt-4 h-12 w-full rounded-xl bg-cabina font-semibold text-white disabled:opacity-60">{lavoro ? 'Attivazione…' : 'Attiva notifiche'}</button>
        )}
        {errore && <p className="mt-2 text-xs text-boa">Errore: {errore}</p>}
        <button onClick={nonOra} className="mt-2 h-10 w-full rounded-xl text-sm font-medium text-profondo/60">{stato === 'da-attivare' ? 'Non ora' : 'Ho capito'}</button>
      </div>
    </div>
  )
}

/**
 * Campanella in testata: attiva le notifiche quando si vuole (anche dopo "Non ora"). Un tocco con le notifiche già attive
 * rinnova l'iscrizione sul server, utile se il telefono risulta attivo ma non riceve più nulla.
 */
export function CampanellaNotifiche({ app }: { app: AppPush }) {
  const [stato, setStato] = useState<StatoPush>()
  const [avviso, setAvviso] = useState<string>()
  const [lavoro, setLavoro] = useState(false)
  useEffect(() => { statoPush(app).then(setStato).catch(() => setStato('non-supportato')) }, [])
  if (!stato || stato === 'senza-server') return null
  const mostra = (t: string) => { setAvviso(t); window.setTimeout(() => setAvviso(undefined), 5000) }
  const tocca = async () => {
    if (stato === 'serve-installazione') return mostra('Su iPhone: Condividi → Aggiungi alla schermata Home, poi apri l\'app dall\'icona e tocca di nuovo la campanella.')
    if (stato === 'non-supportato') return mostra('Questo browser non supporta le notifiche.')
    if (stato === 'negato') return mostra('Notifiche bloccate: riattivale da Impostazioni → Notifiche del telefono.')
    setLavoro(true)
    try {
      const s = await attivaPush(app)
      setStato(s)
      mostra(s === 'attivo' ? 'Notifiche attive: ti avvisiamo per news e lavagna del giorno.' : 'Notifiche non attivate.')
    } catch (e) { mostra(`Errore: ${(e as Error).message}`) } finally { setLavoro(false) }
  }
  const attivo = stato === 'attivo'
  return (
    <div className="relative">
      <button onClick={tocca} disabled={lavoro} aria-label={attivo ? 'Notifiche attive' : 'Attiva notifiche'}
        className={`grid h-9 w-9 place-content-center rounded-full ${attivo ? 'bg-tenda/40 text-profondo' : 'bg-boa text-white'} disabled:opacity-60`}>
        {attivo ? <BellRing className="h-4 w-4" /> : <BellPlus className="h-4 w-4" />}
      </button>
      {avviso && <p className="absolute right-0 top-11 z-30 w-64 rounded-xl bg-profondo px-3 py-2 text-xs text-white shadow-lg">{avviso}</p>}
    </div>
  )
}
