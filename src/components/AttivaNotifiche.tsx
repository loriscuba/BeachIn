import { useEffect, useState } from 'react'
import { BellRing, Share } from 'lucide-react'
import { attivaPush, statoPush, type AppPush, type StatoPush } from '@/lib/notifichePush'

/** Riquadro per attivare le notifiche push sul telefono (anche a schermo bloccato). */
export default function AttivaNotifiche({ app, descrizione }: { app: AppPush; descrizione: string }) {
  const [stato, setStato] = useState<StatoPush>()
  const [errore, setErrore] = useState<string>()
  const [lavoro, setLavoro] = useState(false)
  useEffect(() => { statoPush(app).then(setStato).catch(() => setStato('non-supportato')) }, [])
  if (!stato || stato === 'attivo') {
    return stato === 'attivo' ? <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-acqua"><BellRing className="h-3.5 w-3.5" /> Notifiche attive su questo telefono</p> : null
  }
  const testo: Record<Exclude<StatoPush, 'attivo'>, React.ReactNode> = {
    'da-attivare': descrizione,
    'serve-installazione': <>Su iPhone: tocca <Share className="inline h-4 w-4" /> <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>, poi apri l'app dall'icona e attiva qui le notifiche.</>,
    negato: 'Le notifiche sono bloccate: riattivale dalle impostazioni del browser/telefono per questo sito.',
    'non-supportato': 'Questo browser non supporta le notifiche push. Usa Chrome (Android) o Safari con l’app aggiunta alla Home (iPhone).',
    'senza-server': 'Le notifiche richiedono Supabase configurato (modalità demo locale attiva).',
  }
  const attiva = async () => {
    setLavoro(true); setErrore(undefined)
    try { setStato(await attivaPush(app)) } catch (e) { setErrore((e as Error).message) } finally { setLavoro(false) }
  }
  return (
    <div className="mb-4 rounded-2xl border border-tenda/60 bg-tenda/15 p-4">
      <p className="flex items-start gap-2 text-sm text-profondo"><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-cabina" /> <span>{testo[stato]}</span></p>
      {stato === 'da-attivare' && (
        <button onClick={attiva} disabled={lavoro} className="mt-3 h-11 w-full rounded-xl bg-cabina font-semibold text-white disabled:opacity-60">{lavoro ? 'Attivazione…' : 'Attiva notifiche'}</button>
      )}
      {errore && <p className="mt-2 text-xs text-boa">Errore: {errore}</p>}
    </div>
  )
}

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
