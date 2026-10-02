/**
 * "Aggiungi alla Home": su Android/Chrome banner con prompt nativo; su iPhone modal a schermo intero con i passi
 * (Safari non permette di aprire il proprio Condividi) e link "continua nel browser". Nascosto se già installata.
 */
import { useEffect, useState } from 'react'
import { Download, X, Share, PlusSquare, ArrowDown, Copy } from 'lucide-react'
import { isInstallata, isIos } from '@/lib/notifichePush'

const CHIAVE_SALTA = 'installa.saltato.v1'
// browser interni (Instagram, Facebook…): da lì non si può aggiungere alla Home, serve aprire in Safari
const inApp = () => /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|GSA\//i.test(navigator.userAgent)

type EventoInstalla = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function PulsanteInstalla({ nome }: { nome: string }) {
  const [evento, setEvento] = useState<EventoInstalla | null>(null)
  const [installata, setInstallata] = useState(isInstallata)
  const [chiuso, setChiuso] = useState(false)

  useEffect(() => {
    const prima = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalla) }
    const fatto = () => { setInstallata(true); setEvento(null) }
    window.addEventListener('beforeinstallprompt', prima)
    window.addEventListener('appinstalled', fatto)
    return () => { window.removeEventListener('beforeinstallprompt', prima); window.removeEventListener('appinstalled', fatto) }
  }, [])

  const ios = isIos()
  if (installata || chiuso || (!evento && !ios)) return null
  if (ios) return <ModalIos nome={nome} onSalta={() => setChiuso(true)} />

  const installa = async () => {
    if (!evento) return
    await evento.prompt()
    const { outcome } = await evento.userChoice
    setEvento(null)
    if (outcome === 'accepted') setInstallata(true)
  }

  return (
    <div className="mb-4 rounded-xl bg-tenda/90 p-3 text-profondo shadow">
      <div className="flex items-center gap-2">
        <button onClick={installa} className="flex flex-1 items-center gap-2 text-left text-sm font-semibold">
          <Download className="h-5 w-5 shrink-0" /> Aggiungi {nome} alla schermata Home
        </button>
        <button onClick={() => setChiuso(true)} className="grid h-7 w-7 place-content-center rounded-full hover:bg-black/10" aria-label="Chiudi"><X className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function ModalIos({ nome, onSalta }: { nome: string; onSalta: () => void }) {
  const [saltato] = useState(() => { try { return sessionStorage.getItem(CHIAVE_SALTA) === '1' } catch { return false } })
  const [copiato, setCopiato] = useState(false)
  if (saltato) return null
  const salta = () => { try { sessionStorage.setItem(CHIAVE_SALTA, '1') } catch { /* */ } onSalta() }
  const copia = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopiato(true) } catch { /* */ } }
  const icona = `${import.meta.env.BASE_URL}comandapp-icon-192.png`
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center bg-profondo px-6 pb-6 pt-12 text-center text-white">
      <img src={icona} alt="" className="h-20 w-20 rounded-2xl shadow-lg" />
      <h2 className="mt-4 font-display text-2xl font-semibold">Installa {nome}</h2>
      <p className="mt-1 text-sm text-white/70">Aggiungila alla schermata Home per ordinare dall'ombrellone come una vera app.</p>
      {inApp() ? (
        <div className="mt-8 w-full max-w-xs rounded-xl bg-white/10 p-4 text-sm">
          <p>Questo browser non permette l'installazione. Apri il link in <b>Safari</b>.</p>
          <button onClick={copia} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-tenda px-4 py-2 font-semibold text-profondo">
            <Copy className="h-4 w-4" /> {copiato ? 'Link copiato!' : 'Copia il link'}
          </button>
        </div>
      ) : (
        <ol className="mt-8 w-full max-w-xs space-y-3 text-left text-sm">
          <li className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <span className="grid h-7 w-7 shrink-0 place-content-center rounded-full bg-tenda font-bold text-profondo">1</span>
            <span>Tocca <Share className="mx-0.5 inline h-4 w-4 text-tenda" /> <b>Condividi</b> nella barra di Safari</span>
          </li>
          <li className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <span className="grid h-7 w-7 shrink-0 place-content-center rounded-full bg-tenda font-bold text-profondo">2</span>
            <span>Scorri e scegli <PlusSquare className="mx-0.5 inline h-4 w-4 text-tenda" /> <b>Aggiungi alla schermata Home</b></span>
          </li>
          <li className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <span className="grid h-7 w-7 shrink-0 place-content-center rounded-full bg-tenda font-bold text-profondo">3</span>
            <span>Apri <b>{nome}</b> dall'icona sulla Home</span>
          </li>
        </ol>
      )}
      <button onClick={salta} className="mt-auto text-xs text-white/50 underline">continua nel browser</button>
      {!inApp() && <ArrowDown className="mt-2 h-8 w-8 animate-bounce text-tenda" aria-hidden />}
    </div>
  )
}
