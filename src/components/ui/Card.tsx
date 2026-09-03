import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-calce-200 rounded-card shadow-card',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  titolo: ReactNode
  sottotitolo?: ReactNode
  azione?: ReactNode
  className?: string
}

export function CardHeader({ titolo, sottotitolo, azione, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-4 pt-4', className)}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-profondo leading-tight">{titolo}</h3>
        {sottotitolo && (
          <p className="text-xs text-profondo/55 mt-0.5">{sottotitolo}</p>
        )}
      </div>
      {azione && <div className="shrink-0">{azione}</div>}
    </div>
  )
}

export function CardBody({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn('p-4', className)} {...rest}>
      {children}
    </div>
  )
}
