import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/utils/cn'

interface BrandedWelcomeBannerProps {
  title: string
  description?: string
  meta?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function BrandedWelcomeBanner({
  title,
  description,
  meta,
  action,
  className,
}: BrandedWelcomeBannerProps) {
  return (
    <Card className={cn('border-primary/15 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent shadow-sm', className)}>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
          {meta && <div className="mt-2 text-xs text-muted-foreground">{meta}</div>}
        </div>
        {action && <div className="flex shrink-0">{action}</div>}
      </CardContent>
    </Card>
  )
}
