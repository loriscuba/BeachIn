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
    'bg-profondo text-white hover:bg-profondo-600 active:bg-profondo-900 disabled:bg-profondo/40',
  secondario:
    'bg-white text-profondo border border-calce-200 hover:bg-calce hover:border-calce-300 disabled:opacity-50',
  fantasma:
    'bg-transparent text-profondo hover:bg-profondo/5 disabled:opacity-50',
  pericolo:
    'bg-boa text-white hover:bg-boa/90 active:bg-boa disabled:bg-boa/40',
}

const dimensioni: Record<Dimensione, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
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
