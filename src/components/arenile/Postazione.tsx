import { Wrench } from 'lucide-react'
import type { Postazione as TPostazione } from '@/data/types'
import { canopyGradient, stiliStato } from '@/lib/arenile'
import { cn } from '@/lib/cn'

interface PostazioneProps {
  postazione: TPostazione
  selezionata: boolean
  attenuata: boolean
  onClick: (id: string) => void
}

/**
 * Una postazione vista dall'alto: canopy a spicchi (tele dell'ombrellone),
 * mozzo centrale col numero. Gazebo = quadrato arrotondato, tenda = più piccola.
 */
export function Postazione({ postazione: p, selezionata, attenuata, onClick }: PostazioneProps) {
  const stile = stiliStato[p.stato]
  const gazebo = p.tipologia === 'gazebo'
  const tenda = p.tipologia === 'tenda'
  const fuori = p.stato === 'fuori_servizio'

  return (
    <button
      type="button"
      onClick={() => onClick(p.id)}
      title={`${p.id} · ${stile.label}`}
      aria-label={`Postazione ${p.id}, ${stile.label}`}
      className={cn(
        'group relative grid place-items-center transition-transform duration-150',
        'h-9 w-9 sm:h-10 sm:w-10',
        'hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:outline-none',
        attenuata && 'opacity-20 saturate-50',
        selezionata && 'z-10 scale-110'
      )}
    >
      {/* canopy */}
      <span
        className={cn(
          'relative grid place-items-center shadow-[0_1px_2px_rgba(15,59,76,0.35)]',
          gazebo ? 'rounded-[6px]' : 'rounded-full',
          tenda ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-8 w-8 sm:h-9 sm:w-9',
          selezionata && 'ring-2 ring-profondo ring-offset-2 ring-offset-[#EDE2CC]'
        )}
        style={{ background: fuori ? stile.colore : canopyGradient(p.stato) }}
      >
        {/* mozzo centrale + numero */}
        <span
          className="num text-[11px] font-bold leading-none"
          style={{ color: stile.testo }}
        >
          {fuori ? <Wrench className="h-3.5 w-3.5" /> : p.numero}
        </span>
      </span>
    </button>
  )
}
