/**
 * Ordine dal telefono col QR fisso del tavolo (rotta pubblica `/tavolo?c=<codice>`, fuori dallo shell).
 * Il codice individua il tavolo (`tavoliQr`); si ordina solo se il cameriere ha aperto il tavolo, così chi ha
 * la foto del QR non può ordinare da fuori. La pagina resta legata al conto (seduta) che ha trovato aperto: chiuso
 * il conto, chi la tiene aperta non ordina più sul conto dei clienti successivi. Menu = quello scelto per il tavolo in Comande sala → QR tavoli.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, QrCode } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { logoLido } from '@/assets/sito'
import TabletSelf from './sala/TabletSelf'

export default function TavoloQR() {
  const [params] = useSearchParams()
  const codice = params.get('c') ?? ''
  const { tavoliQr } = useDemoData()
  const q = tavoliQr.find((x) => x.codice === codice)
  // con Supabase i QR arrivano dopo il primo caricamento: si aspetta un attimo prima di dire «non valido»
  const [attesa, setAttesa] = useState(true)
  useEffect(() => { const t = window.setTimeout(() => setAttesa(false), 4000); return () => window.clearTimeout(t) }, [])

  const [seduta, setSeduta] = useState<string>()
  useEffect(() => { if (q?.aperto && !seduta) setSeduta(q.seduta ?? '') }, [q?.aperto, q?.seduta, seduta])
  const scaduta = !!q && seduta !== undefined && (q.seduta ?? '') !== seduta

  if (q?.aperto && !scaduta) return <TabletSelf qr seduta={seduta} stato={{ tavolo: q.numero, pin: '', menu: q.menu }} onEsci={() => {}} />
  return (
    <div className="grid min-h-screen place-content-center bg-[#F6EFE3] p-8 text-center text-[#3B2A20]">
      <img src={logoLido} alt={config.nome} className="mx-auto h-24 w-auto" />
      {q && scaduta ? (
        <>
          <Lock className="mx-auto mt-6 h-8 w-8 text-[#1F6A84]" />
          <h1 className="mt-3 font-display text-3xl italic">Conto chiuso</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[#3B2A20]/70">Grazie della visita! Per ordinare di nuovo al tavolo {q.numero} inquadra ancora il QR.</p>
        </>
      ) : q ? (
        <>
          <Lock className="mx-auto mt-6 h-8 w-8 text-[#1F6A84]" />
          <h1 className="mt-3 font-display text-3xl italic">Tavolo {q.numero}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[#3B2A20]/70">Il tavolo non è ancora aperto. Chiedi al cameriere di farti accomodare: poi potrai ordinare da qui.</p>
        </>
      ) : (
        <>
          <QrCode className="mx-auto mt-6 h-8 w-8 text-[#1F6A84]" />
          <p className="mx-auto mt-3 max-w-xs text-sm text-[#3B2A20]/70">{attesa ? 'Un attimo, apriamo il menu del tavolo…' : 'Questo QR non è valido. Chiedi al personale di sala.'}</p>
        </>
      )}
    </div>
  )
}
