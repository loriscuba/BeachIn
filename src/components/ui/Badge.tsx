import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tono = 'neutro' | 'mare' | 'acqua' | 'tenda' | 'boa' | 'stagionale' | 'spento'

const toni: Record<Tono, string> = {
  neutro: 'bg-calce-200 text-profondo',
  mare: 'bg-profondo/10 text-profondo',
  acqua: 'bg-acqua/25 text-profondo',
  tenda: 'bg-tenda/25 text-[#7A5A12]',
  boa: 'bg-boa/15 text-boa',
  stagionale: 'bg-cabina/15 text-cabina',
  spento: 'bg-calce-200 text-profondo/50',
}

interface BadgeProps {
  children: ReactNode
  tono?: Tono
  /** Pallino colorato a sinistra (usa currentColor del tono) */
  puntino?: boolean
  className?: string
}

export function Badge({ children, tono = 'neutro', puntino, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        toni[tono],
        className
      )}
    >
      {puntino && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  )
}
