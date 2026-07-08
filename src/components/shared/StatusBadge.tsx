import { useTranslation } from 'react-i18next'
import type { DeclarationStatus } from '@/types'
import { getStatusColor } from '@/utils/declaration'
import { cn } from '@/utils/cn'

interface StatusBadgeProps {
  status: DeclarationStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation('declarations')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        getStatusColor(status),
        className
      )}
    >
      {t(`statuses.${status}`)}
    </span>
  )
}
