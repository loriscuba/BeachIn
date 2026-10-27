import { cn } from '@/lib/cn'

/** Foto profilo tonda (come su WhatsApp); senza foto mostra le iniziali. */
export function Avatar({ nome, foto, className }: { nome: string; foto?: string | null; className?: string }) {
  // solo le parole che iniziano con una lettera (es. "Luca (bar)" → L, non "L(")
  const iniziali = nome.trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p)).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
  return foto ? (
    <img src={foto} alt={nome} className={cn('h-9 w-9 shrink-0 rounded-full object-cover', className)} />
  ) : (
    <span className={cn('grid h-9 w-9 shrink-0 place-content-center rounded-full bg-cabina/15 text-xs font-semibold text-cabina', className)}>
      {iniziali || '?'}
    </span>
  )
}
