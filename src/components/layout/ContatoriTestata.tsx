import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, ClipboardPlus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useConteggiNav, useVociMenu } from '@/hooks/useNavStaff'
import type { SottoVoce } from '@/config/navigazione'

type Badge = NonNullable<SottoVoce['badge']>

const etichetta: Record<Badge, string> = {
  richieste: 'da confermare',
  comande: 'ombrelloni',
  cucina: 'in cucina',
  bar: 'coda bar',
}

/** Scorciatoie: compaiono solo se la voce del menu corrispondente è visibile al ruolo (modulo attivo + permesso). */
const SCORCIATOIE = [
  { id: 'prenotazione', testo: 'Nuova prenotazione', Icona: CalendarPlus, voce: '/ristorante?tab=prenotazioni', percorso: '/ristorante?tab=prenotazioni&nuova=1' },
  { id: 'comanda', testo: 'Nuova comanda', Icona: ClipboardPlus, voce: '/sala?tab=cameriere', percorso: '/sala?tab=cameriere' },
  { id: 'comanda', testo: 'Nuova comanda', Icona: ClipboardPlus, voce: '/comande', percorso: '/comande' },
]

/**
 * Testata, tra il logo del lido e la campanella: il contatore più alto (stesse code dei badge del menu)
 * e le scorciatoie alle azioni più usate. Su telefono le scorciatoie stanno in un unico pulsante "+".
 */
export function ContatoriTestata() {
  const conta = useConteggiNav()
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
  const contatori = sottovoci.filter((f): f is SottoVoce & { badge: Badge } => !!f.badge)
  const principale = [...contatori].sort((a, b) => conta[b.badge] - conta[a.badge])[0]
  const percorsi = new Set(sottovoci.map((f) => f.percorso))
  const scorciatoie = SCORCIATOIE.filter((s, i, tutte) => percorsi.has(s.voce) && tutte.findIndex((t) => t.id === s.id && percorsi.has(t.voce)) === i)

  const vai = (p: string) => { setAperto(false); navigate(p) }

  if (!principale && scorciatoie.length === 0) return null
  const n = principale ? conta[principale.badge] : 0
  const IconaConta = principale?.icona

  return (
    <div ref={box} className="relative flex min-w-0 items-center gap-1.5">
      {principale && (
        <button
          onClick={() => vai(principale.percorso)}
          title={`${n} ${etichetta[principale.badge]}`}
          className={cn('testata-pill flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', n > 0 && 'attiva')}
        >
          {IconaConta && <IconaConta className="h-3.5 w-3.5" />}
          <span className="num">{n}</span>
          <span className="hidden sm:inline">{etichetta[principale.badge]}</span>
        </button>
      )}

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
      {scorciatoie.length > 0 && (
        <button
          onClick={() => setAperto((a) => !a)}
          aria-expanded={aperto}
          aria-label="Azioni rapide"
          className="testata-pill grid h-7 w-7 shrink-0 place-content-center rounded-full border md:hidden"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
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
