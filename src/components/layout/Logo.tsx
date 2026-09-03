import { cn } from '@/lib/cn'

/** Marchio BeachIn: ombrellone visto di fronte + testo. */
export function Logo({ className, compatto }: { className?: string; compatto?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 32 32"
        className="h-8 w-8 shrink-0"
        role="img"
        aria-label="BeachIn"
      >
        <rect width="32" height="32" rx="8" fill="#0F3B4C" />
        <path d="M16 6C9 6 4.5 10 4 14h24C27.5 10 23 6 16 6Z" fill="#E4572E" />
        <path d="M16 6c-3 0-5 3.5-5.5 8H16Z" fill="#F2C14E" />
        <path d="M16 6c3 0 5 3.5 5.5 8H16Z" fill="#F2C14E" />
        <rect x="15.2" y="6" width="1.6" height="20" rx="0.8" fill="#EDF1F2" />
        <rect x="4" y="24" width="24" height="3" rx="1.5" fill="#7FB7A8" />
      </svg>
      {!compatto && (
        <span className="text-[17px] font-extrabold tracking-tight text-white">
          Beach<span className="text-tenda">In</span>
        </span>
      )}
    </div>
  )
}
