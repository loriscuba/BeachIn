import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Opzione {
  valore: string
  etichetta: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  opzioni: Opzione[]
}

export function Select({ opzioni, className, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-9 w-full appearance-none rounded-lg border border-calce-200 bg-white pl-3 pr-8 text-sm text-profondo',
          'focus-visible:focus-ring',
          className
        )}
        {...rest}
      >
        {opzioni.map((o) => (
          <option key={o.valore} value={o.valore}>
            {o.etichetta}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-profondo/40" />
    </div>
  )
}
