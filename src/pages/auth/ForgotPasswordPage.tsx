import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLogo } from '@/components/shared/AppLogo'
import { useToast } from '@/hooks/use-toast'

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const { resetPassword } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      toast({ title: t('resetLinkSent') })
    } catch {
      toast({ title: t('common:error', { ns: 'common' }), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center lg:hidden">
        <AppLogo variant="auth" className="max-w-[200px]" />
      </div>
      <Card className="border-border/80 shadow-xl">
      <CardHeader>
        <CardTitle>{t('forgotPasswordTitle')}</CardTitle>
        <CardDescription>{t('forgotPasswordSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {t('sendResetLink')}
          </Button>
          <Link to="/login" className="block text-center text-sm text-primary hover:underline">
            {t('common:back', { ns: 'common' })}
          </Link>
        </form>
      </CardContent>
    </Card>
    </div>
  )
}
