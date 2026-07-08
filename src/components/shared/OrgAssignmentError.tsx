import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface OrgAssignmentErrorProps {
  title: string
  description: string
}

export function OrgAssignmentError({ title, description }: OrgAssignmentErrorProps) {
  return (
    <div className="page-shell flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-md w-full border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}
