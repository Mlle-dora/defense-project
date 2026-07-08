import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLogo } from '@/components/shared/AppLogo'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

export function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const { updatePassword } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = form.get('password') as string
    const confirm = form.get('confirm') as string
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      toast({ title: t('passwordUpdated') })
      navigate('/login')
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
        <CardTitle>{t('resetPasswordTitle')}</CardTitle>
        <CardDescription>{t('resetPasswordSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('newPassword')}</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t('confirmPassword')}</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {t('resetPassword')}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  )
}
