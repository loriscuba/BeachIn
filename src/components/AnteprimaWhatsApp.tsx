import { useEffect, useState } from 'react'
import { X, Phone, Video, ExternalLink } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { ding } from '@/lib/suoni'

/** Numero per wa.me: solo cifre, con prefisso 39 se manca. */
function numeroWa(tel: string) {
  const n = tel.replace(/\D/g, '').replace(/^00/, '')
  return n.length <= 10 ? `39${n}` : n
}

/** Testo WhatsApp (*grassetto*) reso in HTML semplice. */
function Testo({ t }: { t: string }) {
  return <>{t.split(/(\*[^*]+\*)/g).map((p, i) => (p.startsWith('*') && p.endsWith('*') ? <b key={i}>{p.slice(1, -1)}</b> : p))}</>
}

function Spunte({ lette }: { lette: boolean }) {
  return (
    <svg viewBox="0 0 16 11" className="inline h-3 w-4 transition-colors duration-500" fill={lette ? '#53bdeb' : '#8696a0'} aria-label={lette ? 'Letto' : 'Consegnato'}>
      <path d="M11.07.65 4.5 7.22 1.93 4.65.86 5.72 4.5 9.36l7.64-7.64zM14.07.65 7.5 7.22l-.57-.57-1.07 1.07 1.64 1.64 7.64-7.64z" />
    </svg>
  )
}

/**
 * Anteprima a video della risposta WhatsApp al cliente (demo): cornice di telefono
 * con la chat, "sta scrivendo…", messaggio e spunte che diventano blu.
 * Il pulsante apre il vero WhatsApp (wa.me) con numero e testo già compilati.
 */
export function AnteprimaWhatsApp() {
  const { whatsapp: m, chiudiWhatsapp } = useDemoData()
  const [fase, setFase] = useState<'scrive' | 'inviato' | 'letto'>('scrive')
  useEffect(() => {
    if (!m) return
    setFase('scrive')
    const t1 = setTimeout(() => { setFase('inviato'); ding() }, 1100)
    const t2 = setTimeout(() => setFase('letto'), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [m])
  if (!m) return null
  const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const link = `https://wa.me/${numeroWa(m.telefono)}?text=${encodeURIComponent(m.testo.replace(/\*/g, ''))}`
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[300px] max-w-[calc(100vw-2rem)]" role="dialog" aria-label="Messaggio WhatsApp al cliente">
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-neutral-900 bg-neutral-900 shadow-2xl">
        {/* intestazione chat */}
        <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5 text-white">
          <div className="grid h-8 w-8 shrink-0 place-content-center rounded-full bg-tenda text-xs font-bold text-profondo">LP</div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{config.nome}</p>
            <p className="truncate text-[11px] text-white/75">{fase === 'scrive' ? 'sta scrivendo…' : `a ${m.nome} · ${m.telefono || 'senza numero'}`}</p>
          </div>
          <Video className="h-4 w-4 opacity-80" /><Phone className="h-4 w-4 opacity-80" />
          <button onClick={chiudiWhatsapp} className="ml-1 rounded-full p-0.5 hover:bg-white/15" aria-label="Chiudi"><X className="h-4 w-4" /></button>
        </div>
        {/* chat */}
        <div className="min-h-[170px] bg-[#efe7dd] px-3 py-3">
          <p className="mx-auto mb-2 w-fit rounded-md bg-white/80 px-2 py-0.5 text-[10px] uppercase text-neutral-500">Oggi</p>
          {fase === 'scrive' ? (
            <div className="ml-auto w-fit rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-neutral-500">
              <span className="inline-flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:.3s]" /></span>
            </div>
          ) : (
            <div className="ml-auto max-w-[92%] whitespace-pre-line rounded-lg rounded-tr-none bg-[#d9fdd3] px-2.5 pb-1 pt-1.5 text-[13px] leading-snug text-neutral-800 shadow-sm">
              <Testo t={m.testo} />
              <span className="ml-2 float-right mt-1 flex items-center gap-0.5 text-[10px] text-neutral-500">{ora} <Spunte lette={fase === 'letto'} /></span>
            </div>
          )}
        </div>
        {/* azioni */}
        <div className="flex gap-2 bg-white px-3 py-2.5">
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#25d366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1ebe5a]">
            <ExternalLink className="h-3.5 w-3.5" /> Invia davvero su WhatsApp
          </a>
        </div>
      </div>
      <p className="mt-1 text-center text-[10px] text-profondo/50">Anteprima demo · {m.esito === 'richiesta' ? 'ricevuta della richiesta' : m.esito === 'conferma' ? 'conferma' : 'rifiuto'} inviato al cliente</p>
    </div>
  )
}
