/**
 * Ordine dal telefono col QR fisso del tavolo (rotta pubblica `/tavolo?c=<codice>`, fuori dallo shell).
 * Il codice individua il tavolo (`tavoliQr`); si ordina solo se il cameriere ha aperto il tavolo, così chi ha
 * la foto del QR non può ordinare da fuori. Menu = quello scelto per il tavolo in Comande sala → QR tavoli.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, QrCode } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import TabletSelf from './sala/TabletSelf'

export default function TavoloQR() {
  const [params] = useSearchParams()
  const codice = params.get('c') ?? ''
  const { tavoliQr } = useDemoData()
  const q = tavoliQr.find((x) => x.codice === codice)
  // con Supabase i QR arrivano dopo il primo caricamento: si aspetta un attimo prima di dire «non valido»
  const [attesa, setAttesa] = useState(true)
  useEffect(() => { const t = window.setTimeout(() => setAttesa(false), 4000); return () => window.clearTimeout(t) }, [])

  if (q?.aperto) return <TabletSelf qr stato={{ tavolo: q.numero, pin: '', menu: q.menu }} onEsci={() => {}} />
  return (
    <div className="grid min-h-screen place-content-center bg-[#0E2A22] p-8 text-center text-[#F3EBDD]">
      <p className="font-gesso text-4xl text-[#D9B66A]">{config.nome}</p>
      {q ? (
        <>
          <Lock className="mx-auto mt-6 h-8 w-8 text-[#D9B66A]/80" />
          <h1 className="mt-3 font-display text-3xl italic">Tavolo {q.numero}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[#F3EBDD]/70">Il tavolo non è ancora aperto. Chiedi al cameriere di farti accomodare: poi potrai ordinare da qui.</p>
        </>
      ) : (
        <>
          <QrCode className="mx-auto mt-6 h-8 w-8 text-[#D9B66A]/80" />
          <p className="mx-auto mt-3 max-w-xs text-sm text-[#F3EBDD]/70">{attesa ? 'Un attimo, apriamo il menu del tavolo…' : 'Questo QR non è valido. Chiedi al personale di sala.'}</p>
        </>
      )}
    </div>
  )
}
