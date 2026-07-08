import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

type AlertVariant = 'info' | 'warning' | 'success' | 'danger'

const variantStyles: Record<AlertVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100',
  danger: 'border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100',
}

interface AlertBannerProps {
  title: string
  description?: string
  icon?: LucideIcon
  variant?: AlertVariant
  className?: string
}

export function AlertBanner({
  title,
  description,
  icon: Icon,
  variant = 'info',
  className,
}: AlertBannerProps) {
  return (
    <div className={cn('flex gap-3 rounded-xl border p-4 shadow-sm', variantStyles[variant], className)}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-80" />}
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
      </div>
    </div>
  )
}
