import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  className?: string
  tone?: 'default' | 'primary' | 'success' | 'warning'
}

const toneStyles = {
  default: 'from-muted/50 to-card',
  primary: 'from-primary/10 to-card',
  success: 'from-emerald-500/10 to-card',
  warning: 'from-amber-500/10 to-card',
}

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/15 text-primary',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  className,
  tone = 'default',
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden border-border/80 shadow-sm', className)}>
      <div className={cn('bg-gradient-to-br', toneStyles[tone])}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-3 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
          {Icon && (
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', iconStyles[tone])}>
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="text-xl font-bold tracking-tight">{value}</div>
          {description && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
