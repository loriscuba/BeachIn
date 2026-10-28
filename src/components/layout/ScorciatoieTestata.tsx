import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, ClipboardPlus, Plus } from 'lucide-react'
import { useVociMenu } from '@/hooks/useNavStaff'

/** Scorciatoie: compaiono solo se la voce del menu corrispondente è visibile al ruolo (modulo attivo + permesso). */
const SCORCIATOIE = [
  { id: 'prenotazione', testo: 'Nuova prenotazione', Icona: CalendarPlus, voce: '/ristorante?tab=prenotazioni', percorso: '/ristorante?tab=prenotazioni&nuova=1' },
  { id: 'comanda', testo: 'Nuova comanda', Icona: ClipboardPlus, voce: '/sala?tab=cameriere', percorso: '/sala?tab=cameriere' },
  { id: 'comanda', testo: 'Nuova comanda', Icona: ClipboardPlus, voce: '/comande', percorso: '/comande' },
]

/**
 * Testata, tra il logo del lido e la campanella: scorciatoie alle azioni più usate.
 * Su telefono stanno in un unico pulsante "+".
 */
export function ScorciatoieTestata() {
  const voci = useVociMenu()
  const navigate = useNavigate()
  const [aperto, setAperto] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aperto) return
    const chiudi = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setAperto(false) }
    document.addEventListener('pointerdown', chiudi)
    return () => document.removeEventListener('pointerdown', chiudi)
  }, [aperto])

  const sottovoci = voci.flatMap((v) => v.figli ?? [])
  const percorsi = new Set(sottovoci.map((f) => f.percorso))
  const scorciatoie = SCORCIATOIE.filter((s, i, tutte) => percorsi.has(s.voce) && tutte.findIndex((t) => t.id === s.id && percorsi.has(t.voce)) === i)

  const vai = (p: string) => { setAperto(false); navigate(p) }

  if (scorciatoie.length === 0) return null

  return (
    <div ref={box} className="relative flex min-w-0 items-center gap-1.5">
      {/* tablet e PC: scorciatoie in chiaro */}
      {scorciatoie.map(({ id, testo, Icona, percorso }) => (
        <button
          key={id}
          onClick={() => vai(percorso)}
          className="testata-pill hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold md:flex"
        >
          <Icona className="h-3.5 w-3.5" /> {testo}
        </button>
      ))}

      {/* telefono: un solo "+" che apre le scorciatoie */}
      <button
        onClick={() => setAperto((a) => !a)}
        aria-expanded={aperto}
        aria-label="Azioni rapide"
        className="testata-pill grid h-9 w-9 shrink-0 place-content-center rounded-full border md:hidden"
      >
        <Plus className="h-4 w-4" />
      </button>
      {aperto && (
        <div className="testata-menu absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border p-1.5 shadow-lg md:hidden">
          {scorciatoie.map(({ id, testo, Icona, percorso }) => (
            <button key={id} onClick={() => vai(percorso)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold">
              <Icona className="h-4 w-4" /> {testo}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
