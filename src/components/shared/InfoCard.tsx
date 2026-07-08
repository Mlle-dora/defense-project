import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'

interface InfoRow {
  label: string
  value?: string | number | null
}

interface InfoCardProps {
  title: string
  icon?: LucideIcon
  rows: InfoRow[]
  className?: string
}

export function InfoCard({ title, icon: Icon, rows, className }: InfoCardProps) {
  return (
    <Card className={cn('overflow-hidden shadow-sm', className)}>
      <CardHeader className="border-b bg-muted/30 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {Icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-sm font-medium">{row.value ?? '—'}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
