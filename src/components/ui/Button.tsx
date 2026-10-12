import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variante = 'primario' | 'secondario' | 'fantasma' | 'pericolo'
type Dimensione = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  dimensione?: Dimensione
  bloccato?: boolean
}

const varianti: Record<Variante, string> = {
  primario:
    'bg-gradient-to-br from-profondo to-cabina text-white shadow-[0_8px_20px_-10px_rgba(46,125,154,0.8)] hover:brightness-110 active:brightness-95 disabled:opacity-50',
  secondario:
    'bg-white text-profondo border border-calce-200 hover:bg-calce hover:border-calce-300 disabled:opacity-50',
  fantasma:
    'bg-transparent text-profondo hover:bg-profondo/5 disabled:opacity-50',
  pericolo:
    'bg-gradient-to-br from-boa to-[#F07A4E] text-white shadow-[0_8px_20px_-10px_rgba(228,87,46,0.8)] hover:brightness-110 disabled:opacity-50',
}

const dimensioni: Record<Dimensione, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-full',
  md: 'h-10 px-5 text-sm gap-2 rounded-full',
  lg: 'h-12 px-6 text-base gap-2 rounded-full',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = 'secondario', dimensione = 'md', bloccato, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors select-none',
        'focus-visible:focus-ring disabled:cursor-not-allowed',
        varianti[variante],
        dimensioni[dimensione],
        bloccato && 'w-full',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
