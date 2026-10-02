/** Pulsante "Aggiungi alla Home": prompt nativo su Android/Chrome, istruzioni su iOS; nascosto se già installata. */
import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { isInstallata, isIos } from '@/lib/notifichePush'

type EventoInstalla = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function PulsanteInstalla({ nome }: { nome: string }) {
  const [evento, setEvento] = useState<EventoInstalla | null>(null)
  const [installata, setInstallata] = useState(isInstallata)
  const [chiuso, setChiuso] = useState(false)
  const [guidaIos, setGuidaIos] = useState(false)

  useEffect(() => {
    const prima = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalla) }
    const fatto = () => { setInstallata(true); setEvento(null) }
    window.addEventListener('beforeinstallprompt', prima)
    window.addEventListener('appinstalled', fatto)
    return () => { window.removeEventListener('beforeinstallprompt', prima); window.removeEventListener('appinstalled', fatto) }
  }, [])

  const ios = isIos()
  if (installata || chiuso || (!evento && !ios)) return null

  const installa = async () => {
    if (!evento) { setGuidaIos((v) => !v); return }
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
      {guidaIos && (
        <p className="mt-2 text-xs">
          In Safari tocca <Share className="inline h-3.5 w-3.5" /> <b>Condividi</b> e poi <b>Aggiungi alla schermata Home</b>.
        </p>
      )}
    </div>
  )
}
