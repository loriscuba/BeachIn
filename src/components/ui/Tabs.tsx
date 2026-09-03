import { cn } from '@/lib/cn'

interface TabsProps<T extends string> {
  opzioni: { valore: T; etichetta: string }[]
  valore: T
  onChange: (v: T) => void
  className?: string
}

/** Segmented control sobrio. */
export function Tabs<T extends string>({ opzioni, valore, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('inline-flex rounded-lg border border-calce-200 bg-white p-0.5', className)}>
      {opzioni.map((o) => (
        <button
          key={o.valore}
          onClick={() => onChange(o.valore)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            valore === o.valore ? 'bg-profondo text-white' : 'text-profondo/60 hover:text-profondo'
          )}
        >
          {o.etichetta}
        </button>
      ))}
    </div>
  )
}
