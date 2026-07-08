import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export function ProfileError() {
  const { t } = useTranslation('common')
  const { refreshProfile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Profile not found</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account is signed in but no profile record exists. Ask an administrator to
            create your profile, or contact support.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refreshProfile()}>
              Retry
            </Button>
            <Button variant="destructive" onClick={() => signOut()}>
              {t('logout')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
