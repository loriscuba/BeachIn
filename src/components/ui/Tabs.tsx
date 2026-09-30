import { cn } from '@/lib/cn'

interface TabsProps<T extends string> {
  opzioni: { valore: T; etichetta: string; badge?: number }[]
  valore: T
  onChange: (v: T) => void
  className?: string
}

/** Segmented control sobrio. */
export function Tabs<T extends string>({ opzioni, valore, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('inline-flex max-w-full overflow-x-auto rounded-lg border border-calce-200 bg-white p-0.5', className)}>
      {opzioni.map((o) => (
        <button
          key={o.valore}
          onClick={() => onChange(o.valore)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            valore === o.valore ? 'bg-profondo text-white' : 'text-profondo/60 hover:text-profondo'
          )}
        >
          {o.etichetta}
          {!!o.badge && <span className="num grid h-5 min-w-5 place-content-center rounded-full bg-boa px-1.5 text-[11px] font-bold leading-none text-white">{o.badge}</span>}
        </button>
      ))}
    </div>
  )
}
