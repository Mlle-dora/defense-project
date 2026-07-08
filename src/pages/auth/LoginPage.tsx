import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { loginSchema } from '@/features/declarations/validators/declaration.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLogo } from '@/components/shared/AppLogo'
import { useToast } from '@/hooks/use-toast'
import { getRoleDashboardPath } from '@/utils/declaration'
import { z } from 'zod'

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common'])
  const { signIn } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const p = await signIn(data.email, data.password)
      toast({ title: t('loginSuccess') })
      if (p?.role) {
        navigate(getRoleDashboardPath(p.role), { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch {
      toast({ title: t('invalidCredentials'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center lg:hidden">
        <AppLogo variant="auth" className="max-w-[220px]" />
      </div>
      <Card className="border-border/80 shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{t('loginTitle')}</CardTitle>
        <CardDescription>{t('loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? t('common:loading') : t('login')}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  )
}
