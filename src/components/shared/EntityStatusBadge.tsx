import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface EntityStatusBadgeProps {
  status: string
  className?: string
}

export function EntityStatusBadge({ status, className }: EntityStatusBadgeProps) {
  const { t } = useTranslation('common')
  const active = status === 'active'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        active
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
          : 'bg-muted text-muted-foreground',
        className
      )}
    >
      {active ? t('active') : t('inactive')}
    </span>
  )
}
