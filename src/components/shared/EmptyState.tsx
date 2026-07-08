import { useTranslation } from 'react-i18next'
import { FileX, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
  icon?: LucideIcon
}

export function EmptyState({ title, description, action, icon: Icon = FileX }: EmptyStateProps) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="mb-3 h-9 w-9 text-muted-foreground" />
      <h3 className="text-base font-semibold">{title ?? t('noResults')}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
