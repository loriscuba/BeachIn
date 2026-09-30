import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { Button } from '@/components/ui/Button'
import { campanello, sbloccaAudio } from '@/lib/suoni'

/** Campanella in alto a destra: richieste tavolo dal sito da confermare, con suono e avviso all'arrivo. */
export function CentroNotifiche() {
  const { richiesteRistorante, confermaRistorante, rifiutaRistorante } = useDemoData()
  const { moduloAttivo } = useModuli()
  const naviga = useNavigate()
  const [aperto, setAperto] = useState(false)
  const [avviso, setAvviso] = useState<string | null>(null)
  const viste = useRef<Set<string> | null>(null)
  const pannello = useRef<HTMLDivElement>(null)

  const daConfermare = richiesteRistorante
    .filter((r) => r.stato === 'da_confermare')
    .sort((a, b) => (a.data + a.turno).localeCompare(b.data + b.turno))

  // Richiesta nuova (non vista prima) → campanello + avviso. Al primo caricamento niente suono.
  useEffect(() => {
    const ids = new Set(daConfermare.map((r) => r.id))
    if (viste.current) {
      const nuova = daConfermare.find((r) => !viste.current!.has(r.id))
      if (nuova) {
        campanello()
        setAvviso(`Nuova richiesta: ${nuova.nome} · ${nuova.coperti} pers. · ${format(parseISO(nuova.data), 'EEE d MMM', { locale: itLocale })} ${nuova.turno}`)
      }
    }
    viste.current = ids
  }, [daConfermare.map((r) => r.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!avviso) return
    const t = setTimeout(() => setAvviso(null), 6000)
    return () => clearTimeout(t)
  }, [avviso])

  // Chiude il pannello cliccando fuori.
  useEffect(() => {
    if (!aperto) return
    const fuori = (e: MouseEvent) => { if (!pannello.current?.contains(e.target as Node)) setAperto(false) }
    document.addEventListener('mousedown', fuori)
    return () => document.removeEventListener('mousedown', fuori)
  }, [aperto])

  if (!moduloAttivo('ristorante')) return null
  const n = daConfermare.length
  const vai = (data: string) => { setAperto(false); naviga(`/ristorante?giorno=${data}`) }

  return (
    <div ref={pannello} className="relative">
      <button
        type="button"
        onClick={() => { sbloccaAudio(); setAperto(!aperto) }}
        className="relative rounded-lg p-2 text-profondo hover:bg-profondo/5"
        aria-label={`Notifiche: ${n} da confermare`}
        title="Richieste da confermare"
      >
        <Bell className={n > 0 ? 'h-5 w-5 text-boa' : 'h-5 w-5'} />
        {n > 0 && <span className="num absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-content-center rounded-full bg-boa px-1 text-[11px] font-bold text-white">{n}</span>}
      </button>

      {aperto && (
        <div className="fixed inset-x-3 top-16 z-40 rounded-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px] border border-calce-200 bg-white p-2 shadow-xl">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-profondo/55">Dal sito · da confermare</p>
          {n === 0 && <p className="px-2 py-4 text-sm text-profondo/50">Nessuna richiesta in attesa.</p>}
          <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {daConfermare.map((r) => (
              <li key={r.id} className="rounded-lg bg-calce/60 px-3 py-2">
                <button type="button" onClick={() => vai(r.data)} className="block w-full text-left">
                  <p className="text-sm font-semibold text-profondo">{r.nome} · {r.coperti} pers.</p>
                  <p className="text-xs capitalize text-profondo/60">{format(parseISO(r.data), 'EEEE d MMMM', { locale: itLocale })} · {r.turno}{r.telefono && <> · {r.telefono}</>}</p>
                  {r.note && <p className="truncate text-xs text-profondo/50">{r.note}</p>}
                </button>
                <div className="mt-2 flex gap-1.5">
                  <Button dimensione="sm" onClick={() => rifiutaRistorante(r.id)}><X className="h-4 w-4 text-boa" /> Rifiuta</Button>
                  <Button dimensione="sm" variante="primario" onClick={() => confermaRistorante(r.id)}><Check className="h-4 w-4" /> Conferma</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {avviso && (
        <button
          type="button"
          onClick={() => { setAvviso(null); setAperto(true) }}
          className="fixed right-4 top-20 z-50 flex max-w-[92vw] items-center gap-2 rounded-xl bg-profondo px-4 py-3 text-left text-sm font-medium text-white shadow-2xl"
        >
          <Bell className="h-4 w-4 shrink-0 text-tenda" /> {avviso}
        </button>
      )}
    </div>
  )
}
