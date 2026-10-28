import { useNavigate } from 'react-router-dom'
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

/**
 * Contatori in tempo reale nella testata: le stesse code dei badge del menu, solo quelle che il ruolo vede.
 * Tocco = apre la sezione. Su telefono resta solo il contatore più alto.
 */
export function ContatoriTestata() {
  const conta = useConteggiNav()
  const voci = useVociMenu()
  const navigate = useNavigate()

  const visti = new Set<Badge>()
  const contatori: { badge: Badge; percorso: string; Icona: SottoVoce['icona'] }[] = []
  for (const v of voci) for (const f of v.figli ?? []) {
    if (!f.badge || visti.has(f.badge)) continue
    visti.add(f.badge)
    contatori.push({ badge: f.badge, percorso: f.percorso, Icona: f.icona })
  }
  if (contatori.length === 0) return null
  const principale = [...contatori].sort((a, b) => conta[b.badge] - conta[a.badge])[0].badge

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      {contatori.map(({ badge, percorso, Icona }) => {
        const n = conta[badge]
        return (
          <button
            key={badge}
            onClick={() => navigate(percorso)}
            title={`${n} ${etichetta[badge]}`}
            className={cn(
              'shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
              badge === principale ? 'flex' : 'hidden lg:flex',
              n > 0 ? 'border-tenda/40 bg-tenda/15 text-profondo' : 'border-calce-200 bg-white text-profondo/50',
            )}
          >
            {Icona && <Icona className="h-3.5 w-3.5" />}
            <span className="num">{n}</span>
            <span className="hidden sm:inline">{etichetta[badge]}</span>
          </button>
        )
      })}
    </div>
  )
}
