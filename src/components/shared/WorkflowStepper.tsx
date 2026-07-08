import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import type { DeclarationStatus } from '@/types'
import { cn } from '@/utils/cn'

const WORKFLOW_STEPS: DeclarationStatus[] = [
  'submitted',
  'received',
  'under_review',
  'registered',
  'certificate_ready',
]

const STATUS_ORDER: Record<string, number> = {
  draft: -1,
  submitted: 0,
  received: 1,
  under_review: 2,
  pending_documents: 2,
  registered: 3,
  certificate_ready: 4,
  rejected: -2,
  expired: -2,
}

interface WorkflowStepperProps {
  status: DeclarationStatus
  className?: string
}

export function WorkflowStepper({ status, className }: WorkflowStepperProps) {
  const { t } = useTranslation('declarations')
  const currentIndex = STATUS_ORDER[status] ?? -1
  const isTerminal = status === 'rejected' || status === 'expired'

  if (isTerminal) {
    return (
      <div className={cn('rounded-xl border bg-muted/40 px-4 py-3 text-sm', className)}>
        <span className="font-medium">{t(`statuses.${status}`)}</span>
        <span className="text-muted-foreground"> — {t('workflow.terminal', { defaultValue: 'This declaration cannot proceed further.' })}</span>
      </div>
    )
  }

  return (
    <ol className={cn('flex flex-wrap items-center gap-2', className)}>
      {WORKFLOW_STEPS.map((step, index) => {
        const done = currentIndex > index
        const active = currentIndex === index || (status === 'pending_documents' && step === 'under_review')
        const pending = currentIndex < index

        return (
          <li key={step} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                done && 'border-primary/30 bg-primary/10 text-primary',
                active && 'border-primary bg-primary text-primary-foreground shadow-sm',
                pending && 'border-border bg-background text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary-foreground text-primary',
                  pending && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {t(`statuses.${step}`)}
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div className={cn('hidden h-px w-6 sm:block', done ? 'bg-primary/40' : 'bg-border')} />
            )}
          </li>
        )
      })}
      {status === 'pending_documents' && (
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          {t('statuses.pending_documents')}
        </span>
      )}
    </ol>
  )
}
