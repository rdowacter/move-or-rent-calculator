import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResultSectionProps {
  icon: LucideIcon
  title: string
  description?: string
  accentColor: string  // Tailwind border color class, e.g. 'border-red-400'
  iconColor?: string   // Tailwind text color class for the icon
  children: ReactNode
  className?: string
}

export function ResultSection({ icon: Icon, title, description, accentColor, iconColor, children, className }: ResultSectionProps) {
  return (
    <div className={cn('border-l-4 pl-5 py-1', accentColor, className)}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className={cn('h-5 w-5', iconColor || 'text-muted-foreground')} />
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}
