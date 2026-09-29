import { cn } from '@/lib/cn'
import { config } from '@/data/config'
import logoApp from '@/assets/logo-app.png'

/** Marchio: logo dell'app (lo stesso del manifest) + BeachIn e nome del lido. */
export function Logo({ className, compatto }: { className?: string; compatto?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src={logoApp} alt={config.nome} className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-white/15" />
      {!compatto && (
        <span className="min-w-0 leading-tight">
          <span className="block text-[17px] font-extrabold tracking-tight text-white">
            Beach<span className="text-tenda">In</span>
          </span>
          <span className="block truncate text-xs font-medium text-white/60">{config.nome}</span>
        </span>
      )}
    </div>
  )
}
